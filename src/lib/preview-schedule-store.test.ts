import { expect, test } from "bun:test";
import { calendarPreviewFixture } from "./calendar-preview-fixture";
import { applyScheduleCommand } from "./clinic-schedule";
import { createPreviewScheduleStore } from "./preview-schedule-store";

test("saved lengths, resized patients and blocks survive a new page instance", () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  const original = calendarPreviewFixture(), first = createPreviewScheduleStore(() => storage);
  const initial = first.seed(original);
  const changed = applyScheduleCommand(initial, { action: "settings", consultation_minutes: 120, buffer_minutes: 15, apply_to_existing: true });
  first.set(original.clinic_id, changed);
  const reloaded = createPreviewScheduleStore(() => storage).seed(original);
  expect(reloaded).toEqual(changed);
  expect(reloaded.appointments.every(a => a.consultation_duration_minutes === 120)).toBe(true);
  expect(first.seed(original)).toBe(changed);
  const other = { ...original, clinic_id: "other-clinic" };
  expect(createPreviewScheduleStore(() => storage).seed(other)).toEqual(other);
  first.set(original.clinic_id, original);
  expect(createPreviewScheduleStore(() => storage).seed(original)).toEqual(original);
});

test("failed persistence does not replace the last successful preview save", () => {
  const original = calendarPreviewFixture();
  const store = createPreviewScheduleStore(() => ({ getItem: () => null, setItem: () => { throw new Error("Storage full"); } }));
  const saved = store.seed(original);
  expect(() => store.set(original.clinic_id, { ...saved, consultation_minutes: 60 })).toThrow("could not save");
  expect(store.get(original.clinic_id)).toBe(saved);
});

test("unreadable saved drafts safely fall back to a fresh authorized schedule", () => {
  const original = calendarPreviewFixture();
  const store = createPreviewScheduleStore(() => ({ getItem: () => "invalid", setItem: () => {} }));
  expect(store.seed(original)).toEqual(original);
});
