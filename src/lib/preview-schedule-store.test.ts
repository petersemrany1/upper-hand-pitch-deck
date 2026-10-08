import { expect, test } from "bun:test";
import { calendarPreviewFixture } from "./calendar-preview-fixture";
import { applyScheduleCommand, futureScheduleSlots, type ClinicSchedule } from "./clinic-schedule";
import { createPreviewScheduleStore, type PreviewScheduleStoreOptions } from "./preview-schedule-store";

/** Independent tab caches, shared browser storage, queued storage events and Web Locks. */
function browser() {
  const entries = new Map<string, string>();
  const subscribers = new Map<number, (key: string | null) => void>();
  const pending: (() => void)[] = [];
  const locks = new Map<string, Promise<unknown>>();
  let nextTab = 0;
  const withLock: NonNullable<PreviewScheduleStoreOptions["withLock"]> = <T>(key: string, work: () => T) => {
    const result = (locks.get(key) ?? Promise.resolve()).then(work, work);
    locks.set(key, result.catch(() => {}));
    return result;
  };
  function tab(namespace = "admin", legacy?: ClinicSchedule) {
    const id = nextTab++;
    return createPreviewScheduleStore(() => ({
      getItem: key => entries.get(key) ?? null,
      setItem: (key, value) => {
        entries.set(key, value);
        for (const [other, notify] of subscribers) if (other !== id) pending.push(() => notify(key));
      },
    }), {
      namespace, withLock,
      legacyStorage: () => ({ getItem: () => legacy ? JSON.stringify(legacy) : null, setItem: () => {} }),
      onExternalChange: refresh => { subscribers.set(id, refresh); return () => { subscribers.delete(id); }; },
    });
  }
  return { tab, entries, flush: () => { while (pending.length) pending.shift()!(); }, flushBackwards: () => { while (pending.length) pending.pop()!(); } };
}
function fixture() {
  const s = calendarPreviewFixture();
  s.blocks = []; s.overrides = []; s.appointments = [];
  s.consultation_minutes = 60; s.buffer_minutes = 15;
  s.trading.forEach(h => { h.is_closed = false; h.close_time = "17:00"; });
  return s;
}
const date = "2099-10-15";
const block = (s: ClinicSchedule) => applyScheduleCommand(s, { action: "block", dates: [date], start: "10:30", end: "13:45" });
const times = (s: ClinicSchedule) => futureScheduleSlots(s, date).map(slot => slot.time);

test("a Gro-style block immediately reaches a separate sales tab and removes overlapping starts", async () => {
  const b = browser(), partner = b.tab(), sales = b.tab();
  const s = await partner.seed(fixture()); await sales.seed(fixture());
  let updates = 0;
  const stop = sales.subscribe(() => updates++);
  const saved = await partner.update(s.clinic_id, block, s.version);
  b.flush();
  expect(updates).toBe(1);
  expect(sales.get(s.clinic_id)).toEqual(saved);
  expect(times(sales.get(s.clinic_id)!)).toEqual(["09:00", "09:15", "09:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00"]);
  stop();
});

test("moving, resizing, unblocking and settings changes propagate both ways", async () => {
  const b = browser(), partner = b.tab(), sales = b.tab();
  let s = await partner.seed(fixture()); await sales.seed(fixture());
  const stopPartner = partner.subscribe(() => {}), stopSales = sales.subscribe(() => {});
  s = await partner.update(s.clinic_id, block, s.version); b.flush();
  s = await partner.update(s.clinic_id, current => applyScheduleCommand(current, { action: "block", id: current.blocks[0].id, dates: ["2099-10-16"], source_date: date, start: "11:00", end: "14:00" }), s.version); b.flush();
  expect(times(sales.get(s.clinic_id)!)).toContain("10:30");
  expect(sales.get(s.clinic_id)!.blocks[0]).toMatchObject({ slot_date: "2099-10-16", slot_start: "11:00", slot_end: "14:00" });
  s = await sales.update(s.clinic_id, current => applyScheduleCommand(current, { action: "settings", consultation_minutes: 90, buffer_minutes: 30 }), s.version); b.flush();
  expect(partner.get(s.clinic_id)?.consultation_minutes).toBe(90);
  expect(times(partner.get(s.clinic_id)!)).not.toContain("16:00");
  s = await partner.update(s.clinic_id, current => applyScheduleCommand(current, { action: "unblock", id: current.blocks[0].id!, date: "2099-10-16", scope: "date" }), s.version); b.flush();
  expect(sales.get(s.clinic_id)?.blocks).toEqual([]);
  stopPartner(); stopSales();
});

test("a stale tab cannot book a blocked slot even before its storage event arrives", async () => {
  const b = browser(), partner = b.tab(), sales = b.tab();
  const s = await partner.seed(fixture()); await sales.seed(fixture());
  await partner.update(s.clinic_id, block, s.version);
  await expect(sales.update(s.clinic_id, current => {
    if (!times(current).includes("11:00")) throw new Error("That time is no longer available");
    return current;
  })).rejects.toThrow("no longer available");
  expect(sales.get(s.clinic_id)?.blocks).toHaveLength(1);
});

test("concurrent edits serialize and reject a stale version without losing the winning change", async () => {
  const b = browser(), partner = b.tab(), other = b.tab();
  const s = await partner.seed(fixture()); await other.seed(fixture());
  const result = await Promise.allSettled([
    partner.update(s.clinic_id, block, s.version),
    other.update(s.clinic_id, current => applyScheduleCommand(current, { action: "settings", consultation_minutes: 90, buffer_minutes: 30 }), s.version),
  ]);
  expect(result.map(r => r.status)).toEqual(["fulfilled", "rejected"]);
  expect(other.get(s.clinic_id)?.blocks).toHaveLength(1);
  expect(other.get(s.clinic_id)?.consultation_minutes).toBe(60);
});

test("delayed events never undo a newer save and unchanged snapshots keep their identity", async () => {
  const b = browser(), partner = b.tab(), sales = b.tab();
  let s = await partner.seed(fixture()); await sales.seed(fixture());
  const stop = sales.subscribe(() => {});
  s = await partner.update(s.clinic_id, block, s.version);
  s = await partner.update(s.clinic_id, current => applyScheduleCommand(current, { action: "settings", consultation_minutes: 90, buffer_minutes: 30 }), s.version);
  b.flushBackwards();
  expect(sales.get(s.clinic_id)).toEqual(s);
  const same = sales.get(s.clinic_id); sales.refresh();
  expect(sales.get(s.clinic_id)).toBe(same);
  stop();
});

test("saved changes survive reload and stale legacy tab drafts cannot overwrite the shared calendar", async () => {
  const b = browser(), original = fixture();
  const legacy = block(original);
  const partner = b.tab("admin", legacy);
  expect(await partner.seed(original)).toEqual(legacy);
  const sales = b.tab("admin", original);
  expect(await sales.seed(original)).toEqual(legacy);
  const changed = await partner.update(original.clinic_id, current => applyScheduleCommand(current, { action: "settings", consultation_minutes: 120, buffer_minutes: 15, apply_to_existing: true }), legacy.version);
  expect(await b.tab().seed(original)).toEqual(changed);
  expect(await b.tab("different-account").seed(original)).toEqual(original);
  const otherClinic = { ...original, clinic_id: "other-clinic" };
  expect(await b.tab().seed(otherClinic)).toEqual(otherClinic);
});

test("resubscribing catches changes made while a calendar was unmounted", async () => {
  const b = browser(), partner = b.tab(), sales = b.tab();
  const s = await partner.seed(fixture()); await sales.seed(fixture());
  const stop = sales.subscribe(() => {}); stop();
  const saved = await partner.update(s.clinic_id, block, s.version);
  const resubscribed = sales.subscribe(() => {});
  expect(sales.get(s.clinic_id)).toEqual(saved);
  resubscribed();
});

test("failed persistence does not replace the last successful preview save", async () => {
  const entries = new Map<string, string>(); let fail = false;
  const store = createPreviewScheduleStore(() => ({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => { if (fail) throw new Error("Storage full"); entries.set(key, value); } }));
  const saved = await store.seed(fixture()); fail = true;
  await expect(store.update(saved.clinic_id, block, saved.version)).rejects.toThrow("could not save");
  expect(store.get(saved.clinic_id)).toBe(saved);
});

test("unreadable legacy drafts fall back to a fresh authorized schedule", async () => {
  const original = fixture();
  const store = createPreviewScheduleStore(() => ({ getItem: () => null, setItem: () => {} }), {
    legacyStorage: () => ({ getItem: () => "invalid", setItem: () => {} }),
  });
  expect(await store.seed(original)).toEqual(original);
});
