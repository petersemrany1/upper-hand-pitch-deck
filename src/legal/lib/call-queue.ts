// Ported from the Legal app (family-law-floater/src/lib/call-queue.ts). Re-run the port script to refresh.
import { supabase } from "@/legal/integrations/supabase/client";
import type { CallLead } from "@/legal/lib/sales-call";

async function fetchCityList(key: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return [];
  const value = data?.value;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

async function saveCityList(key: string, cities: string[]): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value: cities }, { onConflict: "key" });
  if (error) throw error;
}

export function fetchPausedCities(): Promise<string[]> {
  return fetchCityList("paused_cities");
}

export function savePausedCities(cities: string[]): Promise<void> {
  return saveCityList("paused_cities", cities);
}

/** When non-empty, ONLY leads in these cities are served to reps. */
export function fetchFocusCities(): Promise<string[]> {
  return fetchCityList("focus_cities");
}

export function saveFocusCities(cities: string[]): Promise<void> {
  return saveCityList("focus_cities", cities);
}

/** True when the booking is locked in — the booking IS the outcome. */
export function isBookedPaid(lead: CallLead | null): boolean {
  if (!lead) return false;
  return (
    lead.status === "booked_deposit_paid" ||
    (Boolean(lead.deposit_paid_at) && Boolean(lead.booking_date))
  );
}
