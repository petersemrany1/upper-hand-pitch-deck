import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type OutcomeDb = Pick<SupabaseClient<Database>, "from">;

/**
 * Stamp the outcome the rep just chose onto that lead's most recent call
 * record. Live calls are created by the Twilio SDK / voice-outbound, neither
 * of which knows the outcome — it's only known when the rep logs it. Without
 * this, call_records.outcome stays NULL for every call.
 *
 * Best-effort and never blocks the status write. Only fills rows that are
 * still NULL (never overwrites), and only looks back 6 hours so an old call
 * can't be mislabelled by a much later status change.
 */
/**
 * Statuses a rep can only pick as the result of a live call. Admin-side status
 * changes made elsewhere (cancelled, no_show from the appointments page, etc.)
 * must never be written onto a call record.
 */
const CALL_OUTCOME_STATUSES = new Set([
  "no_answer", "callback_scheduled", "had_convo_chase_up", "had_convo_no_sale",
  "not_interested", "dropped", "booked_deposit_paid",
]);

export async function stampLatestCallOutcome(db: OutcomeDb, leadId: string, status: string): Promise<void> {
  try {
    if (!CALL_OUTCOME_STATUSES.has(status)) return;
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("call_records")
      .select("id, status, outcome")
      .eq("lead_id", leadId)
      .gte("called_at", since)
      .order("called_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    // A retry after a lost acknowledgement must not stamp the preceding call.
    if (!recent?.id || recent.outcome !== null) return;
    // Don't stamp a call that's still in flight.
    const live = ["initiated", "queued", "ringing", "in-progress"];
    if (recent.status && live.includes(recent.status)) return;
    await db.from("call_records")
      .update({ outcome: status, updated_at: new Date().toISOString() })
      .eq("id", recent.id)
      .is("outcome", null);
  } catch { /* non-fatal */ }
}

export async function saveSalesOutcome(db: OutcomeDb, data: {leadId: string; status: string; callbackAt?: string}) {
  if (!data.leadId || !data.status) return { success: false as const, error: "leadId and status required" };
  const { data: saved, error } = await db.from("meta_leads")
    .update({ status: data.status, updated_at: new Date().toISOString(),
      ...(data.callbackAt ? { callback_scheduled_at: data.callbackAt } : {}) })
    .eq("id", data.leadId).select("id").maybeSingle();
  if (error || !saved) return { success: false as const, error: error?.message ?? "Lead is no longer available" };
  await stampLatestCallOutcome(db, data.leadId, data.status);
  return { success: true as const };
}
