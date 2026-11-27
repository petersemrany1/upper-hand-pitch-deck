// Ported from the Legal app (family-law-floater/src/lib/partner-firms.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import { creditBalance } from "./firm-portal-credits";
import type { FirmLocationNotes } from "./firm-location";

export type Firm = {
  id: string;
  firm_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  normal_consult_price: number;
  parking_info: string | null;
  nearby_landmarks: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  abn?: string | null;
  signatory_name?: string | null;
  signatory_email?: string | null;
};

export type FirmLawyer = {
  id: string;
  firm_id: string;
  name: string;
  title: string | null;
  years_experience: number | null;
  accredited_specialist: boolean;
  /** Dollars per hour, plus GST. Missing until the hourly_rate migration is published. */
  hourly_rate?: number | null;
  specialties: string | null;
  what_makes_them_different: string | null;
  talking_points: string | null;
  is_active: boolean;
};

export type FirmPack = {
  id: string;
  firm_id: string;
  pack_size: number;
  shows_used: number;
  price_per_show: number;
  purchased_at: string;
  status: string;
};

export type TradingHour = {
  id: string;
  firm_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
  /** Fixed consult start times ("HH:MM[:SS]"). Empty/null = hourly slots. */
  slot_times?: string[] | null;
};

export type BlockedSlot = {
  id: string;
  firm_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Consumed slots per firm: real bookings, matching the portal's pack balance rule. */
export async function fetchPackUsage(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("firm_appointments")
    .select("firm_id, status, outcome, client_name, disqualified_at")
    .neq("status", "cancelled");
  if (error) throw error;
  const used: Record<string, number> = {};
  for (const row of data ?? []) {
    const r = row as {
      firm_id: string | null;
      outcome: string | null;
      client_name: string | null;
      disqualified_at: string | null;
    };
    if (!r.firm_id) continue;
    if (r.disqualified_at || r.outcome === "disqualified" || r.outcome === "noshow") continue;
    if (r.outcome && r.outcome !== "show" && r.outcome !== "signed") continue;
    if ((r.client_name ?? "").toLowerCase().includes("test")) continue;
    used[r.firm_id] = (used[r.firm_id] ?? 0) + 1;
  }
  return used;
}

export function packBalanceLabel(capacity: number, used: number): string {
  if (capacity <= 0 && used === 0) return "No active pack";
  const left = creditBalance(capacity, used);
  if (left < 0) return `${left} credits · ${-left} owing from next pack`;
  return `${left} of ${capacity} shows left`;
}

export async function fetchFirms(): Promise<Firm[]> {
  const { data, error } = await supabase.from("firms").select("*").order("firm_name");
  if (error) throw error;
  return (data ?? []) as Firm[];
}

/** Uses the existing admin-only firm update policy; never changes other firm details. */
export async function saveFirmLocationNotes(firmId: string, notes: FirmLocationNotes) {
  const { data, error } = await supabase
    .from("firms")
    .update({ nearby_landmarks: notes.nearby_landmarks, parking_info: notes.parking_info })
    .eq("id", firmId)
    .select("id, nearby_landmarks, parking_info")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Location notes were not saved. Please try again.");
  return data;
}

export async function fetchPacks(): Promise<FirmPack[]> {
  const { data, error } = await supabase
    .from("firm_packs")
    .select("*")
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FirmPack[];
}

export async function fetchLawyers(firmId: string): Promise<FirmLawyer[]> {
  const { data, error } = await supabase
    .from("firm_lawyers")
    .select("*")
    .eq("firm_id", firmId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as FirmLawyer[];
}

export async function fetchTradingHours(firmId: string): Promise<TradingHour[]> {
  const { data, error } = await supabase
    .from("firm_trading_hours")
    .select("*")
    .eq("firm_id", firmId)
    .order("day_of_week");
  if (error) throw error;
  return (data ?? []) as TradingHour[];
}

export async function fetchBlockedSlots(firmId: string): Promise<BlockedSlot[]> {
  const { data, error } = await supabase
    .from("firm_blocked_slots")
    .select("*")
    .eq("firm_id", firmId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BlockedSlot[];
}

/** Times already taken at a firm, so the booking screen can hide them. */
export async function fetchFirmBookings(
  firmId: string,
): Promise<Array<{ appointment_date: string; appointment_time: string }>> {
  const { data, error } = await supabase.rpc("sales_booking_times", { p_firm_id: firmId });
  if (error) throw error;
  return (data ?? []).filter(
    (r): r is { appointment_date: string; appointment_time: string } =>
      Boolean(r.appointment_date) && Boolean(r.appointment_time),
  );
}
