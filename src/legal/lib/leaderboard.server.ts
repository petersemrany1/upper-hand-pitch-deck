// Ported from the Legal app (family-law-floater/src/lib/leaderboard.server.ts). Re-run the port script to refresh.
/**
 * Sales leaderboard — per-rep call and booking stats for a Sydney-local range.
 * Server only (reads across all reps with the service role; callers are
 * checked for staff access in the functions layer).
 */
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { APP_TIMEZONE } from "./timezone";

export type LeaderboardPreset =
  "today" | "yesterday" | "week" | "lastweek" | "month" | "lastmonth" | "30d";
/** A preset, or an inclusive custom span of Sydney calendar days (YYYY-MM-DD). */
export type LeaderboardRange = LeaderboardPreset | { from: string; to: string };

export type LeaderboardRow = {
  id: string;
  name: string;
  role: string;
  calls: number;
  notReached: number;
  short: number;
  convos: number;
  holdRate: number;
  conversion: number;
  bookings: number;
  deposits: number;
  workMinutes: number;
  breakMinutes: number;
  breakGaps: number;
  bonus: number;
};

export const BONUS_PER_BOOKING = 50;
const REACHED_MIN_SECS = 15;
const CONVO_MIN_SECS = 120;
const GAP_LIMIT_SECS = 1800;
const MIN_SEGMENT_SECS = 60;

/** Midnight in Sydney for the calendar day containing `d`. */
export function sydneyDayStart(d: Date): Date {
  const ymd = new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const off =
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIMEZONE, timeZoneName: "longOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+10:00";
  const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(off);
  const sign = m?.[1] ?? "+";
  const hh = String(Number(m?.[2] ?? "10")).padStart(2, "0");
  const mm = (m?.[3] ?? "00").padStart(2, "0");
  return new Date(`${ymd}T00:00:00${sign}${hh}:${mm}`);
}

/** Sydney calendar date (YYYY-MM-DD) of an instant. */
function sydneyYmd(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Sydney midnight at the start of the given calendar date. */
function sydneyDateStart(ymd: string): Date {
  // Noon UTC on that date is always inside the same Sydney calendar day.
  return sydneyDayStart(new Date(`${ymd}T12:00:00Z`));
}

export function rangeBounds(range: LeaderboardRange, now = new Date()): { from: Date; to: Date } {
  const todayStart = sydneyDayStart(now);
  const noon = new Date(todayStart.getTime() + 12 * 3600_000);
  const daysAgo = (n: number) => sydneyDayStart(new Date(noon.getTime() - n * 86_400_000));
  if (typeof range === "object") {
    const from = sydneyDateStart(range.from);
    const toStart = sydneyDateStart(range.to);
    // Inclusive of the "to" day: end at the start of the following day (or now).
    const nextDay = sydneyDayStart(new Date(toStart.getTime() + 36 * 3600_000));
    return { from, to: nextDay.getTime() > now.getTime() ? now : nextDay };
  }
  // Monday-start weeks and calendar months, all in Sydney time.
  const todayYmd = sydneyYmd(now);
  const dow = new Date(`${todayYmd}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  const thisMonday = daysAgo(sinceMonday);
  const lastMonday = daysAgo(sinceMonday + 7);
  const [yy, mm] = todayYmd.split("-").map(Number) as [number, number];
  const monthStart = sydneyDateStart(`${yy}-${String(mm).padStart(2, "0")}-01`);
  const prev = mm === 1 ? { y: yy - 1, m: 12 } : { y: yy, m: mm - 1 };
  const lastMonthStart = sydneyDateStart(`${prev.y}-${String(prev.m).padStart(2, "0")}-01`);
  switch (range) {
    case "yesterday":
      return { from: daysAgo(1), to: todayStart };
    case "week":
      return { from: thisMonday, to: now };
    case "lastweek":
      return { from: lastMonday, to: thisMonday };
    case "month":
      return { from: monthStart, to: now };
    case "lastmonth":
      return { from: lastMonthStart, to: monthStart };
    case "30d":
      return { from: daysAgo(30), to: now };
    default:
      return { from: todayStart, to: now };
  }
}

type CallRow = {
  id: string;
  rep_id: string | null;
  lead_id: string | null;
  direction: string | null;
  call_status: string | null;
  duration_seconds: number | null;
  created_at: string;
};

const FAILED = new Set(["no-answer", "busy", "failed", "canceled", "cancelled"]);
const PENDING = new Set(["ringing", "initiated", "queued", "in-progress"]);

export async function getLeaderboard(
  range: LeaderboardRange,
  now = new Date(),
): Promise<LeaderboardRow[]> {
  const { from, to } = rangeBounds(range, now);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  const { data: reps, error: repErr } = await supabaseAdmin
    .from("sales_reps")
    .select("id, name, email, role, is_active, created_at")
    .eq("is_active", true);
  if (repErr) throw new Error(repErr.message);

  // Calls — paginate; the Data API caps responses at 1000 rows.
  const calls: CallRow[] = [];
  for (let page = 0; page < 60; page++) {
    const { data, error } = await supabaseAdmin
      .from("call_records")
      .select("id, rep_id, lead_id, direction, call_status, duration_seconds, created_at")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as CallRow[];
    calls.push(...chunk.filter((c) => (c.direction ?? "outbound") !== "inbound"));
    if (chunk.length < 1000) break;
  }

  // Bookings = appointments created in the period (booking time, not the appointment date).
  const { data: appts, error: apptErr } = await supabaseAdmin
    .from("firm_appointments")
    .select("id, lead_id, status, created_at")
    .neq("status", "cancelled")
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  if (apptErr) throw new Error(apptErr.message);

  // Deposits paid in the period (a stricter "real booking" signal).
  const { data: deposits, error: depErr } = await supabaseAdmin
    .from("client_leads")
    .select("id, rep_id, deposit_paid_at")
    .gte("deposit_paid_at", fromIso)
    .lte("deposit_paid_at", toIso);
  if (depErr) throw new Error(depErr.message);

  const leadIds = Array.from(
    new Set(
      [
        ...calls.map((c) => c.lead_id),
        ...(appts ?? []).map((a) => a.lead_id),
        ...(deposits ?? []).map((d) => d.id),
      ].filter((x): x is string => Boolean(x)),
    ),
  );
  const leads: {
    id: string;
    rep_id: string | null;
    first_name: string | null;
    last_name: string | null;
  }[] = [];
  for (let i = 0; i < leadIds.length; i += 500) {
    const { data } = await supabaseAdmin
      .from("client_leads")
      .select("id, rep_id, first_name, last_name")
      .in("id", leadIds.slice(i, i + 500));
    leads.push(...(data ?? []));
  }
  const isTest = (l: { first_name: string | null; last_name: string | null }) =>
    /\btest\b/i.test(`${l.first_name ?? ""} ${l.last_name ?? ""}`);
  const excluded = new Set(leads.filter(isTest).map((l) => l.id));
  const leadOwner = new Map(leads.map((l) => [l.id, l.rep_id]));

  const knownReps = new Set((reps ?? []).map((r) => r.id));
  // Rep who made each call, plus per-lead call history for booking attribution.
  const leadCalls = new Map<string, { repId: string; at: number }[]>();
  for (const c of calls) {
    if (c.rep_id && c.lead_id && knownReps.has(c.rep_id)) {
      const list = leadCalls.get(c.lead_id) ?? [];
      list.push({ repId: c.rep_id, at: new Date(c.created_at).getTime() });
      leadCalls.set(c.lead_id, list);
    }
  }
  const repForCall = (c: CallRow): string | null => {
    if (c.rep_id && knownReps.has(c.rep_id)) return c.rep_id;
    // Twilio's duplicate row for the same dial can miss rep_id; borrow from a sibling call.
    const sib = c.lead_id ? leadCalls.get(c.lead_id) : undefined;
    return sib?.[sib.length - 1]?.repId ?? null;
  };
  const repForLead = (leadId: string, at: string | null): string | null => {
    const events = leadCalls.get(leadId) ?? [];
    if (events.length) {
      const t = at ? new Date(at).getTime() : Number.POSITIVE_INFINITY;
      const before = events.filter((e) => e.at <= t).sort((a, b) => b.at - a.at);
      const caller = before[0]?.repId ?? events[events.length - 1]?.repId;
      if (caller) return caller;
    }
    const owner = leadOwner.get(leadId);
    return owner && knownReps.has(owner) ? owner : null;
  };

  const blank = () => ({
    calls: 0,
    connected: 0,
    notReached: 0,
    short: 0,
    convos: 0,
    bookings: 0,
    deposits: 0,
    workSecs: 0,
    breakSecs: 0,
    breakGaps: 0,
  });
  const byRep = new Map<string, ReturnType<typeof blank>>();
  for (const r of reps ?? []) byRep.set(r.id, blank());
  const stat = (id: string) => {
    const s = byRep.get(id) ?? blank();
    byRep.set(id, s);
    return s;
  };

  // One "call" per rep+lead: classify on the best attempt.
  const perRepLead = new Map<string, Map<string, { maxDur: number; reached: boolean }>>();
  const timeline = new Map<string, { start: number; end: number }[]>();
  for (const c of calls) {
    if (c.lead_id && excluded.has(c.lead_id)) continue;
    const status = (c.call_status ?? "").toLowerCase();
    if (PENDING.has(status)) continue;
    const repId = repForCall(c);
    if (!repId) continue;
    const dur = c.duration_seconds ?? 0;
    const reached = !FAILED.has(status) && dur >= REACHED_MIN_SECS;
    const key = c.lead_id ?? c.id;
    const inner = perRepLead.get(repId) ?? new Map();
    const cur = inner.get(key) ?? { maxDur: 0, reached: false };
    cur.maxDur = Math.max(cur.maxDur, dur);
    cur.reached = cur.reached || reached;
    inner.set(key, cur);
    perRepLead.set(repId, inner);
    const start = new Date(c.created_at).getTime();
    (timeline.get(repId) ?? timeline.set(repId, []).get(repId)!).push({
      start,
      end: start + Math.max(dur, 0) * 1000,
    });
  }
  for (const [repId, byLead] of perRepLead) {
    const s = stat(repId);
    for (const { maxDur, reached } of byLead.values()) {
      s.calls += 1;
      if (!reached) s.notReached += 1;
      else {
        s.connected += 1;
        if (maxDur < CONVO_MIN_SECS) s.short += 1;
        else s.convos += 1;
      }
    }
  }
  // Break = idle gaps under 30 min between calls; Work = active segments (split on 30 min+ gaps).
  for (const [repId, list] of timeline) {
    list.sort((a, b) => a.start - b.start);
    const s = stat(repId);
    let segStart = list[0]!.start,
      segEnd = list[0]!.end,
      work = 0;
    for (let i = 1; i < list.length; i++) {
      const gap = (list[i]!.start - segEnd) / 1000;
      if (gap > 0 && gap < GAP_LIMIT_SECS) {
        s.breakSecs += gap;
        s.breakGaps += 1;
      }
      if (gap < GAP_LIMIT_SECS) segEnd = Math.max(segEnd, list[i]!.end);
      else {
        work += Math.max((segEnd - segStart) / 1000, MIN_SEGMENT_SECS);
        segStart = list[i]!.start;
        segEnd = list[i]!.end;
      }
    }
    work += Math.max((segEnd - segStart) / 1000, MIN_SEGMENT_SECS);
    s.workSecs = work;
  }

  const bookedLeads = new Map<string, string | null>();
  for (const a of appts ?? []) if (a.lead_id) bookedLeads.set(a.lead_id, a.created_at);
  for (const [leadId, at] of bookedLeads) {
    if (excluded.has(leadId)) continue;
    const repId = repForLead(leadId, at);
    if (repId) stat(repId).bookings += 1;
  }
  for (const d of deposits ?? []) {
    if (excluded.has(d.id)) continue;
    const repId = repForLead(d.id, d.deposit_paid_at);
    if (repId) stat(repId).deposits += 1;
  }

  // Dedupe reps by email (re-invited reps can leave two rows).
  const seen = new Set<string>();
  const rows: LeaderboardRow[] = [];
  for (const r of reps ?? []) {
    const e = (r.email ?? "").trim().toLowerCase();
    if (e) {
      if (seen.has(e)) continue;
      seen.add(e);
    }
    const s = byRep.get(r.id) ?? blank();
    const holdRate = s.connected > 0 ? Math.round((s.convos / s.connected) * 100) : 0;
    const conversion = s.convos > 0 ? Math.round((s.bookings / s.convos) * 100) : 0;
    rows.push({
      id: r.id,
      name: r.name ?? r.email ?? "Rep",
      role: r.role,
      calls: s.calls,
      notReached: s.notReached,
      short: s.short,
      convos: s.convos,
      holdRate,
      conversion,
      bookings: s.bookings,
      deposits: s.deposits,
      workMinutes: Math.round(s.workSecs / 60),
      breakMinutes: Math.round(s.breakSecs / 60),
      breakGaps: s.breakGaps,
      bonus: s.bookings * BONUS_PER_BOOKING,
    });
  }
  return rows.sort((a, b) => b.bookings - a.bookings || b.convos - a.convos || b.calls - a.calls);
}
