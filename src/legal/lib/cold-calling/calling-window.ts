// Ported from the Legal app (family-law-floater/src/lib/cold-calling/calling-window.ts). Re-run the port script to refresh.
// Calling-time safeguards evaluated in the PROSPECT's timezone. Pure functions
// so they can be unit-tested across DST boundaries and every state.
import { isPublicHoliday, normaliseState, type AuState } from "@/legal/data/au-public-holidays";

import {
  LEGAL_MAX_WINDOWS,
  type CallingWindows,
  type ColdCallingSettings,
  type WindowSlot,
} from "./settings";

export const STATE_TIMEZONES: Record<AuState, string> = {
  NSW: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  WA: "Australia/Perth",
  SA: "Australia/Adelaide",
  TAS: "Australia/Hobart",
  ACT: "Australia/Sydney",
  NT: "Australia/Darwin",
};

export function timezoneForState(state: string | null | undefined): string | null {
  const code = normaliseState(state);
  return code ? STATE_TIMEZONES[code] : null;
}

export type LocalParts = {
  dateISO: string; // YYYY-MM-DD in the zone
  weekday: number; // 0 = Sunday
  hh: number;
  mm: number;
  hhmm: string;
};

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function localParts(at: Date, timeZone: string): LocalParts {
  const parts = formatter(timeZone).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hh = Number(get("hour")) % 24;
  const mm = Number(get("minute"));
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAYS.indexOf(get("weekday").slice(0, 3)),
    hh,
    mm,
    hhmm: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
  };
}

/** UTC offset (minutes) of a zone at an instant — needed to build zoned instants. */
function offsetMinutes(at: Date, timeZone: string): number {
  const p = localParts(at, timeZone);
  const asUtc = Date.UTC(
    Number(p.dateISO.slice(0, 4)),
    Number(p.dateISO.slice(5, 7)) - 1,
    Number(p.dateISO.slice(8, 10)),
    p.hh,
    p.mm,
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** The instant for a wall-clock date+time in a zone (DST-aware, two-pass). */
export function zonedInstant(dateISO: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number) as [number, number, number];
  const [hh, mm] = hhmm.split(":").map(Number) as [number, number];
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60000);
  guess = new Date(naive - offsetMinutes(guess, timeZone) * 60000);
  return guess;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayOfISO(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function slotsForDay(windows: CallingWindows, weekday: number): WindowSlot[] {
  if (weekday === 0) return windows.sunday;
  if (weekday === 6) return windows.saturday;
  return windows.weekday;
}

export function isBusinessDay(dateISO: string, state: string | null | undefined): boolean {
  const wd = weekdayOfISO(dateISO);
  if (wd === 0 || wd === 6) return false;
  return !isPublicHoliday(dateISO, state);
}

export function addBusinessDays(
  dateISO: string,
  n: number,
  state: string | null | undefined,
): string {
  let current = dateISO;
  let remaining = n;
  while (remaining > 0) {
    current = addDaysISO(current, 1);
    if (isBusinessDay(current, state)) remaining -= 1;
  }
  return current;
}

export type WindowVerdict = {
  allowed: boolean;
  reason: string | null;
  timezone: string | null;
  localTime: string; // "Tue 10:42"
  nextOpenAt: Date | null;
  legalOnly: boolean; // true when blocked only by the operational schedule, not the law
};

function inSlots(hhmm: string, slots: WindowSlot[]): boolean {
  return slots.some((s) => hhmm >= s.start && hhmm < s.end);
}

/**
 * The next instant calling becomes permitted at or after `from`, scanning up to
 * 60 days. Null when no window exists (e.g. every slot removed).
 */
export function nextOpenAt(
  from: Date,
  state: string | null | undefined,
  windows: CallingWindows,
): Date | null {
  const timeZone = timezoneForState(state);
  if (!timeZone) return null;
  const start = localParts(from, timeZone);
  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const dateISO = addDaysISO(start.dateISO, dayOffset);
    const wd = weekdayOfISO(dateISO);
    if (isPublicHoliday(dateISO, state)) continue;
    const slots = [...slotsForDay(windows, wd)].sort((a, b) => a.start.localeCompare(b.start));
    for (const slot of slots) {
      const slotStart = zonedInstant(dateISO, slot.start, timeZone);
      const slotEnd = zonedInstant(dateISO, slot.end, timeZone);
      if (from < slotEnd) return from >= slotStart ? from : slotStart;
    }
  }
  return null;
}

/** Is calling this prospect permitted right now? */
export function evaluateCallingWindow(
  now: Date,
  state: string | null | undefined,
  settings: Pick<ColdCallingSettings, "calling_windows" | "compliance_override">,
): WindowVerdict {
  const timeZone = timezoneForState(state);
  if (!timeZone) {
    return {
      allowed: false,
      reason:
        "The firm's state is not verified, so its local time is unknown. Set the state on the profile first.",
      timezone: null,
      localTime: "—",
      nextOpenAt: null,
      legalOnly: false,
    };
  }
  const p = localParts(now, timeZone);
  const localTime = `${WEEKDAYS[p.weekday]} ${p.hhmm}`;
  const holiday = isPublicHoliday(p.dateISO, state);
  const override = settings.compliance_override?.enabled === true;

  // Legal ceiling first — never bypassed without an explicit override.
  const legalSlots = slotsForDay(LEGAL_MAX_WINDOWS, p.weekday);
  const legallyOpen = !holiday && inSlots(p.hhmm, legalSlots);
  const operationalSlots = slotsForDay(settings.calling_windows, p.weekday);
  const operationallyOpen = !holiday && inSlots(p.hhmm, operationalSlots);

  if (!legallyOpen && !override) {
    const why = holiday
      ? `Public holiday in ${normaliseState(state) ?? "the firm's state"} — calls are blocked today.`
      : p.weekday === 0
        ? "Sunday — telemarketing calls are prohibited."
        : `Outside the legal calling hours (${legalSlots.map((s) => `${s.start}–${s.end}`).join(", ") || "none"}) at the firm's local time ${localTime}.`;
    return {
      allowed: false,
      reason: why,
      timezone: timeZone,
      localTime,
      nextOpenAt: nextOpenAt(now, state, settings.calling_windows),
      legalOnly: false,
    };
  }
  if (!operationallyOpen) {
    const list = operationalSlots.map((s) => `${s.start}–${s.end}`).join(", ") || "no slots";
    return {
      allowed: false,
      reason: holiday
        ? `Public holiday in ${normaliseState(state) ?? "the firm's state"} — calls are blocked today.`
        : `Outside the calling schedule (${list}) at the firm's local time ${localTime}.`,
      timezone: timeZone,
      localTime,
      nextOpenAt: nextOpenAt(now, state, settings.calling_windows),
      legalOnly: true,
    };
  }
  return {
    allowed: true,
    reason: null,
    timezone: timeZone,
    localTime,
    nextOpenAt: now,
    legalOnly: false,
  };
}

/**
 * When to retry after an unsuccessful attempt.
 * offsets[i] applies after the (i+1)th unsuccessful attempt; beyond the list the
 * prospect is exhausted. Offset 0 = the next permitted session strictly after
 * the current one (this afternoon, else the next business day).
 */
export function scheduleRetry(
  now: Date,
  unsuccessfulAttempts: number,
  state: string | null | undefined,
  settings: Pick<ColdCallingSettings, "calling_windows" | "retry_policy">,
): { followUpAt: Date | null; exhausted: boolean } {
  const offsets = settings.retry_policy.offsets_business_days;
  const index = unsuccessfulAttempts - 1;
  if (index < 0) return { followUpAt: null, exhausted: false };
  if (index >= offsets.length) return { followUpAt: null, exhausted: true };
  const offset = offsets[index] ?? 0;
  const timeZone = timezoneForState(state);
  if (!timeZone) return { followUpAt: null, exhausted: false };
  const p = localParts(now, timeZone);

  if (offset === 0) {
    // Find the end of the slot we are in (or the last slot that has passed),
    // then the first slot start strictly after it.
    const todaySlots = [...slotsForDay(settings.calling_windows, p.weekday)].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    const current = todaySlots.find((s) => p.hhmm >= s.start && p.hhmm < s.end);
    const boundary = current ? current.end : p.hhmm;
    const later = todaySlots.find((s) => s !== current && s.start >= boundary);
    if (later && isBusinessDay(p.dateISO, state)) {
      return { followUpAt: zonedInstant(p.dateISO, later.start, timeZone), exhausted: false };
    }
    const nextDay = addBusinessDays(p.dateISO, 1, state);
    return {
      followUpAt: firstSlotStart(nextDay, state, settings.calling_windows, timeZone),
      exhausted: false,
    };
  }
  const target = addBusinessDays(p.dateISO, offset, state);
  return {
    followUpAt: firstSlotStart(target, state, settings.calling_windows, timeZone),
    exhausted: false,
  };
}

function firstSlotStart(
  dateISO: string,
  state: string | null | undefined,
  windows: CallingWindows,
  timeZone: string,
): Date | null {
  // Walk forward until a day with at least one slot.
  for (let i = 0; i < 30; i += 1) {
    const day = addDaysISO(dateISO, i);
    if (!isBusinessDay(day, state)) continue;
    const slots = [...slotsForDay(windows, weekdayOfISO(day))].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    const first = slots[0];
    if (first) return zonedInstant(day, first.start, timeZone);
  }
  return null;
}

/** "10:42 am AEST" style local time label for the caller screen. */
export function formatLocalTime(at: Date, timeZone: string | null): string {
  if (!timeZone) return "Unknown (state not verified)";
  return at.toLocaleTimeString("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Earliest local hour a firm should be called. Leads whose local time is before this are held back. */
export const EARLIEST_LOCAL_HOUR = 9;

/** Is it at least 9:00 am at the firm right now? Unknown state → treated as not yet open. */
export function isFirmOpenNow(state: string | null | undefined, now: Date = new Date()): boolean {
  const tz = timezoneForState(state);
  if (!tz) return false;
  const p = localParts(now, tz);
  return p.hh >= EARLIEST_LOCAL_HOUR;
}
