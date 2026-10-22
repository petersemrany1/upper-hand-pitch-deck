import { expect, test } from "bun:test";
import { nextSessionIndexFromActive, reorderSessionQueue, sessionQueueIndex } from "./session-queue";

test("fresh leads already deep in a saved queue move ahead of old no-answers", () => {
  expect(reorderSessionQueue({ queue: ["done", "current", "june", "Costa", "Omar", "George"], index: 1,
    activeId: "current", orderedIds: ["Edson", "George", "Omar", "Costa", "recent", "june"] }))
    .toEqual(["done", "current", "Edson", "George", "Omar", "Costa", "recent", "june"]);
});

test("a stale completed prefix is not replayed while call history catches up", () => {
  expect(reorderSessionQueue({ queue: ["done", "current", "waiting"], index: 1,
    activeId: "current", orderedIds: ["done", "current", "new", "waiting"] }))
    .toEqual(["done", "current", "new", "waiting"]);
});

test("first turns move ahead of a repeat already waiting in a restored afternoon queue", () => {
  expect(reorderSessionQueue({ queue: ["current", "repeat", "june"], index: 0, activeId: "current",
    orderedIds: ["recent", "june", "repeat"] })).toEqual(["current", "recent", "june", "repeat"]);
});

test("an afternoon turn appended after exhaustion survives sorting even with a morning entry in the prefix", () => {
  expect(reorderSessionQueue({ queue: ["repeat", "current", "repeat"], index: 1, activeId: "current",
    orderedIds: ["repeat"] })).toEqual(["repeat", "current", "repeat"]);
});

test("booked or unavailable leads disappear, explicit skips stay deferred and callbacks keep priority", () => {
  expect(reorderSessionQueue({ queue: ["current", "booked", "skipped", "new", "callback"], index: 0,
    activeId: "current", orderedIds: ["skipped", "new"], priorityIds: ["callback"], skipped: new Set(["skipped"]) }))
    .toEqual(["current", "callback", "new"]);
});

test("an exhausted queue accepts a newly arrived lead without replaying completed leads", () => {
  expect(reorderSessionQueue({ queue: ["done"], index: 1, activeId: null, orderedIds: ["new", "done"] }))
    .toEqual(["done", "new"]);
});

test("an unchanged queue retains its reference", () => {
  const queue = ["current", "new"];
  expect(reorderSessionQueue({ queue, index: 0, activeId: "current", orderedIds: ["new"] })).toBe(queue);
});

test("finishing an afternoon repeat advances from its afternoon position", () => {
  expect(nextSessionIndexFromActive(["repeat", "other", "repeat", "next"], "repeat", 2)).toBe(3);
});

test("a shifted saved position must not freeze old leads ahead of fresh enquiries", () => {
  const queue = reorderSessionQueue({ queue: ["current", "old", "fresh"], index: 2,
    activeId: "current", orderedIds: ["fresh", "old"] });
  expect(queue).toEqual(["current", "fresh", "old"]);
  expect(queue[nextSessionIndexFromActive(queue, "current", 2)]).toBe("fresh");
});

test("a current lead removed by an older client is restored without consuming the next fresh lead", () => {
  const queue = reorderSessionQueue({ queue: ["done", "fresh", "old"], index: 1,
    activeId: "current", orderedIds: ["fresh", "old"] });
  expect(queue).toEqual(["done", "current", "fresh", "old"]);
  expect(queue[nextSessionIndexFromActive(queue, "current", 1)]).toBe("fresh");
});

test("an availability refresh preserves the completed prefix and current lead, pruning only the waiting list", () => {
  const queue = reorderSessionQueue({ queue: ["done-full", "current-full", "waiting-full", "old", "fresh"], index: 1,
    activeId: "current-full", orderedIds: ["fresh", "old"] });
  expect(queue).toEqual(["done-full", "current-full", "fresh", "old"]);
  expect(queue[nextSessionIndexFromActive(queue, "current-full", 1)]).toBe("fresh");
});

test("a restored cursor past the end recovers to the first new arrival", () => {
  const saved = ["done"];
  const index = sessionQueueIndex(saved, null, 5);
  const queue = reorderSessionQueue({ queue: saved, index, activeId: null, orderedIds: ["fresh"] });
  expect(index).toBe(1);
  expect(queue[index]).toBe("fresh");
});

test("repairing an afternoon session retains its second turn and callback priority", () => {
  const saved = ["repeat", "done", "repeat", "old", "fresh"];
  const index = sessionQueueIndex(saved, "repeat", 2);
  const queue = reorderSessionQueue({ queue: saved, index, activeId: "repeat",
    priorityIds: ["callback"], orderedIds: ["fresh", "old"] });
  expect(index).toBe(2);
  expect(queue).toEqual(["repeat", "done", "repeat", "callback", "fresh", "old"]);
});
