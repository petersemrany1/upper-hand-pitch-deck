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
  timeZone: APP_TIMEZONE, day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
}).replace(/\s([ap]m)\b/, "$1");
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dateLabel = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? value.split("-").reverse().map(Number).join("/") : "no start date";
const timeLabel = (value: unknown) => {
  if (typeof value !== "string") return "not set";
  const [hour, minute] = value.split(":").map(Number);
  if (hour === 24) return "end of day";
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour >= 12 ? "pm" : "am"}`;
};
const range = (start: unknown, end: unknown) => `${timeLabel(start)}–${timeLabel(end)}`;
const appointmentAt = (data: CalendarHistoryData) => `${timeLabel(data.appointment_time)} on ${dateLabel(data.appointment_date)}`;
const blockAt = (data: CalendarHistoryData) => {
  const times = range(data.slot_start, data.slot_end);
  if (!data.is_recurring) return `${times} on ${dateLabel(data.slot_date)}`;
  const weekdays = Array.isArray(data.recur_days_of_week) && data.recur_days_of_week.length ? data.recur_days_of_week : [data.recur_day_of_week];
  const pattern = data.recur_pattern || "weekly";
  const repeats = pattern === "daily" ? "every day" : pattern === "monthly_date" ? `on day ${data.recur_day_of_month} each month` : pattern === "monthly_nth_dow" ? `on the ${["", "first", "second", "third", "fourth", "last"][Number(data.recur_nth_week)]} ${days[Number(data.recur_day_of_week)]} each month` : `every ${weekdays.map(day => days[Number(day)]).join(", ")}`;
  return `${times} ${repeats}${data.slot_date ? ` from ${dateLabel(data.slot_date)}` : ""}${data.recur_until ? ` until ${dateLabel(data.recur_until)}` : ""}${Array.isArray(data.excluded_dates) && data.excluded_dates.length ? `, except ${data.excluded_dates.map(dateLabel).join(", ")}` : ""}`;
};
const hours = (data: CalendarHistoryData) => data.is_closed || ["blocked", "closed"].includes(String(data.override_type)) ? "closed" : data.open_time || data.start_time ? range(data.open_time || data.start_time, data.close_time || data.end_time) : "open";

/** Only actual changes are described as events; installation snapshots are not edits. */
export function historySummary(entry: CalendarHistoryEntry): string | null {
  if (entry.operation === "baseline") return null;
  const before = entry.before_data, after = entry.after_data, data = after || before;
  if (!data) return null;
  switch (entry.entity_type) {
    case "appointment": {
      const patient = data.patient_name ? ` · ${data.patient_name}` : "";
      if (entry.operation === "removed") return `Appointment removed: ${appointmentAt(data)}${patient}`;
      if (!before) return `Appointment set: ${appointmentAt(data)}${patient}`;
      const changes: string[] = [];
      if (after && (before.appointment_date !== after.appointment_date || before.appointment_time !== after.appointment_time)) {
        const from = before.appointment_date === after.appointment_date ? timeLabel(before.appointment_time) : appointmentAt(before);
        changes.push(`Rescheduled from ${from} to ${appointmentAt(after)}`);
      }
      if (after && before.calendar_status !== after.calendar_status) changes.push(`${after.calendar_status === "disqualified" ? "Appointment disqualified" : "Appointment restored"}: ${appointmentAt(after)}`);
      if (after && before.consultation_duration_minutes !== after.consultation_duration_minutes) changes.push(`Appointment length changed from ${before.consultation_duration_minutes} to ${after.consultation_duration_minutes} minutes${changes.length ? "" : `: ${appointmentAt(after)}`}`);
      if (!changes.length) changes.push(`Appointment updated: ${appointmentAt(data)}`);
      return changes.join("; ") + patient;
    }
    case "block": {
      if (!after) return `Unblocked time: ${blockAt(data)}`;
      if (!before) return `Blocked time: ${blockAt(data)}`;
      return `Blocked time changed from ${blockAt(before)} to ${blockAt(after)}`;
    }
    case "hours": {
      const day = dateLabel(data.override_date);
      if (!after) return `Custom hours removed for ${day}`;
      return before ? `Working hours changed from ${hours(before)} to ${hours(after)} on ${day}` : `Working hours set: ${hours(after)} on ${day}`;
    }
    case "weekly_hours": {
      const day = days[Number(data.day_of_week)];
      if (!after) return `${day} hours removed`;
      const label = before ? `${day} hours changed from ${hours(before)} to ${hours(after)}` : `${day} hours set: ${hours(after)}`;
      return before && before.consult_duration_mins !== after.consult_duration_mins ? `${label}; start interval changed from ${before.consult_duration_mins} to ${after.consult_duration_mins} minutes` : label;
    }
    case "settings": {
      const changes: string[] = [];
      for (const [key, label] of [["consultation_duration_minutes", "Consultation length"], ["buffer_minutes", "Buffer"]]) {
        if (!before || before[key] !== after?.[key]) changes.push(before && after ? `${label} changed from ${before[key]} to ${after[key]} minutes` : `${label}: ${data[key]} minutes`);
      }
      if (before && after && before.state !== after.state) changes.push(`Clinic state changed from ${before.state || "not set"} to ${after.state || "not set"}`);
      return changes.join("; ") || "Calendar settings updated";
    }
  }
}
