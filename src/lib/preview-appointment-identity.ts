import { hhmmToMin, type ExistingAppt } from "./slot-generation";

const sameTime = (a: ExistingAppt, b: ExistingAppt) => a.appointment_date === b.appointment_date && hhmmToMin(a.appointment_time) === hhmmToMin(b.appointment_time);

/** Busy-time rows do not have IDs. Match each visible booking at most once. */
export function identifyPreviewAppointments<T extends ExistingAppt>(busy: T[], visible: ExistingAppt[]) {
  const used = new Set<string>();
  // Reserve existing identities before assigning missing/duplicated ones.
  const ids = busy.map(a => {
    if (!a.id || used.has(a.id)) return undefined;
    used.add(a.id); return a.id;
  });
  return busy.map((a, index): T & { id: string } => {
    let id = ids[index] ?? visible.find(p => p.id && !used.has(p.id) && sameTime(a, p))?.id;
    if (!id) {
      id = `preview-busy-${index}`;
      while (used.has(id)) id += "-unmatched";
    }
    used.add(id);
    return a.id === id ? a as T & { id: string } : { ...a, id };
  });
}

export function nameScheduleAppointments<T extends ExistingAppt>(scheduled: T[], visible: ExistingAppt[]) {
  return scheduled.map(a => {
    const exact = visible.find(p => p.id && p.id === a.id);
    const sameTimePatients = visible.filter(p => sameTime(a, p));
    // A time alone cannot identify either person in an overlapping booking.
    const fallback = sameTimePatients.length === 1 && scheduled.filter(p => sameTime(a, p)).length === 1 ? sameTimePatients[0] : undefined;
    return { ...a, patient_name: (exact ?? fallback)?.patient_name ?? a.patient_name };
  });
}
