import { expect, test } from "bun:test";
import { addDays, applyScheduleCommand, asDate, blockedStartBands, configurationOf, patientBufferBands, datesForEdit, futureScheduleSlots, scheduleSlots, schedulingWarnings, type ClinicSchedule } from "./clinic-schedule";
import { recurrenceMatches } from "./slot-generation";

const day = "2099-10-12";
function fixture(): ClinicSchedule {
  return { clinic_id: "clinic", clinic_name: "Test clinic", state: "NSW", consultation_minutes: 90, buffer_minutes: 30, version: "v1",
    trading: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, open_time: "09:00", close_time: "15:00", is_closed: false, consult_duration_mins: 15 })),
    appointments: [], overrides: [], blocks: [] };
}
const times = (s: ClinicSchedule, date = day) => scheduleSlots(s, date).filter(x => x.available).map(x => x.time);
const block = (s: ClinicSchedule, start = "10:30", end = "12:00") => applyScheduleCommand(s, { action: "block", dates: [day], start, end });
test("sales slots allow the exact closing boundary and exclude appointments that finish later", () => {
  for (const [close, duration, last, tooLate] of [["17:00", 90, "15:30", "15:45"], ["16:00", 60, "15:00", "15:30"]] as const) {
    const s = fixture();
    s.consultation_minutes = duration;
    s.trading = s.trading.map(h => ({ ...h, close_time: close }));
    const offered = futureScheduleSlots(s, day, new Date("2026-10-08T00:00:00Z")).filter(slot => slot.available).map(slot => slot.time);
    expect(offered.at(-1)).toBe(last);
    expect(offered).not.toContain(tooLate);
    const overridden = applyScheduleCommand(s, { action: "hours", dates: [day], start: "09:00", end: "14:00", closed: false });
    expect(times(overridden).at(-1)).toBe(duration === 90 ? "12:30" : "13:00");
  }
});
test("90 minutes fits exactly before a block, never runs into it or past closing", () => {
  expect(times(block(fixture()))).toEqual(["09:00", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30"]);
  expect(times(block(fixture(), "15:00", "24:00"))).toContain("13:30");
  expect(times(fixture())).not.toContain("14:00");
});
test("the buffer applies between patients in both directions, not around manual blocks", () => {
  const s = fixture(); s.appointments.push({ id: "a", appointment_date: day, appointment_time: "11:00", consultation_duration_minutes: 90 });
  expect(times(s)).toEqual(["09:00", "13:00", "13:15", "13:30"]);
  expect(times(block(fixture()))).toContain("09:00");
  expect(times(block(fixture()))).toContain("12:00");
});
test("zero buffer permits back-to-back appointments and custom lengths remain independent of start interval", () => {
  const s = fixture(); s.buffer_minutes = 0; s.consultation_minutes = 45;
  s.appointments.push({ id: "a", appointment_date: day, appointment_time: "09:00", consultation_duration_minutes: 45 });
  expect(times(s)[0]).toBe("09:45"); expect(times(s).at(-1)).toBe("14:15");
});
test("settings preserve existing appointment lengths and flag existing conflicts", () => {
  const s = fixture(); s.appointments = ["09:00", "10:30"].map((t, i) => ({ id: String(i), appointment_date: day, appointment_time: t, consultation_duration_minutes: 90 }));
  const next = applyScheduleCommand(s, { action: "settings", consultation_minutes: 30, buffer_minutes: 30 });
  expect(next.appointments).toEqual(s.appointments); expect(times(next)[0]).toBe("12:30");
  expect(schedulingWarnings(next, day)).toHaveLength(1);
});
test("confirmed length changes resize all patients, preserve starts and identify both overlapping patients", () => {
  const s = fixture(); s.buffer_minutes = 0;
  s.appointments = ["13:30", "14:00"].map((time, i) => ({ id: String(i), patient_name: `Patient ${i}`, appointment_date: day, appointment_time: time, consultation_duration_minutes: 30 }));
  const next = applyScheduleCommand(s, { action: "settings", consultation_minutes: 90, buffer_minutes: 0, apply_to_existing: true });
  expect(next.appointments.map(a => a.consultation_duration_minutes)).toEqual([90, 90]);
  expect(next.appointments.map(a => a.appointment_time)).toEqual(["13:30", "14:00"]);
  expect(schedulingWarnings(next, day).map(w => w.id)).toEqual(["0", "1"]);
  expect(schedulingWarnings(next, day)[0].text).toContain("overlaps Patient 1");
  expect(schedulingWarnings(next, day)[1].text).toContain("outside working hours");
  expect(times(next)).not.toContain("13:00");
});
test("manual blocks and shortened working hours cannot cut through a booked patient", () => {
  const s = fixture(); s.appointments = [{ id: "a", appointment_date: day, appointment_time: "12:00", consultation_duration_minutes: 90 }];
  expect(() => block(s, "13:00", "14:00")).toThrow("patient is booked");
  expect(() => applyScheduleCommand(s, { action: "hours", dates: [day], start: "09:00", end: "13:00", closed: false })).toThrow("patient is booked");
  expect(times(block(s))).toContain("09:00");
});
test("repeated hours preserve explicit closures and public holidays, including weekly closed holiday", () => {
  const s = fixture(); s.overrides = [{ override_date: "2026-12-24", override_type: "closed", start_time: null, end_time: null }];
  s.trading[4].is_closed = true;
  const next = applyScheduleCommand(s, { action: "hours", dates: ["2026-12-23", "2026-12-24", "2026-12-25"], start: "10:00", end: "14:00", closed: false });
  expect(times(next, "2026-12-24")).toEqual([]); expect(times(next, "2026-12-25")).toEqual([]);
  expect(times(applyScheduleCommand(next, { action: "hours", dates: ["2026-12-25"], start: "09:00", end: "15:00", closed: false }), "2026-12-25")).toContain("09:00");
});
test("single-occurrence editing leaves all other recurring blocks intact", () => {
  const s = fixture(); s.blocks = [{ id: "repeat", slot_date: day, slot_start: "12:00", slot_end: "13:00", is_recurring: true, recur_pattern: "daily", recur_day_of_week: null }];
  const next = applyScheduleCommand(s, { action: "block", id: "repeat", scope: "date", dates: [day], start: "14:00", end: "15:00" });
  expect(times(next)).toContain("12:00"); expect(times(next, addDays(day, 1))).not.toContain("12:00");
  expect(recurrenceMatches(s.blocks[0], asDate(addDays(day, -1)))).toBe(false);
});
test("copy/repeat dates are bounded and include only requested weekdays", () => {
  expect(datesForEdit("2026-10-12", [3], "2026-10-21")).toEqual(["2026-10-12", "2026-10-14", "2026-10-19", "2026-10-21"]);
  expect(() => datesForEdit(day, [], "2101-01-01")).toThrow("next year");
  expect(() => applyScheduleCommand(fixture(), { action: "block", dates: [day, "2101-01-01"], start: "10:00", end: "11:00" })).toThrow("valid dates");
});
test("pre-block shading is display-only and undo restores exact configuration", () => {
  const s = fixture(), next = block(s);
  expect(blockedStartBands(next, day)).toEqual([[540, 630]]); expect(next.blocks).toHaveLength(1);
  const restored = applyScheduleCommand(next, { action: "restore", configuration: configurationOf(s) });
  expect(times(restored)).toEqual(times(s)); expect(s.blocks).toHaveLength(0);
});
test("invalid or incomplete busy data fails closed", () => {
  for (const patch of [{ consultation_minutes: 0 }, { buffer_minutes: -1 }, { appointments: [{ id: "a", appointment_date: day, appointment_time: "bad" }] }, { blocks: [{ id: "b", slot_date: day, slot_start: "bad", slot_end: "12:00", is_recurring: false, recur_day_of_week: null }] }]) expect(times({ ...fixture(), ...patch })).toEqual([]);
});
test("same-day starts respect Sydney daylight savings and elapsed times disappear", () => {
  expect(futureScheduleSlots(fixture(), "2026-10-08", new Date("2026-10-08T00:00:00Z")).map(x => x.time)[0]).toBe("11:15");
  expect(futureScheduleSlots(fixture(), "2026-10-07", new Date("2026-10-08T00:00:00Z"))).toEqual([]);
});

test("buffer shading never hides inside a manual block or past closing", () => {
  const s = block(fixture()); const a = { id: "a", appointment_date: day, appointment_time: "09:00", consultation_duration_minutes: 90 };
  s.appointments.push(a); expect(patientBufferBands(s, a)).toEqual([]);
  s.blocks = []; expect(patientBufferBands(s, a)).toEqual([[630, 660]]);
  a.appointment_time = "13:30"; expect(patientBufferBands(s, a)).toEqual([]);
});
test("legacy blocked-day overrides remain closed when copied", () => {
  const s = fixture(); s.overrides.push({ override_date: addDays(day, 1), override_type: "blocked", start_time: null, end_time: null });
  const next = applyScheduleCommand(s, { action: "hours", dates: [day, addDays(day, 1)], start: "10:00", end: "14:00", closed: false });
  expect(times(next, addDays(day, 1))).toEqual([]);
});

test("undoing settings preserves existing conflicts as warnings, without moving patients", () => {
  const s = fixture(); s.appointments = ["09:00", "10:30"].map((time, i) => ({ id: String(i), appointment_date: day, appointment_time: time, consultation_duration_minutes: 90 }));
  const updated = applyScheduleCommand(s, { action: "settings", consultation_minutes: 60, buffer_minutes: 0 });
  const restored = applyScheduleCommand(updated, { action: "restore", configuration: configurationOf(s) });
  expect(restored.appointments).toEqual(s.appointments); expect(restored.buffer_minutes).toBe(30);
  expect(schedulingWarnings(restored, day)).toHaveLength(1);
});

test("weekly settings repeat, preserve date overrides and undo restores operating hours", () => {
  const original = fixture();
  original.overrides = [{ override_date: day, override_type: "closed", start_time: null, end_time: null }];
  const trading = original.trading.map(h => ({ ...h, open_time: "10:00", is_closed: h.day_of_week > 4 }));
  const updated = applyScheduleCommand(original, { action: "settings", consultation_minutes: 60, buffer_minutes: 15, trading });
  expect(updated.trading[0].open_time).toBe("10:00");
  expect(updated.overrides).toEqual(original.overrides);
  expect(applyScheduleCommand(updated, { action: "restore", configuration: configurationOf(original) }).trading).toEqual(original.trading);
  expect(() => applyScheduleCommand(original, { action: "settings", consultation_minutes: 60, buffer_minutes: 0, trading: trading.slice(1) })).toThrow("seven days");
});
