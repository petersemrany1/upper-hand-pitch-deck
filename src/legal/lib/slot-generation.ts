// Ported from the Legal app (family-law-floater/src/lib/slot-generation.ts). Re-run the port script to refresh.
// Shared slot generation used by the firm partner portal availability tab AND
// the rep booking flow. Both must agree on what's available.
// Day-of-week convention across the legal schema: 0 = Sunday … 6 = Saturday.

import { isPublicHoliday, getHolidayName } from "@/legal/data/au-public-holidays";

export type TradingHours = {
  day_of_week: number; // 0=Sun, 6=Sat
  open_time: string; // "HH:MM" or "HH:MM:SS"
  close_time: string;
  is_closed: boolean;
  consult_duration_mins: number;
  /** Fixed consult start times ("HH:MM"). When set, replaces interval slots. */
  slot_times?: string[] | null;
};

export type RecurPattern = "weekly" | "daily" | "monthly_date" | "monthly_nth_dow" | null;

export type BlockedSlot = {
  id?: string;
  date: string | null; // YYYY-MM-DD
  start_time: string; // HH:MM[:SS]
  end_time: string; // HH:MM[:SS]
  is_recurring: boolean;
  recur_day_of_week: number | null;
  recur_pattern?: RecurPattern;
  recur_days_of_week?: number[] | null; // weekly multi-day
  recur_day_of_month?: number | null; // monthly_date (1-31)
  recur_nth_week?: number | null; // monthly_nth_dow (1-4, or 5 = last)
  recur_until?: string | null; // YYYY-MM-DD optional end date
  reason?: string | null;
  excluded_dates?: string[];
};

export type ExistingAppt = {
  consultation_duration_minutes?: number | null;
  appointment_date: string;
  appointment_time: string; // "HH:MM" | "HH:MM:SS" | "9:00am"
  client_name?: string | null;
};

export type Slot = {
  time: string; // 24h HH:MM (canonical, written back to the DB)
  label: string; // "9:00am"
  available: boolean;
  blocked: boolean;
  booked: boolean;
  clientName?: string | null;
};

export const hhmmToMin = (t: string): number => {
  if (/am|pm/i.test(t)) {
    const m = /^(\d{1,2}):?(\d{2})?\s*(am|pm)/i.exec(t);
    if (!m) return Number.NaN;
    let h = parseInt(m[1]!, 10);
    const min = parseInt(m[2] ?? "0", 10);
    if (h < 1 || h > 12 || min > 59) return Number.NaN;
    const ap = m[3]!.toLowerCase();
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return h * 60 + min;
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return Number.NaN;
  const h = Number(m[1]),
    minute = Number(m[2]);
  return h <= 24 && minute <= 59 && (h < 24 || minute === 0) ? h * 60 + minute : Number.NaN;
};

export const minToHHMM = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const minToLabel = (m: number): string => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")}${ap}`;
};

/** JS Date → day_of_week with Sunday=0 (matches firm_trading_hours). */
export const dayOfWeekSunFirst = (d: Date): number => d.getDay();

export const ymdLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Does this recurring blocked-slot rule fire on the given date?
 * A null recur_pattern is treated as legacy "weekly" on recur_day_of_week.
 */
export function recurrenceMatches(b: BlockedSlot, date: Date, dow?: number): boolean {
  if (!b.is_recurring || b.excluded_dates?.includes(ymdLocal(date))) return false;
  const d = dow ?? dayOfWeekSunFirst(date);

  if (b.date && ymdLocal(date) < b.date) return false;
  if (b.recur_until && ymdLocal(date) > b.recur_until) return false;

  const pattern: RecurPattern = b.recur_pattern ?? "weekly";

  if (pattern === "daily") return true;

  if (pattern === "weekly") {
    const days =
      b.recur_days_of_week && b.recur_days_of_week.length > 0
        ? b.recur_days_of_week
        : b.recur_day_of_week != null
          ? [b.recur_day_of_week]
          : [];
    return days.includes(d);
  }

  if (pattern === "monthly_date") {
    return b.recur_day_of_month != null && date.getDate() === b.recur_day_of_month;
  }

  if (pattern === "monthly_nth_dow") {
    if (b.recur_day_of_week == null || b.recur_nth_week == null) return false;
    if (b.recur_day_of_week !== d) return false;
    const occurrence = Math.floor((date.getDate() - 1) / 7) + 1;
    if (b.recur_nth_week === 5) {
      const next = new Date(date);
      next.setDate(date.getDate() + 7);
      return next.getMonth() !== date.getMonth();
    }
    return occurrence === b.recur_nth_week;
  }

  return false;
}

export type AvailabilityOverride = {
  id?: string;
  override_date: string; // YYYY-MM-DD
  override_type: string; // 'open' | 'closed'
  start_time: string | null; // used when override_type = 'open'
  end_time: string | null;
};

/**
 * Effective trading hours for a date, applying overrides. Public holidays for the
 * firm's state close the day unless the firm added an explicit "open" override —
 * overrides always win.
 */
export function effectiveHoursFor(
  date: Date,
  tradingHours: TradingHours[],
  overrides: AvailabilityOverride[] = [],
  firmState?: string | null,
): TradingHours | null {
  const dateStr = ymdLocal(date);
  const dow = dayOfWeekSunFirst(date);
  const baseTh = tradingHours.find((t) => t.day_of_week === dow);
  const ov = overrides.find((o) => o.override_date === dateStr);

  if (ov?.override_type === "open" && ov.start_time && ov.end_time) {
    return {
      day_of_week: dow,
      open_time: ov.start_time,
      close_time: ov.end_time,
      is_closed: false,
      consult_duration_mins: baseTh?.consult_duration_mins || 60,
      slot_times: baseTh?.slot_times ?? null,
    };
  }
  if (ov?.override_type === "closed" || ov?.override_type === "blocked") {
    return baseTh ? { ...baseTh, is_closed: true } : null;
  }
  if (firmState && isPublicHoliday(dateStr, firmState)) {
    return baseTh ? { ...baseTh, is_closed: true } : null;
  }
  return baseTh ?? null;
}

/** Holiday name for UI labels, unless the firm explicitly opened that date. */
export function holidayLabelFor(
  date: Date,
  overrides: AvailabilityOverride[] = [],
  firmState?: string | null,
): string | null {
  const dateStr = ymdLocal(date);
  const ov = overrides.find((o) => o.override_date === dateStr);
  if (ov?.override_type === "open") return null;
  return getHolidayName(dateStr, firmState);
}

/**
 * How long a real consultation takes, regardless of how often we offer a new
 * start time. Legal consults run a full hour.
 */
export const CONSULT_LENGTH_MIN = 60;
export const appointmentDuration = (a: ExistingAppt): number =>
  a.consultation_duration_minutes ?? CONSULT_LENGTH_MIN;
export function blocksForDate(date: Date, blocks: BlockedSlot[]): BlockedSlot[] {
  return blocks
    .filter((b) => (b.is_recurring ? recurrenceMatches(b, date) : b.date === ymdLocal(date)))
    .map((b) => ({ ...b, start_time: b.start_time || "00:00", end_time: b.end_time || "24:00" }));
}

export function generateSlots(
  date: Date,
  tradingHours: TradingHours[],
  blockedSlots: BlockedSlot[],
  existingAppts: ExistingAppt[] = [],
  overrides: AvailabilityOverride[] = [],
  firmState?: string | null,
  minGapMins: number = 0,
  consultationMinutes: number = CONSULT_LENGTH_MIN,
): Slot[] {
  const dow = dayOfWeekSunFirst(date);
  const dateStr = ymdLocal(date);
  const th = effectiveHoursFor(date, tradingHours, overrides, firmState);
  if (!th || th.is_closed) return [];

  const openMin = hhmmToMin(th.open_time);
  const closeMin = hhmmToMin(th.close_time);
  const step = th.consult_duration_mins || 60;
  const consultLen = consultationMinutes;
  if (
    !Number.isInteger(consultLen) ||
    consultLen < 5 ||
    consultLen > 240 ||
    !Number.isInteger(minGapMins) ||
    minGapMins < 0 ||
    minGapMins > 180 ||
    !Number.isInteger(step) ||
    step < 1 ||
    !Number.isFinite(openMin) ||
    !Number.isFinite(closeMin) ||
    closeMin <= openMin
  )
    return [];
  if (
    existingAppts.some(
      (a) =>
        a.appointment_date === dateStr &&
        (!Number.isFinite(hhmmToMin(a.appointment_time)) ||
          appointmentDuration(a) < 5 ||
          appointmentDuration(a) > 240),
    )
  )
    return [];
  const gap = Math.max(0, minGapMins | 0);

  const blocks: Array<[number, number]> = [];
  for (const b of blockedSlots) {
    if (b.is_recurring) {
      if (recurrenceMatches(b, date, dow)) {
        blocks.push([
          b.start_time ? hhmmToMin(b.start_time) : 0,
          b.end_time ? hhmmToMin(b.end_time) : 1440,
        ]);
      }
    } else if (b.date === dateStr) {
      // A whole-day block has no times.
      if (!b.start_time || !b.end_time) blocks.push([openMin, closeMin]);
      else
        blocks.push([
          b.start_time ? hhmmToMin(b.start_time) : 0,
          b.end_time ? hhmmToMin(b.end_time) : 1440,
        ]);
    }
  }

  if (blocks.some(([s, e]) => !Number.isFinite(s) || !Number.isFinite(e) || e <= s)) return [];
  const apptByMin = new Map<number, string | null | undefined>();
  const apptRanges: Array<[number, number]> = [];
  const gapRanges: Array<[number, number]> = [];
  for (const a of existingAppts) {
    if (a.appointment_date !== dateStr) continue;
    const start = hhmmToMin(a.appointment_time);
    apptByMin.set(start, a.client_name);
    apptRanges.push([start, start + appointmentDuration(a)]);
    gapRanges.push([start - gap, start + appointmentDuration(a) + gap]);
  }

  // Fixed starts must still fit inside the effective hours, like database validation.
  const fixed = Array.from(new Set((th.slot_times ?? []).map((t) => hhmmToMin(String(t))))).sort(
    (a, b) => a - b,
  );
  const starts: number[] = [];
  if (fixed.length > 0)
    starts.push(
      ...fixed.filter((m) => Number.isFinite(m) && m >= openMin && m + consultLen <= closeMin),
    );
  else for (let m = openMin; m + consultLen <= closeMin; m += step) starts.push(m);

  const slots: Slot[] = [];
  for (const m of starts) {
    const slotEnd = m + consultLen;
    const blocked = blocks.some(([s, e]) => m < e && slotEnd > s);
    const overlapping = apptRanges.some(([s, e]) => m < e && slotEnd > s);
    const withinGap = !overlapping && gap > 0 && gapRanges.some(([s, e]) => m < e && slotEnd > s);
    const apptMatch = apptByMin.has(m);
    const booked = overlapping || withinGap;
    slots.push({
      time: minToHHMM(m),
      label: minToLabel(m),
      available: !blocked && !booked,
      blocked,
      booked,
      clientName: apptMatch ? (apptByMin.get(m) ?? null) : null,
    });
  }
  return slots;
}

/** Quick summary used by calendar tile colours. */
export function summarizeDay(
  date: Date,
  tradingHours: TradingHours[],
  blockedSlots: BlockedSlot[],
  existingAppts: ExistingAppt[] = [],
  overrides: AvailabilityOverride[] = [],
  firmState?: string | null,
  minGapMins: number = 0,
): {
  closed: boolean;
  allBlocked: boolean;
  someBlocked: boolean;
  total: number;
  bookedCount: number;
  openedOverride: boolean;
  holidayName: string | null;
} {
  const th = effectiveHoursFor(date, tradingHours, overrides, firmState);
  const dateStr = ymdLocal(date);
  const ov = overrides.find((o) => o.override_date === dateStr);
  const openedOverride = ov?.override_type === "open";
  const holidayName = holidayLabelFor(date, overrides, firmState);
  if (!th || th.is_closed) {
    return {
      closed: true,
      allBlocked: false,
      someBlocked: false,
      total: 0,
      bookedCount: 0,
      openedOverride: false,
      holidayName,
    };
  }
  const slots = generateSlots(
    date,
    tradingHours,
    blockedSlots,
    existingAppts,
    overrides,
    firmState,
    minGapMins,
  );
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

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
