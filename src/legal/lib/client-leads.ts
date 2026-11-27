// Ported from the Legal app (family-law-floater/src/lib/client-leads.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";

export const LEAD_STATUSES = [
  { value: "new", label: "New", emoji: "🔵", color: "#2c3af5" },
  { value: "no_answer", label: "No Answer", emoji: "🟡", color: "#eab308" },
  { value: "callback_scheduled", label: "Callback Scheduled", emoji: "🟠", color: "#f97316" },
  { value: "had_convo_chase_up", label: "Had Convo — Chase Up", emoji: "🟤", color: "#92400e" },
  { value: "had_convo_no_sale", label: "Had Convo — No Sale", emoji: "🩷", color: "#f472b6" },
  { value: "did_not_qualify", label: "Didn't Qualify", emoji: "⛔", color: "#0891b2" },
  { value: "not_interested", label: "Not Interested", emoji: "🔴", color: "#ef4444" },
  { value: "booked_no_deposit", label: "Booked — No Deposit", emoji: "🟣", color: "#a855f7" },
  { value: "booked_deposit_paid", label: "Booked — Deposit Paid", emoji: "🟢", color: "#22c55e" },
  { value: "dropped", label: "Dropped", emoji: "⚫", color: "#71717a" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export function statusMeta(status: string) {
  return (
    LEAD_STATUSES.find((s) => s.value === status) ?? {
      value: status,
      label: status,
      emoji: "⚪",
      color: "#a1a1aa",
    }
  );
}

export const RELATIONSHIP_STAGE_LABELS: Record<string, string> = {
  separated_not_started: "Separated, not started",
  underway: "Underway",
  planning: "Planning",
  researching: "Researching",
};

export const ASSET_BAND_LABELS: Record<string, string> = {
  under_1m: "Under $1M",
  "1m_2m": "$1M–$2M",
  "2m_5m": "$2M–$5M",
  over_5m: "Over $5M",
};

export const TIMELINE_LABELS: Record<string, string> = {
  asap: "ASAP",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  no_rush: "No rush",
};

export const FUNDING_LABELS: Record<string, string> = {
  savings: "Savings",
  family: "Family",
  litigation_funding: "Litigation funding",
  not_sure: "Not sure",
};

export type ClientLead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  campaign_name: string | null;
  relationship_stage: string | null;
  has_kids_under_18: boolean | null;
  asset_band: string | null;
  settlement_timeline: string | null;
  funding_preference: string | null;
  status: string;
  rep_id: string | null;
  previous_lead_id: string | null;
  callback_scheduled_at?: string | null;
  raw_payload?: unknown;
  created_at: string;
};

export type SalesRep = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
};

const LEAD_COLUMNS =
  "id, first_name, last_name, email, phone, city, campaign_name, relationship_stage, has_kids_under_18, asset_band, settlement_timeline, funding_preference, status, rep_id, previous_lead_id, callback_scheduled_at, raw_payload, created_at";

export function leadName(lead: ClientLead): string {
  return (
    [lead.first_name, lead.last_name].filter(Boolean).join(" ").trim() ||
    lead.email ||
    "Unnamed lead"
  );
}

export function formatCreated(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchClientLeads(): Promise<ClientLead[]> {
  const { data, error } = await supabase
    .from("client_leads")
    .select(LEAD_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientLead[];
}

export async function fetchSalesReps(): Promise<SalesRep[]> {
  const { data, error } = await supabase
    .from("sales_reps")
    .select("id, name, email, role, is_active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as SalesRep[];
}

export async function assignLeads(leadIds: string[], repId: string | null): Promise<void> {
  const { error } = await supabase
    .from("client_leads")
    .update({ rep_id: repId })
    .in("id", leadIds);
  if (error) throw error;
}

export type CurrentStaff = { id: string; name: string | null; role: string } | null;

export async function fetchCurrentStaff(): Promise<CurrentStaff> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("sales_reps")
    .select("id, name, role")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data ?? null;
}

/** A status the database doesn't allow yet means its migration hasn't been published. */
export function statusSaveError(error: { message: string }): Error {
  return error.message.includes("status_check")
    ? new Error("That status can't save yet — publish the latest update in Lovable first.")
    : new Error(error.message);
}

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  const { error } = await supabase.from("client_leads").update({ status }).eq("id", leadId);
  if (error) throw statusSaveError(error);
}

export async function deleteLeads(leadIds: string[]): Promise<void> {
  if (leadIds.length === 0) return;
  const { error } = await supabase.from("client_leads").delete().in("id", leadIds);
  if (error) throw error;
}

export async function updateStaffName(staffId: string, name: string): Promise<void> {
  const { error } = await supabase.from("sales_reps").update({ name: name.trim() }).eq("id", staffId);
  if (error) throw error;
}
