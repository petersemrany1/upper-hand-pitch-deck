import { expect, test } from "bun:test";
import { historySummary, historyTimestamp, type CalendarHistoryEntry } from "./calendar-history";
const entry: CalendarHistoryEntry = { id: "1", entity_id: "block", entity_type: "block", operation: "added", recorded_at: "2026-10-10T00:00:00Z", actor_name: "Admin", actor_role: "admin", before_data: null, after_data: { slot_date: "2026-01-01", slot_start: "10:00:00", slot_end: "14:00:00", is_recurring: false } };
test("blocks use a single plain description", () => {
  expect(historySummary(entry)).toBe("Blocked time: 10am–2pm on 1/1/2026");
});
test("starting snapshots are never labelled as new changes", () => {
  expect(historySummary({ ...entry, operation: "baseline" })).toBeNull();
});
test("appointment set and reschedule describe the affected date separately from the timestamp", () => {
  const appointment = { ...entry, entity_type: "appointment" as const, after_data: { appointment_date: "2026-01-01", appointment_time: "10:00", calendar_status: "active" } };
  expect(historySummary(appointment)).toBe("Appointment set: 10am on 1/1/2026");
  expect(historySummary({ ...appointment, operation: "changed", before_data: appointment.after_data, after_data: { ...appointment.after_data, appointment_time: "12:00" } })).toBe("Rescheduled from 10am to 12pm on 1/1/2026");
  expect(historySummary({ ...appointment, operation: "changed", before_data: appointment.after_data, after_data: { ...appointment.after_data, appointment_date: "2026-01-02", appointment_time: "12:00" } })).toBe("Rescheduled from 10am on 1/1/2026 to 12pm on 2/1/2026");
});
test("timestamps retain Sydney time and seconds", () => {
  const label = historyTimestamp("2026-10-10T00:00:01Z");
  expect(label).toContain("10/10/2026"); expect(label).toContain("11:00:01am"); expect(label).toMatch(/AEDT|GMT\+11/);
});
test("recurring blocks retain exceptions and end dates", () => {
  expect(historySummary({ ...entry, after_data: { ...entry.after_data, is_recurring: true, recur_pattern: "weekly", recur_days_of_week: [0,4], recur_until: "2026-11-30", excluded_dates: ["2026-11-06"] } })).toBe("Blocked time: 10am–2pm every Monday, Friday from 1/1/2026 until 30/11/2026, except 6/11/2026");
});
test("settings report only the field that changed", () => {
  expect(historySummary({ ...entry, entity_type: "settings", operation: "changed", before_data: { consultation_duration_minutes: 90, buffer_minutes: 30, state: "WA" }, after_data: { consultation_duration_minutes: 90, buffer_minutes: 15, state: "WA" } })).toBe("Buffer changed from 30 to 15 minutes");
});
