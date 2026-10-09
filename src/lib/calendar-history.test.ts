import { expect, test } from "bun:test";
import { historyDetails, historyTimestamp, historyTitle, type CalendarHistoryEntry } from "./calendar-history";
const entry: CalendarHistoryEntry = { id: "1", entity_id: "block", entity_type: "block", operation: "baseline", recorded_at: "2026-10-10T00:00:00Z", actor_name: "History started", actor_role: "system", before_data: null, after_data: { slot_date: "2026-10-30", slot_start: "11:30:00", slot_end: "12:00:00", is_recurring: false } };
test("baseline wording never presents old calendar state as an original creation time", () => {
  expect(historyTitle(entry)).toBe("Blocked time · present when history started");
  expect(historyDetails("block", entry.after_data!)).toEqual(["Fri, 30 Oct 2026 · 11:30am–12:00pm"]);
});
test("timestamps always use Sydney time with seconds and a timezone label", () => {
  const label = historyTimestamp("2026-10-10T00:00:01Z");
  expect(label).toContain("11:00:01 am");
  expect(label).toMatch(/AEDT|GMT\+11/);
});
test("recurrence details preserve removed occurrences, range and end date", () => {
  expect(historyDetails("block", { ...entry.after_data, is_recurring: true, recur_pattern: "weekly", recur_days_of_week: [0, 4], recur_until: "2026-11-30", excluded_dates: ["2026-11-06"] }).join(" ")).toContain("Every Monday, Friday · until Mon, 30 Nov 2026 Except: Fri, 6 Nov 2026");
});
test("rescheduling and disqualification have distinct titles", () => {
  const appointment = { ...entry, entity_type: "appointment" as const, operation: "changed" as const, before_data: { appointment_date: "2026-10-30", appointment_time: "11:30", calendar_status: "active" }, after_data: { appointment_date: "2026-10-30", appointment_time: "12:00", calendar_status: "active" } };
  expect(historyTitle(appointment)).toBe("Appointment rescheduled");
  expect(historyTitle({ ...appointment, after_data: { ...appointment.after_data, calendar_status: "disqualified" } })).toContain("disqualified · removed from calendar");
});
