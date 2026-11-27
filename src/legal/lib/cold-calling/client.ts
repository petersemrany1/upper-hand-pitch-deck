// Ported from the Legal app (family-law-floater/src/lib/cold-calling/client.ts). Re-run the port script to refresh.
// Browser-side reads for the Firm Cold Call Portal (RLS applies).
import { supabase } from "@/legal/integrations/supabase/client";
import type { Database } from "@/legal/integrations/supabase/types";

import { COLD_CALLING_SETTINGS_KEY, parseSettings, type ColdCallingSettings } from "./settings";

type Tables = Database["public"]["Tables"];
export type ProspectFirm = Tables["prospect_firms"]["Row"] & { suppressed: boolean };
export type ProspectContact = Tables["prospect_contacts"]["Row"];
export type ProspectCallAttempt = Tables["prospect_call_attempts"]["Row"];

async function suppressedSet(): Promise<Set<string>> {
  const { data } = await supabase.from("phone_suppressions").select("phone_e164");
  return new Set((data ?? []).map((s) => s.phone_e164));
}

/** All prospects (≈1k rows) — ordered and filtered in the browser. */
export async function fetchProspects(): Promise<ProspectFirm[]> {
  const [{ data, error }, suppressed] = await Promise.all([
    supabase
      .from("prospect_firms")
      .select("*")
      .order("fit_score", { ascending: false, nullsFirst: false })
      .limit(5000),
    suppressedSet(),
  ]);
  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    ...f,
    suppressed: !!f.phone_e164 && suppressed.has(f.phone_e164),
  }));
}

/** Every contact, keyed by firm — small enough to load once. */
export async function fetchAllContacts(): Promise<Record<string, ProspectContact[]>> {
  const { data, error } = await supabase.from("prospect_contacts").select("*").limit(10000);
  if (error) throw new Error(error.message);
  const out: Record<string, ProspectContact[]> = {};
  for (const c of data ?? []) (out[c.prospect_firm_id] ??= []).push(c);
  return out;
}

export async function fetchAttemptsForFirm(firmId: string): Promise<ProspectCallAttempt[]> {
  const { data } = await supabase
    .from("prospect_call_attempts")
    .select("*")
    .eq("prospect_firm_id", firmId)
    .order("started_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function fetchAttemptsSince(sinceISO: string): Promise<ProspectCallAttempt[]> {
  const { data, error } = await supabase
    .from("prospect_call_attempts")
    .select("*")
    .gte("started_at", sinceISO)
    .order("started_at")
    .limit(20000);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** The caller's most recent call without a saved outcome (live, or ended within 2 hours). */
export async function fetchUnsavedAttempt(userId: string): Promise<ProspectCallAttempt | null> {
  const since = new Date(Date.now() - 2 * 3600000).toISOString();
  const { data } = await supabase
    .from("prospect_call_attempts")
    .select("*")
    .eq("caller_user_id", userId)
    .is("business_disposition", null)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchLiveAttempt(userId: string): Promise<ProspectCallAttempt | null> {
  const { data } = await supabase
    .from("prospect_call_attempts")
    .select("*")
    .eq("caller_user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchColdCallingSettings(): Promise<ColdCallingSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", COLD_CALLING_SETTINGS_KEY)
    .maybeSingle();
  return parseSettings(data?.value ?? null);
}

export type StaffMember = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
};

export async function fetchStaffDirectory(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("sales_reps")
    .select("id, user_id, name, email, role, is_active")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function staffName(
  staff: StaffMember[] | undefined,
  userId: string | null | undefined,
): string {
  if (!userId) return "Unassigned";
  const s = staff?.find((r) => r.user_id === userId);
  return s?.name || s?.email || "Staff";
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
