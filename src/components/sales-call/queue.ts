import { type StatusKey, isRetiredRawStatus, isReturningLead, normaliseStatus } from "./status";

// ---------------------------------------------------------------------------
// Session queue rules (pure — no React, no Supabase — so they can be tested).
//
// Order: NEW (never called, newest first)
//      → NO ANSWER (fewest attempts first, then leads last tried in the other
//        half of the day, then newest first)
//      → THE REST (chase-ups, expired callbacks, anything else; newest first)
//
// Every lead is served at most once per day, except leads in their first
// YOUNG_LEAD_DAYS since first call, which get one turn before noon and one
// after. Scheduled callbacks are NOT part of this queue: they surface at
// their time via dueCallbackIds() and expire CALLBACK_WINDOW_MS later.
// ---------------------------------------------------------------------------

export type QueueLead = {
  id: string;
  status: string | null;
  created_at: string;
  callback_scheduled_at: string | null;
  booking_date?: string | null;
  lead_class?: string | null;
};

export type CallHistory = {
  /** All-time dial attempts. */
  attempts: number;
  firstCallAt: string | null;
  lastAttemptAt: string | null;
  /** Attempts so far today (local time). */
  todayAttempts: number;
  todayFirstAttemptAt: string | null;
  todayLastAttemptAt: string | null;
};

export type HistoryMap = Record<string, CallHistory | undefined>;

export const YOUNG_LEAD_DAYS = 14;
export const NOON_HOUR = 12;
export const CALLBACK_WINDOW_MS = 60 * 60 * 1000;

const EMPTY: CallHistory = { attempts: 0, firstCallAt: null, lastAttemptAt: null, todayAttempts: 0, todayFirstAttemptAt: null, todayLastAttemptAt: null };
/** A sitting is up to two dials (call, no answer, call straight back). */
export const DIALS_PER_SITTING = 2;

export const historyFor = (h: HistoryMap, id: string): CallHistory => h[id] ?? EMPTY;

const ms = (iso: string | null | undefined): number => {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
};

const isAfternoon = (d: Date) => d.getHours() >= NOON_HOUR;

/** Statuses that never enter the queue. */
const NEVER_CALLED: ReadonlySet<StatusKey> = new Set<StatusKey>([
  "not_interested",
  "booked_deposit_paid",
  "booked_no_deposit",
  "had_convo_no_sale",
  "dropped",
]);

export function isExcluded(l: QueueLead, now: Date = new Date()): boolean {
  if (isRetiredRawStatus(l.status)) return true;
  if (isReturningLead(l.lead_class)) return true;
  // A booking in the diary locks the lead out, whatever its status says.
  if (l.booking_date) {
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const b = new Date(`${String(l.booking_date).slice(0, 10)}T00:00:00`);
    if (Number.isFinite(b.getTime()) && b.getTime() >= today.getTime()) return true;
  }
  return NEVER_CALLED.has(normaliseStatus(l.status, l));
}

/** Within the first YOUNG_LEAD_DAYS of being called (or never called yet). */
export function isYoungLead(h: CallHistory, now: Date): boolean {
  const first = ms(h.firstCallAt);
  if (!Number.isFinite(first)) return true;
  const a = new Date(first); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  const days = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
  return days <= YOUNG_LEAD_DAYS;
}

/**
 * Has this lead had its turn(s) for today? One sitting a day for everyone;
 * a young lead whose sitting was before noon gets a second sitting after
 * noon. A sitting is up to DIALS_PER_SITTING dials, so the morning's
 * call-and-call-back doesn't use up the afternoon.
 */
export function isDueToday(h: CallHistory, now: Date): boolean {
  if (h.todayAttempts === 0) return true;
  if (h.todayAttempts > DIALS_PER_SITTING) return false;
  if (!isYoungLead(h, now)) return false;
  const last = ms(h.todayLastAttemptAt ?? h.todayFirstAttemptAt);
  if (!Number.isFinite(last)) return false;
  return !isAfternoon(new Date(last)) && isAfternoon(now);
}

/** A scheduled callback that is live right now: at its time, up to an hour after. */
export function callbackWindow(l: QueueLead, now: Date): "future" | "live" | "expired" | "none" {
  const t = ms(l.callback_scheduled_at);
  if (!Number.isFinite(t)) return "none";
  const n = now.getTime();
  if (n < t) return "future";
  if (n <= t + CALLBACK_WINDOW_MS) return "live";
  return "expired";
}

/**
 * Callbacks that should be put in front of the rep right now, earliest
 * first. A callback already actioned (a dial at or after its time) is done.
 */
export function dueCallbackIds<L extends QueueLead>(leads: L[], history: HistoryMap, now: Date, isPaused: (l: L) => boolean = () => false): string[] {
  return leads
    .filter((l) => !isExcluded(l, now) && !isPaused(l))
    .filter((l) => callbackWindow(l, now) === "live")
    .filter((l) => {
      const last = ms(historyFor(history, l.id).lastAttemptAt);
      const t = ms(l.callback_scheduled_at);
      return !(Number.isFinite(last) && last >= t);
    })
    .sort((a, b) => ms(a.callback_scheduled_at) - ms(b.callback_scheduled_at))
    .map((l) => l.id);
}

export type QueueGroup = "new" | "no_answer" | "rest";

export type BuiltQueue = {
  /** Ordered lead ids to serve. */
  order: string[];
  group: Record<string, QueueGroup>;
};

export function groupFor(l: QueueLead, h: CallHistory): QueueGroup {
  const s = normaliseStatus(l.status, l);
  if (s === "new" && h.attempts === 0) return "new";
  if (s === "no_answer" || (s === "new" && h.attempts > 0)) return "no_answer";
  return "rest";
}

export function buildQueue<L extends QueueLead>(input: {
  leads: L[];
  history: HistoryMap;
  now: Date;
  isPaused?: (l: L) => boolean;
  isPriority?: (l: L) => boolean;
}): BuiltQueue {
  const { leads, history, now } = input;
  const isPaused: (l: L) => boolean = input.isPaused ?? (() => false);
  const isPriority: (l: L) => boolean = input.isPriority ?? (() => false);
  const afternoon = isAfternoon(now);

  const eligible = leads.filter((l) => {
    if (isPaused(l) || isExcluded(l, now)) return false;
    // A scheduled callback that hasn't expired is served by dueCallbackIds().
    const w = callbackWindow(l, now);
    if (w === "future" || w === "live") return false;
    return isDueToday(historyFor(history, l.id), now);
  });

  const created = (l: L) => ms(l.created_at) || 0;
  const newest = (a: L, b: L) => created(b) - created(a);

  const groups: Record<QueueGroup, L[]> = { new: [], no_answer: [], rest: [] };
  const group: Record<string, QueueGroup> = {};
  for (const l of eligible) {
    const g = groupFor(l, historyFor(history, l.id));
    groups[g].push(l);
    group[l.id] = g;
  }

  groups.new.sort(newest);
  groups.no_answer.sort((a, b) => {
    const ha = historyFor(history, a.id);
    const hb = historyFor(history, b.id);
    if (ha.attempts !== hb.attempts) return ha.attempts - hb.attempts;
    // Rotate time of day: if it's the afternoon, leads last tried in the
    // morning go first (and vice versa) so nobody is only ever tried at 10am.
    const ra = otherHalfOfDay(ha, afternoon) ? 0 : 1;
    const rb = otherHalfOfDay(hb, afternoon) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return newest(a, b);
  });
  groups.rest.sort(newest);

  const ordered = [...groups.new, ...groups.no_answer, ...groups.rest];
  // Priority city floats to the front, keeping the group order within it.
  const order = [...ordered.filter(isPriority), ...ordered.filter((l) => !isPriority(l))].map((l) => l.id);
  return { order, group };
}

function otherHalfOfDay(h: CallHistory, afternoonNow: boolean): boolean {
  const last = ms(h.lastAttemptAt);
  if (!Number.isFinite(last)) return true; // never tried: no bias
  return isAfternoon(new Date(last)) !== afternoonNow;
}

/**
 * Builds the per-lead history the queue needs from raw call rows.
 * `allCalls` is every call for the loaded leads (oldest first is fine);
 * `now` decides what "today" means (local time).
 */
export function buildHistory(
  allCalls: { lead_id: string | null; called_at: string | null }[],
  now: Date,
): HistoryMap {
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const out: Record<string, CallHistory> = {};
  for (const row of allCalls) {
    if (!row.lead_id || !row.called_at) continue;
    const t = ms(row.called_at);
    if (!Number.isFinite(t)) continue;
    const h = out[row.lead_id] ?? { ...EMPTY };
    h.attempts += 1;
    if (!h.firstCallAt || t < ms(h.firstCallAt)) h.firstCallAt = row.called_at;
    if (!h.lastAttemptAt || t > ms(h.lastAttemptAt)) h.lastAttemptAt = row.called_at;
    if (t >= dayStart.getTime()) {
      h.todayAttempts += 1;
      if (!h.todayFirstAttemptAt || t < ms(h.todayFirstAttemptAt)) h.todayFirstAttemptAt = row.called_at;
      if (!h.todayLastAttemptAt || t > ms(h.todayLastAttemptAt)) h.todayLastAttemptAt = row.called_at;
    }
    out[row.lead_id] = h;
  }
  return out;
}
