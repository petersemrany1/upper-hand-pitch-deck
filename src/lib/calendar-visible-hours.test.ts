import { expect, test } from "bun:test";
import { calendarPreviewFixture } from "./calendar-preview-fixture";
import { calendarVisibleHours } from "./calendar-visible-hours";

test("working days start at opening and keep only half an hour after closing", () => {
  const schedule = calendarPreviewFixture();
  const date = schedule.blocks[0].slot_date!;
  expect(calendarVisibleHours(schedule, [date])).toEqual({ firstMinute: 540, lastMinute: 930 });
  schedule.trading = schedule.trading.map(h => ({ ...h, open_time: "09:30", close_time: "16:15" }));
  expect(calendarVisibleHours(schedule, [date])).toEqual({ firstMinute: 540, lastMinute: 1020 });
});
test("early and late patients stay visible with their full durations and buffers", () => {
  const schedule = calendarPreviewFixture();
  const date = schedule.blocks[0].slot_date!;
  schedule.appointments = ["07:15", "17:45"].map((time, i) => ({ ...schedule.appointments[0], id: String(i), appointment_date: date, appointment_time: time }));
  expect(calendarVisibleHours(schedule, [date])).toEqual({ firstMinute: 420, lastMinute: 1230 });
});
test("whole-day and rest-of-day blocks do not fill the calendar with midnight hours", () => {
  const schedule = calendarPreviewFixture();
  const date = schedule.blocks[0].slot_date!;
  for (const start of ["00:00", "13:00"]) {
    schedule.blocks[0].slot_start = start; schedule.blocks[0].slot_end = "24:00";
    expect(calendarVisibleHours(schedule, [date])).toEqual({ firstMinute: 540, lastMinute: 930 });
  }
  schedule.blocks[0].slot_start = "20:00";
  expect(calendarVisibleHours(schedule, [date]).lastMinute).toBe(1260);
});
test("out-of-hours blocks remain visible and empty weeks have a usable range", () => {
  const schedule = calendarPreviewFixture();
  const date = schedule.blocks[0].slot_date!;
  schedule.blocks[0].slot_start = "06:30"; schedule.blocks[0].slot_end = "08:00";
  expect(calendarVisibleHours(schedule, [date]).firstMinute).toBe(360);
  schedule.blocks = []; schedule.appointments = [];
  schedule.trading = schedule.trading.map(h => ({ ...h, is_closed: true }));
  expect(calendarVisibleHours(schedule, [date])).toEqual({ firstMinute: 540, lastMinute: 1050 });
});
