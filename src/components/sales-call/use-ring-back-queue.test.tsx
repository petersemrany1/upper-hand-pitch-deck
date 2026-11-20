import { afterAll, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import { useRingBackQueue } from "./use-ring-back-queue";
const browser = new Window({ url: "https://portal.example/sales-call" });
const env = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(env).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
for (const [k, value] of Object.entries(env)) Object.defineProperty(globalThis, k, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const host = document.createElement("div"), root = createRoot(host);
let queue: ReturnType<typeof useRingBackQueue>;
function Harness({ owner }: { owner: string | null }) { queue = useRingBackQueue(owner); return null; }
afterAll(async () => {
  await act(async () => root.unmount());
  await browser.happyDOM.abort();
  for (const [k, d] of previous) { if (d) Object.defineProperty(globalThis, k, d); else Reflect.deleteProperty(globalThis, k); }
});
test("Nina's queued callbacks survive reload without appearing in Peter's account", async () => {
  window.localStorage.setItem("salesCall.ringBackQueue", JSON.stringify({ at: Date.now(), ids: ["old-unowned"], ringBack: ["old-unowned"] }));
  await act(async () => root.render(h(Harness, { owner: "nina" })));
  expect(queue.missedCallQueue).toEqual([]);
  await act(async () => { queue.setMissedCallQueue(["caller"]); queue.setRingBackIds(["caller"]); });
  const staleSetter = queue.setMissedCallQueue;
  expect(queue.missedCallQueue).toEqual(["caller"]);
  await act(async () => root.render(h(Harness, { owner: "peter" })));
  expect(queue.missedCallQueue).toEqual([]);
  expect(queue.ringBackIds).toEqual([]);
  await act(async () => staleSetter(["late-event-for-nina"]));
  expect(queue.missedCallQueue).toEqual([]);
  await act(async () => root.render(h(Harness, { owner: null })));
  await act(async () => root.render(h(Harness, { owner: "nina" })));
  expect(queue.missedCallQueue).toEqual(["caller"]);
  expect(queue.ringBackIds).toEqual(["caller"]);
  await act(async () => { queue.setMissedCallQueue([]); queue.setRingBackIds([]); });
  expect(window.localStorage.getItem("salesCall.ringBackQueue.nina")).toBeNull();
});
