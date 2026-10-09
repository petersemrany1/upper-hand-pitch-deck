import { APP_TIMEZONE } from "./timezone";

export type CalendarHistoryData = Record<string, string | number | boolean | string[] | number[] | null>;
export type CalendarHistoryEntry = {
  id: string;
  entity_type: "block" | "hours" | "weekly_hours" | "settings" | "appointment";
  entity_id: string;
  operation: "added" | "changed" | "removed" | "baseline";
  recorded_at: string;
  actor_name: string;
  actor_role: string;
  before_data: CalendarHistoryData | null;
  after_data: CalendarHistoryData | null;
};
export type CalendarHistoryPage = { started_at: string; entries: CalendarHistoryEntry[] };
export type CalendarHistoryLoader = (options: { before?: string; date?: string }) => Promise<CalendarHistoryPage>;
export const HISTORY_PAGE_SIZE = 50;
export const historyTimestamp = (value: string) => new Date(value).toLocaleString("en-AU", {
  timeZone: APP_TIMEZONE, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
});
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dateLabel = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "No start date";
const timeLabel = (value: unknown) => {
  if (typeof value !== "string") return "Not set";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour >= 12 ? "pm" : "am"}`;
};
const range = (start: unknown, end: unknown) => `${timeLabel(start)}–${timeLabel(end)}`;

export function historyTitle(entry: CalendarHistoryEntry) {
  const entity = { block: "Blocked time", hours: "Date-specific hours", weekly_hours: "Weekly hours", settings: "Calendar settings", appointment: "Appointment" }[entry.entity_type];
  if (entry.operation === "baseline") return `${entity} · present when history started`;
  if (entry.entity_type === "appointment") {
    if (entry.operation === "added") return "Appointment added to calendar";
    if (entry.operation === "removed") return "Appointment removed";
    if (entry.before_data?.calendar_status !== entry.after_data?.calendar_status) return entry.after_data?.calendar_status === "disqualified" ? "Appointment disqualified · removed from calendar" : "Appointment restored to calendar";
    if (entry.before_data?.appointment_date !== entry.after_data?.appointment_date || entry.before_data?.appointment_time !== entry.after_data?.appointment_time) return "Appointment rescheduled";
  }
  return `${entity} ${entry.operation}`;
}
export function historyDetails(kind: CalendarHistoryEntry["entity_type"], data: CalendarHistoryData) {
  switch (kind) {
    case "appointment": return [String(data.patient_name || "Appointment"), `${dateLabel(data.appointment_date)} · ${timeLabel(data.appointment_time)} · ${data.consultation_duration_minutes} minutes`, data.calendar_status === "disqualified" ? "Disqualified · not on calendar" : "On calendar"];
    case "hours": return [`${dateLabel(data.override_date)} · ${data.override_type === "open" ? range(data.start_time, data.end_time) : "Closed"}`];
    case "weekly_hours": return [`Every ${days[Number(data.day_of_week)]} · ${data.is_closed ? "Closed" : range(data.open_time, data.close_time)}`, `Appointment start interval: ${data.consult_duration_mins} minutes`];
    case "settings": return [`Consultation: ${data.consultation_duration_minutes} minutes · Buffer: ${data.buffer_minutes} minutes`, `Clinic state: ${data.state || "Not set"}`];
    case "block": {
      const detail = [`${dateLabel(data.slot_date)} · ${range(data.slot_start, data.slot_end)}`];
      if (data.is_recurring) {
        const pattern = data.recur_pattern || "weekly";
        const weekdays = Array.isArray(data.recur_days_of_week) && data.recur_days_of_week.length ? data.recur_days_of_week : [data.recur_day_of_week];
        const repeat = pattern === "daily" ? "Every day" : pattern === "monthly_date" ? `Day ${data.recur_day_of_month} of each month` : pattern === "monthly_nth_dow" ? `${["", "First", "Second", "Third", "Fourth", "Last"][Number(data.recur_nth_week)]} ${days[Number(data.recur_day_of_week)]} of each month` : `Every ${weekdays.map(day => days[Number(day)]).join(", ")}`;
        detail.push(`${repeat} · ${data.recur_until ? `until ${dateLabel(data.recur_until)}` : "no end date"}`);
        if (Array.isArray(data.excluded_dates) && data.excluded_dates.length) detail.push(`Except: ${data.excluded_dates.map(dateLabel).join("; ")}`);
      }
      return detail;
    }
  }
}
