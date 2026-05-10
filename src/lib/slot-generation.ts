// Shared slot generation utility used by the clinic portal availability tab
// AND the rep booking flow. Both must agree on what's available.

export type TradingHours = {
  day_of_week: number; // 0=Mon, 6=Sun
  open_time: string;   // "HH:MM" or "HH:MM:SS"
  close_time: string;
  is_closed: boolean;
  consult_duration_mins: number;
};

export type RecurPattern = "weekly" | "daily" | "monthly_date" | "monthly_nth_dow" | null;

export type BlockedSlot = {
  id?: string;
  slot_date: string | null;     // YYYY-MM-DD
  slot_start: string;            // HH:MM[:SS]
  slot_end: string;              // HH:MM[:SS]
  is_recurring: boolean;
  recur_day_of_week: number | null;
  recur_pattern?: RecurPattern;
  recur_days_of_week?: number[] | null; // for weekly multi-day
  recur_day_of_month?: number | null;   // for monthly_date (1-31)
  recur_nth_week?: number | null;       // for monthly_nth_dow (1-4, or 5 = last)
  recur_until?: string | null;          // YYYY-MM-DD optional end date
};

export type ExistingAppt = {
  appointment_date: string;
  appointment_time: string; // "HH:MM" or "HH:MM:SS" or "9:00am"
  patient_name?: string | null;
};

export type Slot = {
  time: string;          // 24h HH:MM (canonical, used to write back)
  label: string;         // "9:00am"
  available: boolean;
  blocked: boolean;
  booked: boolean;
  patientName?: string | null;
};

const hhmmToMin = (t: string): number => {
  // accepts "9:00am" or "13:30" or "13:30:00"
  if (/am|pm/i.test(t)) {
    const m = /^(\d{1,2}):(\d{2})\s*(am|pm)/i.exec(t);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h * 60 + min;
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const minToHHMM = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const minToLabel = (m: number): string => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")}${ap}`;
};

/** Convert a JS Date to day_of_week with Monday=0, Sunday=6 */
export const dayOfWeekMonFirst = (d: Date): number => (d.getDay() + 6) % 7;

export const ymdLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Generate all slots for a given date based on trading hours, blocked slots,
 * and existing appointments. Returns ALL slots in the day with metadata —
 * filter by `.available` for the booking flow.
 */
export function generateSlots(
  date: Date,
  tradingHours: TradingHours[],
  blockedSlots: BlockedSlot[],
  existingAppts: ExistingAppt[] = [],
): Slot[] {
  const dow = dayOfWeekMonFirst(date);
  const dateStr = ymdLocal(date);
  const th = tradingHours.find((t) => t.day_of_week === dow);
  if (!th || th.is_closed) return [];

  const openMin = hhmmToMin(th.open_time);
  const closeMin = hhmmToMin(th.close_time);
  const step = th.consult_duration_mins || 30;

  // Build set of blocked minute-ranges that apply to this date
  const blocks: Array<[number, number]> = [];
  for (const b of blockedSlots) {
    if (b.is_recurring) {
      if (recurrenceMatches(b, date, dow)) {
        blocks.push([hhmmToMin(b.slot_start), hhmmToMin(b.slot_end)]);
      }
    } else if (b.slot_date === dateStr) {
      blocks.push([hhmmToMin(b.slot_start), hhmmToMin(b.slot_end)]);
    }
  }

  // Index existing appointments for this date
  const apptByMin = new Map<number, string | null | undefined>();
  for (const a of existingAppts) {
    if (a.appointment_date !== dateStr) continue;
    apptByMin.set(hhmmToMin(a.appointment_time), a.patient_name);
  }

  const slots: Slot[] = [];
  for (let m = openMin; m + step <= closeMin; m += step) {
    const slotEnd = m + step;
    const blocked = blocks.some(([s, e]) => m < e && slotEnd > s);
    const apptMatch = apptByMin.has(m);
    const booked = apptMatch;
    slots.push({
      time: minToHHMM(m),
      label: minToLabel(m),
      available: !blocked && !booked,
      blocked,
      booked,
      patientName: booked ? apptByMin.get(m) : undefined,
    });
  }
  return slots;
}

/** Quick summary used by the calendar tile colours. */
export function summarizeDay(
  date: Date,
  tradingHours: TradingHours[],
  blockedSlots: BlockedSlot[],
  existingAppts: ExistingAppt[] = [],
): { closed: boolean; allBlocked: boolean; someBlocked: boolean; total: number; bookedCount: number } {
  const dow = dayOfWeekMonFirst(date);
  const th = tradingHours.find((t) => t.day_of_week === dow);
  if (!th || th.is_closed) return { closed: true, allBlocked: false, someBlocked: false, total: 0, bookedCount: 0 };
  const slots = generateSlots(date, tradingHours, blockedSlots, existingAppts);
  const blockedCount = slots.filter((s) => s.blocked).length;
  const bookedCount = slots.filter((s) => s.booked).length;
  return {
    closed: false,
    allBlocked: slots.length > 0 && blockedCount === slots.length,
    someBlocked: blockedCount > 0 && blockedCount < slots.length,
    total: slots.length,
    bookedCount,
  };
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
