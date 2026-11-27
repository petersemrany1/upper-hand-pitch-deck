// Ported from the Legal app (family-law-floater/src/lib/appointment-reminders.ts). Re-run the port script to refresh.
/** Shared, side-effect-free appointment reminder rules. All times are firm-local. */
export type ReminderMode = "off" | "texts" | "confirmation";
export type AttendanceStatus = "unrequested" | "awaiting" | "confirmed" | "needs_call" | "review";
export type ReminderKind = "3d" | "1d" | "request" | "followup" | "call" | "ack";
export type ReminderSettings = {
  firm_id: string;
  mode: ReminderMode;
  timezone: string;
  reminder_time: string;
  alert_email: string;
  staffed_days: number[];
  closure_dates: string[];
  confirmation_enabled_at: string | null;
  updated_at?: string;
};
export type Attendance = {
  appointment_id: string;
  booking_version: string;
  booking_changed_at: string;
  status: AttendanceStatus;
  confirmed_at: string | null;
  latest_reply: string | null;
  latest_reply_at: string | null;
  call_outcome: string | null;
  called_at: string | null;
  reason: string | null;
};
export type ReminderJob = {
  id: string;
  appointment_id: string;
  booking_version: string;
  kind: ReminderKind;
  due_at: string;
  state: "pending" | "sending" | "sent" | "failed" | "uncertain" | "cancelled";
  claimed_at: string | null;
  sent_at: string | null;
  twilio_sid: string | null;
  from_phone: string | null;
  to_phone: string | null;
  delivery_status: string | null;
  last_error: string | null;
};

export function defaultReminderSettings(firmId: string): ReminderSettings {
  return {
    firm_id: firmId,
    mode: "texts",
    timezone: "Australia/Sydney",
    reminder_time: "15:00",
    alert_email: "peter@gobold.com.au",
    staffed_days: [1, 2, 3, 4, 5],
    closure_dates: [],
    confirmation_enabled_at: null,
  };
}

export function localDate(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Converts a wall-clock appointment time without depending on the server timezone. */
export function localInstant(date: string, time: string, timezone: string): Date {
  const m = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/i.exec(time.trim());
  if (!m) throw new Error("Invalid appointment time");
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0),
    suffix = m[3]?.toLowerCase();
  if (minute > 59 || hour > 23 || (suffix && (hour < 1 || hour > 12)))
    throw new Error("Invalid appointment time");
  if (suffix) hour = (hour % 12) + (suffix === "pm" ? 12 : 0);
  const wall = Date.parse(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
  if (!Number.isFinite(wall)) throw new Error("Invalid appointment date");
  let result = wall;
  for (let i = 0; i < 3; i++) {
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date(result))
      .find((p) => p.type === "timeZoneName")!.value;
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
    const minutes = match
      ? (Number(match[2]) * 60 + Number(match[3] ?? 0)) * (match[1] === "-" ? -1 : 1)
      : 0;
    result = wall - minutes * 60000;
  }
  return new Date(result);
}

export function staffed(date: string, settings: ReminderSettings): boolean {
  return (
    settings.staffed_days.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
    !settings.closure_dates.includes(date)
  );
}

export function previousStaffedDay(date: string, settings: ReminderSettings): string {
  for (let i = 1; i <= 370; i++) {
    const candidate = shiftDate(date, -i);
    if (staffed(candidate, settings)) return candidate;
  }
  throw new Error("No staffed day is available in the reminder calendar");
}

/** Move a late contact into a staffed 9am–5pm window, or return null. */
export function contactWindow(
  at: number,
  start: number,
  settings: ReminderSettings,
): number | null {
  let date = localDate(new Date(at), settings.timezone);
  for (let i = 0; i < 370; i++, date = shiftDate(date, 1)) {
    const open = localInstant(date, "09:00", settings.timezone).getTime();
    if (open >= start) return null;
    const close = localInstant(date, "17:00", settings.timezone).getTime();
    const candidate = Math.max(at, open);
    if (staffed(date, settings) && candidate < close && candidate < start) return candidate;
  }
  return null;
}

export type PlannedReminder = { kind: Exclude<ReminderKind, "ack">; due_at: string };
export function planReminders(input: {
  date: string;
  time: string;
  changedAt: string;
  settings: ReminderSettings;
}): PlannedReminder[] {
  const { date, time, changedAt, settings } = input;
  if (settings.mode === "off") return [];
  const start = localInstant(date, time, settings.timezone).getTime();
  const changed = Date.parse(changedAt) + 10 * 60000;
  const result: PlannedReminder[] = [];
  const add = (kind: PlannedReminder["kind"], at: number) => {
    if (at < start) result.push({ kind, due_at: new Date(at).toISOString() });
  };
  const day3 = shiftDate(date, -3),
    day1 = shiftDate(date, -1);
  const confirmationDay =
    settings.mode === "confirmation" ? previousStaffedDay(date, settings) : null;
  for (const [kind, day] of [
    ["3d", day3],
    ["1d", day1],
  ] as const) {
    // The confirmation request already contains the appointment details.
    if (day === confirmationDay) continue;
    const at = localInstant(day, settings.reminder_time, settings.timezone).getTime();
    if (at >= changed) add(kind, at);
  }
  if (!confirmationDay) return result;
  const enabled = settings.confirmation_enabled_at
    ? Date.parse(settings.confirmation_enabled_at) + 10 * 60000
    : changed;
  const earliest = Math.max(changed, enabled);
  const request = contactWindow(
    Math.max(earliest, localInstant(confirmationDay, "09:00", settings.timezone).getTime()),
    start,
    settings,
  );
  const followup =
    request === null
      ? null
      : contactWindow(
          Math.max(
            request + 2 * 3600000,
            localInstant(confirmationDay, "13:00", settings.timezone).getTime(),
          ),
          start,
          settings,
        );
  const call =
    followup === null
      ? null
      : contactWindow(
          Math.max(
            followup + 2 * 3600000,
            localInstant(confirmationDay, "15:00", settings.timezone).getTime(),
          ),
          start,
          settings,
        );
  if (request === null || followup === null || call === null) {
    // Too little time for the full sequence: give staff a call task, without a burst of texts.
    add(
      "call",
      Math.max(
        earliest,
        Math.min(localInstant(confirmationDay, "09:00", settings.timezone).getTime(), start - 1),
      ),
    );
  } else {
    add("request", request);
    add("followup", followup);
    add("call", call);
  }
  return result.sort((a, b) => a.due_at.localeCompare(b.due_at));
}

export function reminderText(
  kind: Exclude<ReminderKind, "call">,
  input: {
    firstName: string;
    firmName: string;
    lawyerName?: string | null;
    date: string;
    time: string;
    timezone: string;
    address?: string | null;
    officeName?: string | null;
    parking?: string | null;
    directions?: string | null;
    phone?: string | null;
    zoom?: boolean;
  },
): string {
  const date = new Date(`${input.date}T12:00:00Z`).toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const zone = new Intl.DateTimeFormat("en-AU", { timeZone: input.timezone, timeZoneName: "short" })
    .formatToParts(localInstant(input.date, input.time, input.timezone))
    .find((p) => p.type === "timeZoneName")!.value;
  return [
    `Hi ${input.firstName}, ${kind === "ack" ? "thank you for confirming" : kind === "followup" ? "we haven’t received confirmation for" : "a reminder about"} your consultation with ${input.firmName}${input.lawyerName ? ` (${input.lawyerName})` : ""} on ${date} at ${input.time} ${zone}.`,
    !input.zoom && input.officeName ? `Office: ${input.officeName}.` : "",
    input.zoom
      ? "This is a Zoom consultation; the firm will send your link."
      : input.address
        ? `Address: ${input.address}.`
        : "",
    !input.zoom && input.parking ? `Parking: ${input.parking}.` : "",
    !input.zoom && input.directions ? `Getting here: ${input.directions}.` : "",
    input.phone ? `Firm phone: ${input.phone}.` : "",
    kind === "request" || kind === "followup"
      ? "Please reply YES to confirm you’ll attend, or CHANGE if you need another time."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  unrequested: "Confirmation not requested",
  awaiting: "Awaiting YES",
  confirmed: "Attendance confirmed",
  needs_call: "Needs a call",
  review: "Reply needs review",
};
