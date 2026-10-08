import type { ClinicSchedule } from "./clinic-schedule";

type StorageAccess = () => Pick<Storage, "getItem" | "setItem"> | undefined;
export type PreviewScheduleStoreOptions = {
  namespace?: string;
  legacyStorage?: StorageAccess;
  onExternalChange?: (refresh: (key: string | null) => void) => () => void;
  withLock?: <T>(key: string, work: () => T) => Promise<T>;
};
const storageError = () => new Error("This browser could not save your preview changes. Allow site storage and try again.");

function decode(raw: string | null | undefined, id: string): ClinicSchedule | undefined {
  try {
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.clinic_id === id && typeof saved.version === "string"
      && Number.isInteger(saved.consultation_minutes) && saved.consultation_minutes >= 5 && saved.consultation_minutes <= 240
      && Number.isInteger(saved.buffer_minutes) && saved.buffer_minutes >= 0 && saved.buffer_minutes <= 180
      && [saved.trading, saved.blocks, saved.overrides, saved.appointments].every(Array.isArray)) return saved;
  } catch { /* Invalid old drafts must not prevent an authorized calendar loading. */ }
}

/** One approval calendar per account/clinic, shared by every tab on this origin. */
export function createPreviewScheduleStore(storage: StorageAccess, options: PreviewScheduleStoreOptions = {}) {
  const keyFor = (id: string) => `clinic-calendar-approval:v2:${options.namespace ?? "default"}:${id}`;
  const schedules = new Map<string, ClinicSchedule>();
  const listeners = new Set<() => void>();
  let stopExternal: (() => void) | undefined;
  const notify = () => listeners.forEach(listener => listener());
  const read = (id: string) => {
    try { return decode(storage()?.getItem(keyFor(id)), id); }
    catch { throw storageError(); }
  };
  const remember = (id: string, schedule: ClinicSchedule) => {
    const cached = schedules.get(id);
    if (cached?.version === schedule.version) return cached;
    schedules.set(id, schedule);
    notify();
    return schedule;
  };
  const persist = (id: string, schedule: ClinicSchedule) => {
    // Write first: a failed save must not change either portal's calendar.
    try { storage()?.setItem(keyFor(id), JSON.stringify(schedule)); }
    catch { throw storageError(); }
    return remember(id, schedule);
  };
  const locked = <T>(id: string, work: () => T) => options.withLock
    ? options.withLock(keyFor(id), work) : Promise.resolve().then(work);
  const refresh = (key: string | null = null) => {
    for (const id of schedules.keys()) {
      if (key !== null && key !== keyFor(id)) continue;
      // Read the current value, not an event payload: delayed events cannot
      // roll back a newer save. Never load another account/clinic via an event.
      try { const current = read(id); if (current) remember(id, current); }
      catch { /* Saves fail closed; a background storage failure keeps the last snapshot. */ }
    }
  };
  return {
    get: (id: string) => schedules.get(id),
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) stopExternal = options.onExternalChange?.(refresh);
      refresh();
      return () => { listeners.delete(listener); if (!listeners.size) { stopExternal?.(); stopExternal = undefined; } };
    },
    refresh,
    seed(schedule: ClinicSchedule) {
      return locked(schedule.clinic_id, () => {
        const shared = read(schedule.clinic_id);
        if (shared) return remember(schedule.clinic_id, shared);
        let legacy: ClinicSchedule | undefined;
        try { legacy = decode(options.legacyStorage?.()?.getItem(`clinic-calendar-approval:v1:${schedule.clinic_id}`), schedule.clinic_id); }
        catch { /* Legacy tab storage may be disabled while shared storage is available. */ }
        return persist(schedule.clinic_id, legacy ?? schedules.get(schedule.clinic_id) ?? structuredClone(schedule));
      });
    },
    update(id: string, change: (current: ClinicSchedule) => ClinicSchedule, expectedVersion?: string) {
      return locked(id, () => {
        const current = read(id) ?? schedules.get(id);
        if (!current) throw new Error("Choose a preview clinic first.");
        remember(id, current);
        if (expectedVersion !== undefined && current.version !== expectedVersion) throw new Error("This calendar changed while you were editing. Refresh and try again.");
        return persist(id, change(current));
      });
    },
  };
}
