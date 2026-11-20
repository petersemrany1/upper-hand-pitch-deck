/** Patient texts use clinic time; the team's call alerts use Sydney time. */
export type ReminderMode = "off" | "reminders" | "confirmation";
export type ReminderAction = "3day" | "24h" | "request" | "followup" | "call_email";
// Historical delivery records may include a retired acknowledgement.
export type DeliveryKind = ReminderAction | "ack";
export type ConfirmationState = "not_requested" | "awaiting_reply" | "confirmed" | "needs_call";
export type ReminderSettings = {
  clinic_id: string;
  mode: ReminderMode;
  timezone: string;
  normal_send_time: string;
  alert_email: string;
  call_days: number[];
  closed_dates: string[];
  updated_at: string;
};
export type ConfirmationFields = {
  confirmation_revision: string;
  confirmation_state: ConfirmationState;
  confirmation_requested_at: string | null;
  confirmation_followup_at: string | null;
  confirmation_email_at: string | null;
  confirmation_ack_at: string | null;
  confirmation_confirmed_at: string | null;
  confirmation_method: "sms" | "phone" | null;
  confirmation_reason: string | null;
  confirmation_last_reply: string | null;
  confirmation_last_reply_at: string | null;
  confirmation_call_result: string | null;
  confirmation_last_call_at: string | null;
};
export type WorkflowBooking = ConfirmationFields & {
  id: string;
  booking_date: string | null;
  booking_time: string | null;
  status: string;
  schedule_changed_at: string | null;
  created_at?: string;
  three_day_sms_sent: boolean;
  twentyfour_hour_sms_sent: boolean;
  three_day_sms_claim?: string | null;
  twentyfour_hour_sms_claim?: string | null;
};
export const REMINDER_MODE_LABELS: Record<ReminderMode, string> = {
  off: "Off",
  reminders: "Text reminders",
  confirmation: "YES confirmation reminders",
};
export const CLINIC_TIMEZONES = ["Australia/Perth", "Australia/Melbourne", "Australia/Sydney", "Australia/Brisbane", "Australia/Adelaide", "Australia/Darwin", "Australia/Hobart"];

export function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minute: Number(part("hour")) * 60 + Number(part("minute")) };
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
export function clinicDaysUntil(date: string, now: Date, timezone: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${localClock(now, timezone).date}T12:00:00Z`)) / 86400000);
}
export function isCallDay(date: string, settings: ReminderSettings): boolean {
  return settings.call_days.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) && !settings.closed_dates.includes(date);
}
export function confirmationDay(bookingDate: string, settings: ReminderSettings): string {
  let date = shiftDate(bookingDate, -1);
  for (let i = 0; i < 366; i++, date = shiftDate(date, -1)) {
    if (isCallDay(date, settings)) return date;
  }
  throw new Error("Choose at least one staffed day for confirmation calls");
}
const elapsed = (now: Date, timestamp: string | null) => timestamp ? (now.getTime() - Date.parse(timestamp)) / 60000 : Infinity;

export function confirmationAlertRecipients(value: string): string[] {
  const recipients = value.split(",").map(email => email.trim().toLowerCase());
  if (!recipients.length || recipients.some(email => !/^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(email))) {
    throw new Error("Enter valid call-alert email addresses separated by commas");
  }
  return [...new Set(recipients)];
}

/** Leave at least 30 minutes after text two, and never email after the team's shift. */
export function confirmationCallAlertDue(row: ConfirmationFields, settings: ReminderSettings, now: Date): boolean {
  const sydney = localClock(now, "Australia/Sydney");
  return settings.mode === "confirmation" && isCallDay(sydney.date, settings)
    && sydney.minute >= 16 * 60 + 30 && sydney.minute < 17 * 60
    && (row.confirmation_state === "awaiting_reply" || (row.confirmation_state === "needs_call" && row.confirmation_reason === "no_reply"))
    && Boolean(row.confirmation_requested_at && row.confirmation_followup_at)
    && elapsed(now, row.confirmation_followup_at) >= 30
    && !row.confirmation_email_at && !row.confirmation_last_reply_at && !row.confirmation_last_call_at;
}

/** One action per booking per tick: an outage or a late booking cannot cause a burst of texts. */
export function nextReminderAction(row: WorkflowBooking, settings: ReminderSettings, now: Date): ReminderAction | null {
  if (settings.mode === "off" || row.status !== "confirmed" || !row.booking_date || !row.booking_time) return null;
  const local = localClock(now, settings.timezone);
  if (local.date > row.booking_date || (local.date === row.booking_date && local.minute >= minutes(row.booking_time))) return null;
  const threeDay = shiftDate(row.booking_date, -3);
  const dayBefore = shiftDate(row.booking_date, -1);
  const recentlyChanged = elapsed(now, row.schedule_changed_at || row.created_at || null) < 10;
  if (settings.mode === "reminders") {
    if (recentlyChanged || local.minute < minutes(settings.normal_send_time) || local.minute >= 19 * 60) return null;
    if (local.date === threeDay && !row.three_day_sms_sent && !row.three_day_sms_claim) return "3day";
    if (local.date === dayBefore && !row.twentyfour_hour_sms_sent && !row.twentyfour_hour_sms_claim) return "24h";
    return null;
  }
  const requestDay = confirmationDay(row.booking_date, settings);
  if (confirmationCallAlertDue(row, settings, now)) return "call_email";
  if (!["confirmed", "needs_call"].includes(row.confirmation_state) && local.date >= requestDay) {
    // Short-notice bookings are handled in Confirmation calls, not the unanswered-second-text alert.
    if (local.date === requestDay && local.minute >= 9 * 60 && local.minute <= 15 * 60) {
      if (!row.confirmation_requested_at && local.minute >= 15 * 60) return null;
      if (!row.confirmation_requested_at && !recentlyChanged) return "request";
      if (row.confirmation_requested_at) {
        if (!row.confirmation_followup_at && local.minute >= 13 * 60 && local.minute <= 15 * 60 && elapsed(now, row.confirmation_requested_at) >= 120) return "followup";
      }
    }
  }
  if (recentlyChanged || local.minute >= 19 * 60) return null;
  if (local.date === threeDay && local.date !== requestDay && local.minute >= minutes(settings.normal_send_time) && !row.three_day_sms_sent && !row.three_day_sms_claim) return "3day";
  // Monday: confirmation on Friday, ordinary reminder on Sunday. Never ask twice after YES.
  if (requestDay < dayBefore && local.date === dayBefore && local.minute >= 9 * 60 && !row.twentyfour_hour_sms_sent && !row.twentyfour_hour_sms_claim) return "24h";
  return null;
}

export function confirmationLabel(row: ConfirmationFields): string {
  if (row.confirmation_state === "confirmed") return row.confirmation_method === "phone" ? "Confirmed by phone" : "Confirmed by SMS";
  if (row.confirmation_state === "awaiting_reply") return row.confirmation_followup_at ? "Second request sent · awaiting YES" : "Awaiting YES";
  if (row.confirmation_state === "needs_call") {
    if (row.confirmation_reason === "patient_reply") return "Reply needs attention";
    if (row.confirmation_reason === "delivery_failed") return "SMS failed · needs a call";
    if (row.confirmation_reason === "opt_out") return "SMS opted out · needs a call";
    return "Needs a confirmation call";
  }
  return "Confirmation not requested yet";
}
