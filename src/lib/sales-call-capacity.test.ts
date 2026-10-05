import { expect, test } from "bun:test";
import { canStartSalesCall, SalesCallCapacity } from "./sales-call-capacity";
import { allocatePacks, creditBalance } from "./pack-allocation";
import { buildQueue, dueCallbackIds } from "../components/sales-call/queue";

test("two live sales calls can finish the final Melbourne credit; the next call is blocked", () => {
  const first = new SalesCallCapacity();
  const second = new SalesCallCapacity();
  const remaining = { melbourne: 1 };
  expect(canStartSalesCall(["melbourne"], remaining)).toBe(true);
  first.admit("lead-a", remaining);
  second.admit("lead-b", remaining);
  remaining.melbourne = 0;
  expect(first.allows("lead-a", "melbourne", "lead-a", "in-call")).toBe(true);
  expect(second.allows("lead-b", "melbourne", "lead-b", "in-call")).toBe(true);
  expect(canStartSalesCall(["melbourne"], remaining)).toBe(false);
  const pack = { id: "pack", pack_size: 10, purchased_at: "2026-10-01", pack_type: "paid" };
  expect(creditBalance(allocatePacks([pack], 9, 2)).available).toBe(-1);
  expect(canStartSalesCall(["melbourne"], { melbourne: -1 })).toBe(false);
  expect(canStartSalesCall(["melbourne"], { melbourne: 9 })).toBe(true);
});

test("viewing a lead, ringing, ended calls and other leads get no live-call exception", () => {
  const call = new SalesCallCapacity();
  call.admit("lead-a", { melbourne: 1, sydney: 0 });
  for (const status of ["ready", "connecting", "ringing-incoming", "error"]) {
    expect(call.allows("lead-a", "melbourne", "lead-a", status)).toBe(false);
  }
  expect(call.allows("lead-b", "melbourne", "lead-b", "in-call")).toBe(false);
  expect(call.allows("lead-a", "melbourne", "lead-b", "in-call")).toBe(false);
  expect(call.allows("lead-a", "sydney", "lead-a", "in-call")).toBe(false);
  call.clear();
  expect(call.allows("lead-a", "melbourne", "lead-a", "in-call")).toBe(false);
});

test("admitting another call replaces the old allowance", () => {
  const call = new SalesCallCapacity();
  call.admit("lead-a", { melbourne: 1 });
  call.admit("lead-b", { sydney: 2, melbourne: 0 });
  expect(call.allows("lead-a", "melbourne", "lead-a", "in-call")).toBe(false);
  expect(call.allows("lead-b", "sydney", "lead-b", "in-call")).toBe(true);
});

test("another available clinic in the same location keeps leads callable", () => {
  expect(canStartSalesCall(["melbourne-a", "melbourne-b"], { "melbourne-a": -1, "melbourne-b": 1 })).toBe(true);
  expect(canStartSalesCall(["melbourne-a", "melbourne-b"], { "melbourne-a": 0, "melbourne-b": 0 })).toBe(false);
});

test("full Melbourne drops from the next-lead queue and callbacks, then returns after a top-up", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const leads = [
    { id: "melbourne", status: "new", created_at: now.toISOString(), callback_scheduled_at: null },
    { id: "sydney", status: "new", created_at: now.toISOString(), callback_scheduled_at: null },
    { id: "callback", status: "callback_scheduled", created_at: now.toISOString(), callback_scheduled_at: now.toISOString() },
  ];
  let remaining = { melbourne: 0, sydney: 3 };
  const isPaused = (lead: { id: string }) => !canStartSalesCall([lead.id === "sydney" ? "sydney" : "melbourne"], remaining);
  expect(buildQueue({ leads, history: {}, now, isPaused }).order).toEqual(["sydney"]);
  expect(dueCallbackIds(leads, {}, now, isPaused)).toEqual([]);
  remaining = { melbourne: 9, sydney: 3 };
  expect(buildQueue({ leads, history: {}, now, isPaused }).order).toContain("melbourne");
  expect(dueCallbackIds(leads, {}, now, isPaused)).toEqual(["callback"]);
});
