// Ported from the Legal app (family-law-floater/src/lib/sales-call.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import type { Database } from "@/legal/integrations/supabase/types";
import { statusSaveError } from "@/legal/lib/client-leads";

export type LeadPatch = Database["public"]["Tables"]["client_leads"]["Update"];

export type CallLead = {
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
  ex_partner_full_name: string | null;
  status: string;
  call_notes: string | null;
  /** Only text entered in the sales rep’s notepad; never generated summaries. */
  rep_notes: string | null;
  callback_scheduled_at: string | null;
  day_number: number;
  booking_date: string | null;
  booking_time: string | null;
  firm_id: string | null;
  lawyer_id: string | null;
  rep_id: string | null;
  deposit_paid_at: string | null;
  deposit_amount: number | null;
  stripe_checkout_session_id: string | null;
  previous_lead_id: string | null;
  handover_sent_at: string | null;
  eligibility_verdict: string | null;
  eligibility_net_pool: number | null;
  eligibility_data: unknown;
  eligibility_flags: unknown;
  /** The webhook body as it arrived — source of the "Form answers" list. */
  raw_payload?: unknown;
  created_at: string;
};

export const CALL_LEAD_COLUMNS =
  "id, first_name, last_name, email, phone, city, campaign_name, relationship_stage, has_kids_under_18, asset_band, settlement_timeline, funding_preference, ex_partner_full_name, status, call_notes, rep_notes, callback_scheduled_at, day_number, booking_date, booking_time, firm_id, lawyer_id, rep_id, deposit_paid_at, deposit_amount, stripe_checkout_session_id, previous_lead_id, handover_sent_at, eligibility_verdict, eligibility_net_pool, eligibility_data, eligibility_flags, raw_payload, created_at";

export const OBJECTIONS = [
  "Call me back",
  "Email me",
  "Not interested",
  "Already have a lawyer",
  "Trying to sort it ourselves",
  "Worried about cost",
  "Not ready yet",
  "Scared of making it worse",
  "Think about it",
  "No time",
  "Who are you",
] as const;

export const DEPOSIT_AMOUNT = 75;

export type CallRecord = {
  id: string;
  lead_id: string | null;
  created_at: string;
  direction: string | null;
  call_status: string | null;
  duration_seconds: number | null;
};

export type RepSession = {
  id: string;
  rep_id: string | null;
  started_at: string;
  ended_at: string | null;
  calls_made: number;
  bookings_made: number;
};

export function isCallbackDue(lead: CallLead): boolean {
  if (lead.status !== "callback_scheduled" || !lead.callback_scheduled_at) return false;
  return new Date(lead.callback_scheduled_at).getTime() <= Date.now();
}

export async function fetchLead(id: string): Promise<CallLead | null> {
  const { data, error } = await supabase
    .from("client_leads")
    .select(CALL_LEAD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CallLead | null;
}

export async function updateLead(id: string, patch: LeadPatch): Promise<void> {
  const { error } = await supabase.from("client_leads").update(patch).eq("id", id);
  if (error) throw statusSaveError(error);
}

export async function saveCallNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from("client_leads")
    .update({ rep_notes: notes })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw statusSaveError(error);
}

export async function fetchCallRecords(leadId: string): Promise<CallRecord[]> {
  const { data, error } = await supabase
    .from("call_records")
    .select("id, lead_id, created_at, direction, call_status, duration_seconds")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CallRecord[];
}

export async function fetchAttemptsToday(): Promise<Record<string, number>> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("call_records")
    .select("lead_id")
    .gte("created_at", since.toISOString());
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.lead_id) counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchOpenSession(repId: string): Promise<RepSession | null> {
  const { data, error } = await supabase
    .from("rep_sessions")
    .select("id, rep_id, started_at, ended_at, calls_made, bookings_made")
    .eq("rep_id", repId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const session = (data ?? null) as RepSession | null;
  if (!session) return null;
  // A session left open from an earlier day (or 8h+ ago) is stale — close it so the
  // rep gets a fresh "Start Sales Call" screen instead of a timer that never stopped.
  const started = new Date(session.started_at);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const stale =
    started.getTime() < startOfToday.getTime() ||
    Date.now() - started.getTime() > 8 * 60 * 60 * 1000;
  if (stale) {
    await endSession(session.id);
    return null;
  }
  return {
    ...session,
    calls_made: await fetchDialCount(repId, session.started_at),
  };
}

/** Count recorded outbound dials, not outcome saves. Webhook retries share a SID. */
export async function fetchDialCount(repId: string, since: string): Promise<number> {
  const dials = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("call_records")
      .select("id, twilio_call_sid")
      .eq("rep_id", repId)
      .eq("direction", "outbound")
      .neq("call_status", "skipped")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error) throw error;
    for (const row of data ?? []) dials.add(row.twilio_call_sid || row.id);
    if (!data || data.length < 1000) return dials.size;
  }
}


export async function startSession(repId: string): Promise<RepSession> {
  // Refreshes, retries and a second tab must resume the same work session.
  const existing = await fetchOpenSession(repId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("rep_sessions")
    .insert({ rep_id: repId, started_at: new Date().toISOString() })
    .select("id, rep_id, started_at, ended_at, calls_made, bookings_made")
    .single();
  if (error?.code === "23505") {
    // Another tab won the race to create the rep's single open session.
    const concurrent = await fetchOpenSession(repId);
    if (concurrent) return concurrent;
  }
  if (error) throw error;
  return data as RepSession;
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("rep_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function bumpSession(
  sessionId: string,
  field: "bookings_made",
  current: number,
): Promise<void> {
  const { error } = await supabase
    .from("rep_sessions")
    .update({ [field]: current + 1 })
    .eq("id", sessionId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function logCallOutcome(leadId: string, repId: string | null): Promise<void> {
  const { error } = await supabase
    .from("call_records")
    .insert({ lead_id: leadId, rep_id: repId, direction: "outbound", call_status: "completed" });
  if (error) throw error;
}

export type FirmAppointmentInput = {
  leadId: string;
  firmId: string;
  lawyerId: string | null;
  date: string;
  time: string;
};

// Booking happens server-side only (confirmBookingFn in booking.functions.ts):
// it enforces the deposit + other-side-name gate, consumes the pack and creates
// the −24h / −3h reminders. No client-side booking inserts live here.


export async function markDepositPaid(leadId: string): Promise<void> {
  await updateLead(leadId, {
    deposit_paid_at: new Date().toISOString(),
    deposit_amount: DEPOSIT_AMOUNT,
  });
}

/** Admin-only test helper: clears the Square deposit and the handover stamp. */
export async function resetDepositAndHandover(leadId: string): Promise<void> {
  await updateLead(leadId, {
    deposit_paid_at: null,
    deposit_amount: null,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    handover_sent_at: null,
  });
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function appendObjection(notes: string | null, objection: string): string {
  const stamp = new Date().toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  const line = `[${stamp}] Objection: ${objection}`;
  return notes && notes.trim() ? `${notes.replace(/\s+$/, "")}\n${line}` : line;
}

export function buildSummary(lead: CallLead, notes: string | null): string {
  const n = (notes ?? "").trim();
  const kids = lead.has_kids_under_18 ? "kids under 18" : "no kids under 18";
  return [
    "So let me make sure I've got this right...",
    `You separated a while ago, there's the house, super, other assets, ${kids}, and nothing's moved because of what you told me.`,
    n ? `From my notes: ${n}` : "",
    "Is that right?",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildPicture(lead: CallLead, notes: string | null): string {
  const n = (notes ?? "").trim();
  const timeframe =
    lead.settlement_timeline === "asap" ? "a few months" : "twelve months";
  return `Imagine waking up ${timeframe} from now — the orders are stamped${
    n ? `, and ${n.split("\n")[0]}` : ""
  }. How would that actually feel?`;
}

export async function fetchLastCallTimes(leadIds: string[]): Promise<Record<string, string>> {
  if (!leadIds.length) return {};
  const { data, error } = await supabase
    .from("call_records")
    .select("lead_id, created_at")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const last: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.lead_id) last[row.lead_id] = row.created_at;
  }
  return last;
}


export async function logSkip(leadId: string, repId: string | null): Promise<void> {
  const { error } = await supabase
    .from("call_records")
    .insert({ lead_id: leadId, rep_id: repId, direction: "outbound", call_status: "skipped" });
  if (error) throw error;
}

export async function fetchTodayStats(
  repId: string,
): Promise<{ calls: number; bookings: number }> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("rep_sessions")
    .select("bookings_made")
    .eq("rep_id", repId)
    .gte("started_at", since.toISOString());
  if (error) throw error;
  return {
    calls: await fetchDialCount(repId, since.toISOString()),
    bookings: (data ?? []).reduce((n, r) => n + (r.bookings_made ?? 0), 0),
  };
}
