import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type RetryAssignment = { leadId: string; batchId: string; repId: string; requestedAt: string };
export type RetryProgress = RetryAssignment & { calledAt: string | null };

/** Explicit operator-requested retries. There is deliberately no expiry. */
export function retryAssignment(lead: { id: string; raw_payload?: unknown }): RetryAssignment | null {
  const payload = lead.raw_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).sales_retry;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.batch_id !== "string" || !r.batch_id || typeof r.rep_id !== "string" || !r.rep_id
    || typeof r.requested_at !== "string" || !Number.isFinite(Date.parse(r.requested_at))) return null;
  return { leadId: lead.id, batchId: r.batch_id, repId: r.rep_id, requestedAt: r.requested_at };
}

export function retryAssignmentsFor(leads: { id: string; raw_payload?: unknown }[], repId: string | null) {
  return leads.flatMap(lead => {
    const r = retryAssignment(lead);
    return r && r.repId === repId ? [r] : [];
  }).sort((a, b) => a.leadId.localeCompare(b.leadId));
}

/** Read actual dials by the requested rep, without changing the team counters. */
export async function loadRetryProgress(
  db: Pick<SupabaseClient<Database>, "from">,
  assignments: RetryAssignment[],
  repId: string | null,
  signal: AbortSignal,
): Promise<Record<string, RetryProgress>> {
  const own = assignments.filter(r => r.repId === repId);
  const result = Object.fromEntries(own.map(r => [r.leadId, { ...r, calledAt: null } as RetryProgress]));
  for (let start = 0; start < own.length; start += 100) {
    const batch = own.slice(start, start + 100);
    const since = new Date(Math.min(...batch.map(r => Date.parse(r.requestedAt)))).toISOString();
    for (let offset = 0; ; offset += 1000) {
      signal.throwIfAborted();
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(25_000)]);
      const { data, error } = await db.from("call_records")
        .select("id, lead_id, rep_id, called_at, direction")
        .eq("rep_id", repId!).in("lead_id", batch.map(r => r.leadId)).gte("called_at", since)
        .order("called_at").order("id").range(offset, offset + 999).abortSignal(requestSignal);
      requestSignal.throwIfAborted();
      if (error) throw error;
      for (const row of data ?? []) {
        const r = row.lead_id ? result[row.lead_id] : undefined;
        if (r && row.rep_id === repId && row.direction !== "inbound" && row.called_at
          && Date.parse(row.called_at) >= Date.parse(r.requestedAt)) r.calledAt = row.called_at;
      }
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  return result;
}
