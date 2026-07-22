// Shared slot generation utility used by the clinic portal availability tab
// AND the rep booking flow. Both must agree on what's available.

import { isPublicHoliday, getHolidayName } from "@/data/au-public-holidays";

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
/**
 * Does this recurring blocked-slot rule fire on the given date?
 * Backwards-compatible: if recur_pattern is null, treats it as legacy "weekly"
 * using recur_day_of_week.
 */
export function recurrenceMatches(b: BlockedSlot, date: Date, dow?: number): boolean {
  if (!b.is_recurring) return false;
  const d = dow ?? dayOfWeekMonFirst(date);

  // Optional end date
  if (b.recur_until) {
    const dateStr = ymdLocal(date);
    if (dateStr > b.recur_until) return false;
  }

  const pattern: RecurPattern = b.recur_pattern ?? "weekly";

  if (pattern === "daily") return true;

  if (pattern === "weekly") {
    const days = (b.recur_days_of_week && b.recur_days_of_week.length > 0)
      ? b.recur_days_of_week
      : (b.recur_day_of_week != null ? [b.recur_day_of_week] : []);
    return days.includes(d);
  }

  if (pattern === "monthly_date") {
    return b.recur_day_of_month != null && date.getDate() === b.recur_day_of_month;
  }

  if (pattern === "monthly_nth_dow") {
    if (b.recur_day_of_week == null || b.recur_nth_week == null) return false;
    if (b.recur_day_of_week !== d) return false;
    // Which occurrence of this weekday in the month is `date`?
    const occurrence = Math.floor((date.getDate() - 1) / 7) + 1;
    if (b.recur_nth_week === 5) {
      // "Last" — check there's no later same-weekday in this month
      const next = new Date(date);
      next.setDate(date.getDate() + 7);
      return next.getMonth() !== date.getMonth();
    }
    return occurrence === b.recur_nth_week;
  }

  return false;
}

export type AvailabilityOverride = {
  override_date: string;     // YYYY-MM-DD
  override_type: string;     // 'open' | 'closed' (other values ignored)
  start_time: string | null; // HH:MM[:SS] (used when override_type = 'open')
  end_time: string | null;
};

/** Returns the effective trading hours for a given date, applying any overrides.
 *  If `clinicState` is supplied and the date is a public holiday for that state,
 *  the day is treated as closed UNLESS the clinic added an explicit "open" override
 *  for that date (overrides always win — clinics can choose to open on a holiday). */
export function effectiveHoursFor(
  date: Date,
  tradingHours: TradingHours[],
  overrides: AvailabilityOverride[] = [],
  clinicState?: string | null,
): TradingHours | null {
  const dateStr = ymdLocal(date);
  const dow = dayOfWeekMonFirst(date);
  const baseTh = tradingHours.find((t) => t.day_of_week === dow);
  const ov = overrides.find((o) => o.override_date === dateStr);

  if (ov?.override_type === "open" && ov.start_time && ov.end_time) {
    return {
      day_of_week: dow,
      open_time: ov.start_time,
      close_time: ov.end_time,
      is_closed: false,
      consult_duration_mins: baseTh?.consult_duration_mins || 15,
    };
  }
  if (ov?.override_type === "closed") {
    return baseTh ? { ...baseTh, is_closed: true } : null;
  }
  // Public holiday → closed (no explicit override above means honour the holiday)
  if (clinicState && isPublicHoliday(dateStr, clinicState)) {
    return baseTh ? { ...baseTh, is_closed: true } : null;
  }
  return baseTh ?? null;
}

/** Returns the holiday name if the date is a public holiday for the clinic's state and
 *  the clinic has NOT added an explicit "open" override. Used for UI labels. */
export function holidayLabelFor(
  date: Date,
  overrides: AvailabilityOverride[] = [],
  clinicState?: string | null,
): string | null {
  const dateStr = ymdLocal(date);
  const ov = overrides.find((o) => o.override_date === dateStr);
  if (ov?.override_type === "open") return null; // overridden open
  return getHolidayName(dateStr, clinicState);
}

/** How long a real consultation actually takes, regardless of how often
 *  we offer a new start-time slot. Slot interval (e.g. every 15 min) comes
 *  from `consult_duration_mins` on trading hours; this is the true duration
 *  used for overlap math so a 9:00 booking correctly blocks 8:45 / 9:00 /
 *  9:15 (and doesn't let us offer a slot that would run past close time). */
export const CONSULT_LENGTH_MIN = 30;

export function generateSlots(
  date: Date,
  tradingHours: TradingHours[],
  blockedSlots: BlockedSlot[],
  existingAppts: ExistingAppt[] = [],
  overrides: AvailabilityOverride[] = [],
  clinicState?: string | null,
  minGapMins: number = 0,
): Slot[] {
  const dow = dayOfWeekMonFirst(date);
  const dateStr = ymdLocal(date);
  const th = effectiveHoursFor(date, tradingHours, overrides, clinicState);
  if (!th || th.is_closed) return [];

  const openMin = hhmmToMin(th.open_time);
  const closeMin = hhmmToMin(th.close_time);
  const step = th.consult_duration_mins || 15;
  const consultLen = CONSULT_LENGTH_MIN;
  const gap = Math.max(0, minGapMins | 0);

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

  // Index existing appointments for this date — both an exact-start map (for
  // showing the patient name on the "booked" chip) and a range list (for
  // overlap checks against every candidate slot). When a clinic has a
  // minimum-gap-between-appointments rule, we expand each existing appt's
  // range by `gap` minutes on each side so no new slot can start within
  // that window.
  const apptByMin = new Map<number, string | null | undefined>();
  const apptRanges: Array<[number, number]> = [];
  const gapRanges: Array<[number, number]> = [];
  for (const a of existingAppts) {
    if (a.appointment_date !== dateStr) continue;
    const start = hhmmToMin(a.appointment_time);
    apptByMin.set(start, a.patient_name);
    apptRanges.push([start, start + consultLen]);
    gapRanges.push([start - gap, start + consultLen + gap]);
  }


  const slots: Slot[] = [];
  // Only offer a starting slot whose full consult fits before close time.
  for (let m = openMin; m + consultLen <= closeMin; m += step) {
    const slotEnd = m + consultLen;
    const blocked = blocks.some(([s, e]) => m < e && slotEnd > s);
    // Any overlapping appointment counts as booked, not just an exact-start match.
    const overlapping = apptRanges.some(([s, e]) => m < e && slotEnd > s);
    // Within the min-gap window of an existing appointment — hide as unavailable,
    // but keep it visually as "booked" so the UI stays clean.
    const withinGap = !overlapping && gap > 0 && gapRanges.some(([s, e]) => m < e && slotEnd > s);
    const apptMatch = apptByMin.has(m);
    const booked = overlapping || withinGap;
    slots.push({
      time: minToHHMM(m),
      label: minToLabel(m),
      available: !blocked && !booked,
      blocked,
      booked,
      patientName: apptMatch ? apptByMin.get(m) : undefined,
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
  overrides: AvailabilityOverride[] = [],
  clinicState?: string | null,
): { closed: boolean; allBlocked: boolean; someBlocked: boolean; total: number; bookedCount: number; openedOverride: boolean; holidayName: string | null } {
  const th = effectiveHoursFor(date, tradingHours, overrides, clinicState);
  const dateStr = ymdLocal(date);
  const ov = overrides.find((o) => o.override_date === dateStr);
  const openedOverride = ov?.override_type === "open";
  const holidayName = holidayLabelFor(date, overrides, clinicState);
  if (!th || th.is_closed) return { closed: true, allBlocked: false, someBlocked: false, total: 0, bookedCount: 0, openedOverride: false, holidayName };
  const slots = generateSlots(date, tradingHours, blockedSlots, existingAppts, overrides, clinicState);
  const blockedCount = slots.filter((s) => s.blocked).length;
  const bookedCount = slots.filter((s) => s.booked).length;
  return {
    closed: false,
    allBlocked: slots.length > 0 && blockedCount === slots.length,
    someBlocked: blockedCount > 0 && blockedCount < slots.length,
    total: slots.length,
    bookedCount,
    openedOverride,
    holidayName,
  };
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
