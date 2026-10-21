import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildHistory, type HistoryMap } from "./queue";

type CallRow = {
  id: string;
  lead_id: string | null;
  called_at: string | null;
  direction: string | null;
  outcome?: string | null;
  status?: string | null;
};

type Db = Pick<SupabaseClient<Database>, "from">;
const LEADS_PER_BATCH = 100;
const PAGE_SIZE = 1000;
const HISTORY_TTL_MS = 5 * 60 * 1000;

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Actual team dials, never clamped to a suggested daily target. */
export function callAttemptsLabel(day: number, count: number | undefined) {
  return count === undefined ? "Call attempts unavailable"
    : `Day ${day} · ${count} call attempt${count === 1 ? "" : "s"} today · All reps`;
}

/** Keep URLs bounded and read every page; even three days can exceed the API's row cap. */
async function fetchCalls(db: Db, leadIds: string[], since: string, recent: boolean, signal: AbortSignal) {
  const rows: CallRow[] = [];
  // At most three batches in flight so a shared-pool refresh doesn't flood the DB.
  for (let start = 0; start < leadIds.length; start += LEADS_PER_BATCH * 3) {
    const batches = Array.from({ length: 3 }, (_, i) =>
      leadIds.slice(start + i * LEADS_PER_BATCH, start + (i + 1) * LEADS_PER_BATCH),
    ).filter((ids) => ids.length > 0);
    const results = await Promise.all(batches.map(async (ids) => {
      const batch: CallRow[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        signal.throwIfAborted();
        let query = db.from("call_records")
          .select("id, lead_id, called_at, direction, outcome, status")
          .in("lead_id", ids);
        query = recent ? query.gte("called_at", since) : query.lt("called_at", since);
        const { data, error } = await query
          .order("called_at", { ascending: true }).order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1).abortSignal(signal);
        if (error) throw error;
        batch.push(...(data ?? []));
        if ((data?.length ?? 0) < PAGE_SIZE) return batch;
      }
    }));
    for (const batch of results) rows.push(...batch);
  }
  return rows;
}

export function summarizeCallHistory(leadIds: string[], rows: CallRow[], now: Date) {
  const history: HistoryMap = buildHistory(rows, now);
  const empty = { attempts: 0, firstCallAt: null, lastAttemptAt: null, todayAttempts: 0, todayFirstAttemptAt: null, todayLastAttemptAt: null };
  const counts: Record<string, number> = {};
  const firsts: Record<string, string> = {};
  const byDay: Record<string, Record<string, { count: number; lastOutcome: string | null }>> = {};
  // An explicit zero means successfully loaded with no dials; missing means unknown.
  for (const id of leadIds) {
    const h = history[id] ?? { ...empty };
    history[id] = h;
    counts[id] = h.todayAttempts;
    if (h.firstCallAt) firsts[id] = h.firstCallAt;
  }
  const since = new Date(now); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 2);
  for (const row of [...rows].sort((a, b) => (a.called_at ?? "").localeCompare(b.called_at ?? "") || a.id.localeCompare(b.id))) {
    if (!row.lead_id || !row.called_at) continue;
    const d = new Date(row.called_at);
    if (!Number.isFinite(d.getTime()) || d < since) continue;
    const days = byDay[row.lead_id] ??= {};
    const slot = days[dayKey(d)] ??= { count: 0, lastOutcome: null };
    if ((row.direction ?? "outbound") !== "inbound") slot.count += 1;
    slot.lastOutcome = row.outcome ?? row.status ?? slot.lastOutcome;
  }
  return { history, counts, firsts, byDay };
}

/** Cache only the history BEFORE the recent window, so new dials update every queue field. */
export function createCallHistoryLoader(db: Db, leadIds: string[], signal: AbortSignal) {
  let older: { since: string; loadedAt: number; rows: CallRow[] } | null = null;
  return async (now = new Date()) => {
    const sinceDate = new Date(now); sinceDate.setHours(0, 0, 0, 0); sinceDate.setDate(sinceDate.getDate() - 2);
    const since = sinceDate.toISOString();
    const recent = await fetchCalls(db, leadIds, since, true, signal);
    if (!older || older.since !== since || now.getTime() - older.loadedAt >= HISTORY_TTL_MS) {
      const rows = await fetchCalls(db, leadIds, since, false, signal);
      older = { since, loadedAt: now.getTime(), rows };
    }
    signal.throwIfAborted();
    return summarizeCallHistory(leadIds, [...older.rows, ...recent], now);
  };
}
