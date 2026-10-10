import { supabase } from "@/integrations/supabase/client";
import { clinicLocationKeywords, fetchClinicRemainingSlots } from "@/lib/clinic-capacity";
import { availableUntouchedIds, type LocationLead } from "./session-review";
import type { QueueLead } from "./queue";
export type LeadSkipEvent = { id: string; lead_id: string; rep_id: string; rep_name: string; session_id: string | null; reason: string; created_at: string };
// These RPCs are introduced by 20261010040000; keep the cast at this boundary
// until the generated database types are refreshed.
const db = supabase as any;
export async function recordLeadSkip(request: { id: string; leadId: string; reason: string; sessionId: string | null }): Promise<LeadSkipEvent> {
  const { data, error } = await db.rpc("record_lead_skip", { p_id: request.id, p_lead: request.leadId, p_reason: request.reason.trim(), p_session: request.sessionId });
  if (error) throw error;
  if (!data?.id) throw new Error("Skip was not saved");
  return data;
}
export async function loadLeadSkips(leadId: string): Promise<LeadSkipEvent[]> {
  const rows: LeadSkipEvent[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("lead_skip_events").select("id,lead_id,rep_id,rep_name,session_id,reason,created_at")
      .eq("lead_id", leadId).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
const hiddenIds = new Set(["5e70f557-73ce-4bb7-a11a-6b718dbd092f", "b2828129-1c28-4502-927a-11f43a0a8473"]);
export async function fetchUntouchedLeads<L extends QueueLead & LocationLead>(sessionId: string, select: string): Promise<L[]> {
  const before = new Date().toISOString();
  const loadCandidates = async () => {
    const rows: L[] = [];
    // Keyset pagination prevents another rep's calls removing earlier rows
    // from shifting offsets and causing us to overlook later leads.
    let afterId: string | null = null;
    for (;;) {
      let query = db.rpc("untouched_sales_leads", { p_session: sessionId, p_before: before }).select(select).order("id").limit(500);
      if (afterId) query = query.gt("id", afterId);
      const { data, error } = await query;
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
      afterId = data[data.length - 1].id;
    }
  };
  const [leads, remaining, clinics, settings] = await Promise.all([
    loadCandidates(), fetchClinicRemainingSlots({ fresh: true }),
    supabase.from("partner_clinics").select("id,city,location").eq("is_active", true),
    supabase.from("app_settings").select("key,value").in("key", ["paused_lead_locations", "priority_lead_location"]),
  ]);
  if (clinics.error) throw clinics.error;
  if (settings.error) throw settings.error;
  const capacity = { all: [] as string[], available: [] as string[] };
  for (const c of clinics.data ?? []) {
    const keys = clinicLocationKeywords(c);
    capacity.all.push(...keys);
    if ((remaining[c.id] ?? 0) > 0) capacity.available.push(...keys);
  }
  const rawPaused = settings.data?.find(s => s.key === "paused_lead_locations")?.value;
  const rawPriority = settings.data?.find(s => s.key === "priority_lead_location")?.value;
  const paused = Array.isArray(rawPaused) ? rawPaused.filter((x): x is string => typeof x === "string").map(s => s.toLowerCase()) : [];
  const priority = typeof rawPriority === "string" ? rawPriority.toLowerCase() : "";
  const ids = availableUntouchedIds(leads, { paused, capacity, priority, hiddenIds, now: new Date() });
  const byId = new Map(leads.map(l => [l.id, l]));
  return ids.map(id => byId.get(id)!);
}
