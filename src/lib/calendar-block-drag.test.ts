import { expect, test } from "bun:test";
import { projectBlockDrag } from "./calendar-block-drag";

test("moving snaps to a quarter hour, preserves length and stays within the day", () => {
  expect(projectBlockDrag("move", 630, 720, 22)).toEqual({ from: 645, until: 735 });
  expect(projectBlockDrag("move", 630, 720, -900)).toEqual({ from: 0, until: 90 });
  expect(projectBlockDrag("move", 630, 720, 900)).toEqual({ from: 1350, until: 1440 });
});
test("resizing either edge preserves the other edge and a 15-minute minimum", () => {
  expect(projectBlockDrag("start", 630, 720, -30)).toEqual({ from: 600, until: 720 });
  expect(projectBlockDrag("end", 630, 720, 30)).toEqual({ from: 630, until: 750 });
  expect(projectBlockDrag("start", 630, 720, 120)).toEqual({ from: 705, until: 720 });
  expect(projectBlockDrag("end", 630, 720, -120)).toEqual({ from: 630, until: 645 });
});
