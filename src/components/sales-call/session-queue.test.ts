import { expect, test } from "bun:test";
import { nextSessionIndexFromActive, reorderSessionQueue } from "./session-queue";

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
