import type { ClinicSchedule } from "./clinic-schedule";

type StorageAccess = () => Pick<Storage, "getItem" | "setItem"> | undefined;
const keyFor = (id: string) => `clinic-calendar-approval:v1:${id}`;

/** Tab-scoped approval data survives reloads without changing live bookings. */
export function createPreviewScheduleStore(storage: StorageAccess) {
  const schedules = new Map<string, ClinicSchedule>();
  return {
    get: (id: string) => schedules.get(id),
    seed(schedule: ClinicSchedule) {
      if (schedules.has(schedule.clinic_id)) return schedules.get(schedule.clinic_id)!;
      let restored: ClinicSchedule | undefined;
      try {
        const raw = storage()?.getItem(keyFor(schedule.clinic_id));
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.clinic_id === schedule.clinic_id && typeof saved.version === "string"
          && Number.isInteger(saved.consultation_minutes) && saved.consultation_minutes >= 5 && saved.consultation_minutes <= 240
          && Number.isInteger(saved.buffer_minutes) && saved.buffer_minutes >= 0 && saved.buffer_minutes <= 180
          && [saved.trading, saved.blocks, saved.overrides, saved.appointments].every(Array.isArray)) restored = saved;
      } catch { /* An unreadable draft must not stop the calendar from loading. */ }
      const result = restored ?? structuredClone(schedule);
      schedules.set(schedule.clinic_id, result);
      return result;
    },
    set(id: string, schedule: ClinicSchedule) {
      // Persist first: never report a successful save that a reload would lose.
      try { storage()?.setItem(keyFor(id), JSON.stringify(schedule)); }
      catch { throw new Error("This browser could not save your preview changes. Allow site storage and try again."); }
      schedules.set(id, schedule);
    },
  };
}
