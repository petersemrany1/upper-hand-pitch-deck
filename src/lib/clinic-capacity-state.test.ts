import { expect, test } from "bun:test";
import { capacityLocations, createCapacityMonitor, initialCapacityState, type CapacityRead, type CapacityState } from "./clinic-capacity-state";
import { clinicRemainingBalances } from "./clinic-capacity-balance";
import { buildQueue, dueCallbackIds } from "../components/sales-call/queue";
import { reorderSessionQueue } from "../components/sales-call/session-queue";
import { canStartSalesCall, SalesCallCapacity } from "./sales-call-capacity";

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const clinics = [{ id: "boss", city: "Perth" }, { id: "nitai", city: "Melbourne" }];
const result = (boss: number): CapacityRead => ({ clinics, remaining: { boss, nitai: 3 } });
function fixture() {
  let state = initialCapacityState(), reads = 0;
  const pending: ReturnType<typeof deferred<CapacityRead>>[] = [], errors: unknown[] = [];
  const timers = new Map<number, { delay: number; run: () => void }>(); let sequence = 0;
  const monitor = createCapacityMonitor({
    read: () => { reads++; const next = deferred<CapacityRead>(); pending.push(next); return next.promise; },
    changed: next => { state = next; }, report: error => { errors.push(error); },
    schedule: ((fn: () => void, delay: number) => { timers.set(++sequence, { delay, run: fn }); return sequence; }) as unknown as typeof setTimeout,
    cancel: ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout,
  });
  return { monitor, pending, errors, timers, get state() { return state; }, get reads() { return reads; },
    fire(delay: number) { const entry = [...timers].find(([, t]) => t.delay === delay); expect(entry).toBeDefined(); timers.delete(entry![0]); entry![1].run(); } };
}

test("Perth no-show restores one credit; replacement immediately removes waiting leads and callbacks while the current call can finish", async () => {
  const f = fixture();
  const now = new Date("2026-11-10T04:00:00Z");
  const pack = { clinic_id: "boss", pack_size: 1, pack_type: "paid", date_paid: "2026-10-01", purchased_at: "2026-10-01" };
  const appointment = { clinic_id: "boss", outcome: null as string | null, disqualified_at: null, booked_at: "2026-11-09" };
  const readBalance = (rows: typeof appointment[]) => ({ clinics, remaining: { nitai: 3, ...clinicRemainingBalances([pack], rows, "2026-11-10") } });
  const leads = ["perth", "melbourne", "callback"].map(id => ({ id, status: id === "callback" ? "callback_scheduled" : "new", created_at: now.toISOString(), callback_scheduled_at: id === "callback" ? now.toISOString() : null }));
  const isPaused = (lead: { id: string }) => !capacityLocations(f.state).available.includes(lead.id === "melbourne" ? "melbourne" : "perth");
  const queue = () => buildQueue({ leads, history: {}, now, isPaused }).order;
  f.monitor.refresh(); await flush(); f.pending.shift()!.resolve(readBalance([appointment])); await flush();
  expect(queue()).toEqual(["melbourne"]);
  f.monitor.refresh({ clinicId: "boss" }); await flush();
  f.pending.shift()!.resolve(readBalance([{ ...appointment, outcome: "noshow" }])); await flush();
  expect(f.state.remaining.boss).toBe(1); expect(queue()).toContain("perth");
  const currentCall = new SalesCallCapacity(); currentCall.admit("current", f.state.remaining);
  f.monitor.refresh({ clinicId: "boss" });
  // No network response is needed to remove the clinic's waiting entries.
  expect(f.state.status).toBe("checking"); expect(queue()).toEqual(["melbourne"]);
  expect(dueCallbackIds(leads, {}, now, isPaused)).toEqual([]);
  expect(reorderSessionQueue({ queue: ["done", "current", "perth", "melbourne"], index: 1, activeId: "current", orderedIds: queue() })).toEqual(["done", "current", "melbourne"]);
  expect(currentCall.allows("current", "boss", "current", "in-call")).toBe(true);
  await flush(); f.pending.shift()!.resolve(readBalance([{ ...appointment, outcome: "noshow" }, appointment])); await flush();
  expect(f.state.status).toBe("ready"); expect(f.state.remaining.boss).toBe(0); expect(queue()).toEqual(["melbourne"]);
  expect(canStartSalesCall(["boss"], f.state.remaining)).toBe(false);
  f.monitor.stop();
});

test("routine polls cannot starve a slow successful refresh", async () => {
  const f = fixture(); f.monitor.refresh(); await flush();
  for (let i = 0; i < 10; i++) f.monitor.refresh();
  expect(f.reads).toBe(1);
  f.pending.shift()!.resolve(result(0)); await flush();
  expect(f.state.status).toBe("ready"); expect(f.state.remaining.boss).toBe(0); expect(f.reads).toBe(1);
  f.monitor.stop();
});

test("an older read cannot reopen Perth after a booking; mutations coalesce to one fresh read", async () => {
  const f = fixture(); f.monitor.refresh(); await flush(); f.pending.shift()!.resolve(result(1)); await flush();
  f.monitor.refresh(); await flush();
  for (let i = 0; i < 5; i++) f.monitor.refresh({ clinicId: "boss" });
  f.pending.shift()!.resolve(result(1)); await flush();
  expect(f.state.status).toBe("checking"); expect(capacityLocations(f.state).available).toEqual(["melbourne"]);
  expect(f.reads).toBe(3);
  f.pending.shift()!.resolve(result(0)); await flush();
  expect(f.state.status).toBe("ready"); expect(f.state.remaining.boss).toBe(0); f.monitor.stop();
});

test("failed refresh stays paused, logs once per outage, retries automatically and recovers", async () => {
  const f = fixture(); f.monitor.refresh(); await flush(); f.pending.shift()!.resolve(result(1)); await flush();
  f.monitor.refresh({ clinicId: "boss" }); await flush(); f.pending.shift()!.reject(new Error("offline")); await flush();
  expect(f.state.status).toBe("error"); expect(capacityLocations(f.state).available).toEqual(["melbourne"]);
  expect(f.errors).toHaveLength(1);
  f.fire(2_000); await flush(); f.pending.shift()!.reject(new Error("offline")); await flush();
  expect(f.errors).toHaveLength(1); f.fire(4_000); await flush(); f.pending.shift()!.resolve(result(0)); await flush();
  expect(f.state.status).toBe("ready"); expect(f.state.blockedClinicIds).toEqual([]); expect(f.timers.size).toBe(0); f.monitor.stop();
});

test("hung requests time out; late responses cannot replace a recovered balance", async () => {
  const f = fixture(); f.monitor.refresh(); await flush(); const late = f.pending.shift()!;
  f.fire(12_000); await flush(); expect(f.state.status).toBe("error"); expect(f.errors).toHaveLength(1);
  f.fire(2_000); await flush(); f.pending.shift()!.resolve(result(0)); await flush();
  late.resolve(result(1)); await flush(); expect(f.state.remaining.boss).toBe(0); f.monitor.stop();
});

test("another Perth clinic with credits stays available; stopped monitors never publish or retry", async () => {
  const state: CapacityState = { ...result(0), clinics: [...clinics, { id: "other", city: "Perth" }], remaining: { boss: 0, other: 2 }, blockedClinicIds: ["boss"], status: "checking" };
  expect(capacityLocations(state).available).toContain("perth");
  const f = fixture(); f.monitor.refresh(); await flush(); f.monitor.stop(); f.pending.shift()!.reject(new Error("late failure")); await flush();
  expect(f.errors).toEqual([]); expect(f.timers.size).toBe(0); expect(f.state.status).toBe("checking");
});
