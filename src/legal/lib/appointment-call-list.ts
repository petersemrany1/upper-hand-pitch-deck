// Ported from the Legal app (family-law-floater/src/lib/appointment-call-list.ts). Re-run the port script to refresh.
import {
  defaultReminderSettings,
  localDate,
  localInstant,
  planReminders,
  previousStaffedDay,
  shiftDate,
} from "./appointment-reminders";
import type { Attendance, ReminderJob, ReminderSettings } from "./appointment-reminders";

export type CallListAppointment = {
  appointment_date: string | null;
  appointment_time: string | null;
  status: string;
  outcome: string | null;
  firm_id: string | null;
  created_at: string;
};
export type AppointmentCallTask = {
  timing: "now" | "later";
  dueAt: string;
  reason: string;
  appointmentAt: number;
};

export function appointmentTimestamp(a: CallListAppointment, timezone: string): number | null {
  if (!a.appointment_date || !a.appointment_time) return null;
  try {
    return localInstant(a.appointment_date, a.appointment_time, timezone).getTime();
  } catch {
    return null;
  }
}

export function consultationDay(date: string, now: Date, timezone: string): string {
  const today = localDate(now, timezone);
  const relative = date === today ? "Today" : date === shiftDate(today, 1) ? "Tomorrow" : null;
  const full = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return relative ? `${relative} · ${full}` : full;
}

/** A read-only work list. Opening it never schedules or sends a message. */
export function appointmentCallTask(input: {
  appointment: CallListAppointment;
  attendance?: Attendance | undefined;
  settings?: ReminderSettings | undefined;
  jobs: ReminderJob[];
  now: Date;
}): AppointmentCallTask | null {
  const { appointment: a, attendance: s, jobs, now } = input;
  const cfg = input.settings ?? defaultReminderSettings(a.firm_id ?? "");
  const start = appointmentTimestamp(a, cfg.timezone);
  if (
    a.status !== "booked" ||
    a.outcome ||
    start === null ||
    start <= now.getTime() ||
    s?.status === "confirmed"
  )
    return null;
  const current = jobs.filter((j) => j.booking_version === s?.booking_version);
  let due = now.getTime();
  let reason: string;
  if (s?.status === "review") {
    reason = "Their reply needs a person — check it before calling.";
  } else if (s?.status === "needs_call") {
    reason =
      s.call_outcome === "voicemail"
        ? "Voicemail left — still waiting for confirmation."
        : s.call_outcome === "no_answer"
          ? "No answer last time — try them again."
          : s.reason || "They have not confirmed they’re coming.";
  } else {
    if (cfg.mode === "off") return null;
    const failed = current.some(
      (j) => j.kind !== "call" && j.kind !== "ack" && ["failed", "uncertain"].includes(j.state),
    );
    if (failed) {
      reason = "Reminder delivery needs checking — confirm by phone.";
    } else if (cfg.mode === "texts") {
      // Ordinary texts do not ask for YES, so staff still need a manual confirmation list.
      due = localInstant(
        previousStaffedDay(a.appointment_date!, cfg),
        "09:00",
        cfg.timezone,
      ).getTime();
      reason = "Confirm they’re coming — their reminder texts do not ask for a reply.";
    } else {
      const call = current.find((j) => j.kind === "call" && j.state !== "cancelled");
      const planned =
        call ??
        planReminders({
          date: a.appointment_date!,
          time: a.appointment_time!,
          changedAt: s?.booking_changed_at ?? a.created_at,
          settings: cfg,
        }).find((j) => j.kind === "call");
      if (!planned) return null;
      due = Date.parse(planned.due_at);
      if (s?.status === "awaiting") {
        const followup = current.find((j) => j.kind === "followup" && j.state === "pending");
        if (followup) due = Math.max(due, Date.parse(followup.due_at) + 2 * 3600000);
        for (const j of current.filter(
          (j) => j.kind !== "call" && ["sent", "sending", "uncertain"].includes(j.state),
        )) {
          const at = j.sent_at ?? j.claimed_at;
          if (at) due = Math.max(due, Date.parse(at) + 2 * 3600000);
        }
      }
      reason =
        due > now.getTime()
          ? "Only call if they still haven’t confirmed by this time."
          : "No confirmation received — check they’re coming.";
    }
  }
  if (
    !Number.isFinite(due) ||
    due >= start ||
    localDate(new Date(due), cfg.timezone) > localDate(now, cfg.timezone)
  )
    return null;
  return {
    timing: due <= now.getTime() ? "now" : "later",
    dueAt: new Date(due).toISOString(),
    reason,
    appointmentAt: start,
  };
}
