import { expect, test } from "bun:test";
import { calendarEventLayout, mergeCalendarBands } from "./calendar-event-layout";

test("overlapping appointments and blocks occupy separate lanes, touching events can share", () => {
  const events = [{ id: "a", start: 540, end: 660 }, { id: "b", start: 600, end: 720 }, { id: "block", start: 630, end: 690 }, { id: "c", start: 660, end: 720 }, { id: "later", start: 720, end: 780 }];
  const layout = calendarEventLayout(events);
  expect(layout.get("a")).toEqual({ lane: 0, lanes: 3 });
  expect(layout.get("c")).toEqual({ lane: 0, lanes: 3 });
  expect(layout.get("later")).toEqual({ lane: 0, lanes: 1 });
  for (const a of events) for (const b of events) {
    if (a.id !== b.id && a.start < b.end && a.end > b.start) expect(layout.get(a.id)?.lane).not.toBe(layout.get(b.id)?.lane);
  }
  expect(calendarEventLayout([...events].reverse())).toEqual(layout);
});

test("overlapping buffer bands are drawn once", () => {
  expect(mergeCalendarBands([[600, 630], [615, 645], [645, 660], [720, 750]])).toEqual([[600, 660], [720, 750]]);
});
