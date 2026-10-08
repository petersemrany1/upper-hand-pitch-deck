import { expect, test } from "bun:test";
import { blockDragScrollDelta, projectBlockDrag } from "./calendar-block-drag";

test("auto-scroll never pulls upwards while extending a block downwards", () => {
  const bounds = { left: 80, right: 900, top: 300, bottom: 700 };
  expect(blockDragScrollDelta({ x: 200, y: 310, directionX: 0, directionY: 1 }, bounds, "end")).toEqual({ x: 0, y: 0 });
  expect(blockDragScrollDelta({ x: 200, y: 680, directionX: 0, directionY: -1 }, bounds, "end")).toEqual({ x: 0, y: 0 });
  expect(blockDragScrollDelta({ x: 200, y: 695, directionX: 0, directionY: 1 }, bounds, "end").y).toBeGreaterThan(0);
  expect(blockDragScrollDelta({ x: 200, y: 305, directionX: 0, directionY: -1 }, bounds, "start").y).toBeLessThan(0);
});
test("auto-scroll remains idle in the middle and only moves sideways when moving a block", () => {
  const bounds = { left: 80, right: 900, top: 300, bottom: 700 };
  expect(blockDragScrollDelta({ x: 400, y: 500, directionX: 1, directionY: 1 }, bounds, "move")).toEqual({ x: 0, y: 0 });
  expect(blockDragScrollDelta({ x: 895, y: 500, directionX: 1, directionY: 0 }, bounds, "move").x).toBeGreaterThan(0);
  expect(blockDragScrollDelta({ x: 895, y: 500, directionX: 1, directionY: 0 }, bounds, "end").x).toBe(0);
});

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
