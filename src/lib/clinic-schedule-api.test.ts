import { expect, test } from "bun:test";
import { calendarPreviewFixture } from "./calendar-preview-fixture";
import { addPreviewAppointment, getPreviewSchedule, reschedulePreviewAppointment, savePreviewSchedule, seedPreviewSchedule, subscribePreviewSchedules } from "./clinic-schedule-api";
import { futureScheduleSlots } from "./clinic-schedule";

function fixture() {
  const s = calendarPreviewFixture(); s.clinic_id = crypto.randomUUID();
  s.blocks = []; s.overrides = []; s.appointments = [];
  s.trading.forEach(t => { t.is_closed = false; });
  return seedPreviewSchedule(s);
}
test("both preview portals receive saved availability and stale edits cannot overwrite it", async () => {
  const s = fixture(); let updates = 0;
  const unsubscribe = subscribePreviewSchedules(() => updates++);
  const outcomes = await Promise.allSettled([
    savePreviewSchedule(s.clinic_id, s.version, { action: "block", dates: ["2099-10-12"], start: "10:30", end: "12:00" }),
    savePreviewSchedule(s.clinic_id, s.version, { action: "settings", consultation_minutes: 30, buffer_minutes: 0 }),
  ]);
  unsubscribe();
  expect(outcomes.map(o => o.status)).toEqual(["fulfilled", "rejected"]);
  expect(updates).toBe(1); expect(getPreviewSchedule(s.clinic_id)?.blocks).toHaveLength(1);
});
test("a dragged block publishes one complete update to both preview portals", async () => {
  const s = fixture();
  const original = await savePreviewSchedule(s.clinic_id, s.version, { action: "block", dates: ["2099-10-12"], start: "10:30", end: "12:00" });
  let updates = 0;
  const unsubscribe = subscribePreviewSchedules(() => {
    updates++;
    const current = getPreviewSchedule(s.clinic_id)!;
    expect(current.blocks).toHaveLength(1);
    expect(futureScheduleSlots(current, "2099-10-12").some(slot => slot.time === "10:30")).toBe(true);
    expect(futureScheduleSlots(current, "2099-10-13").some(slot => slot.time === "10:30")).toBe(false);
  });
  const saved = await savePreviewSchedule(s.clinic_id, original.version, { action: "block", id: original.blocks[0].id, source_date: "2099-10-12", scope: "date", dates: ["2099-10-13"], start: "10:30", end: "12:00" });
  unsubscribe();
  expect(updates).toBe(1);
  await expect(savePreviewSchedule(s.clinic_id, original.version, { action: "block", id: original.blocks[0].id, dates: ["2099-10-14"], start: "10:30", end: "12:00" })).rejects.toThrow("calendar changed");
  expect(getPreviewSchedule(s.clinic_id)).toBe(saved);
});
test("preview bookings reserve slots and a rejected booking leaves the calendar unchanged", () => {
  const s = fixture(); addPreviewAppointment(s.clinic_id, "2099-10-12", "09:00");
  const saved = getPreviewSchedule(s.clinic_id)!;
  expect(saved.appointments[0].consultation_duration_minutes).toBe(90);
  expect(() => addPreviewAppointment(s.clinic_id, "2099-10-12", "10:30")).toThrow("no longer available");
  expect(getPreviewSchedule(s.clinic_id)).toBe(saved);
});
test("preview rescheduling keeps the booked length and never touches another clinic", async () => {
  const s = fixture(), other = fixture(); addPreviewAppointment(s.clinic_id, "2099-10-12", "09:00");
  let saved = getPreviewSchedule(s.clinic_id)!; const id = saved.appointments[0].id;
  await savePreviewSchedule(s.clinic_id, saved.version, { action: "settings", consultation_minutes: 30, buffer_minutes: 0 });
  expect(() => reschedulePreviewAppointment(s.clinic_id, id, "2099-10-13", "14:00")).toThrow("no longer available");
  reschedulePreviewAppointment(s.clinic_id, id, "2099-10-13", "13:30");
  saved = getPreviewSchedule(s.clinic_id)!;
  expect(saved.appointments[0]).toMatchObject({ id, appointment_date: "2099-10-13", appointment_time: "13:30", consultation_duration_minutes: 90 });
  expect(getPreviewSchedule(other.clinic_id)?.appointments).toHaveLength(0);
});
