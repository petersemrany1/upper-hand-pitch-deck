import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";
import { freeTrialCutoff, isFreeTrialBooking, type FreeTrialPack } from "@/lib/clinic-free-trial";

/**
 * Remaining consult slots per clinic = total shows purchased across their PAID
 * packs minus every live booking (delivered + upcoming).
 * No-shows and disqualified bookings hand the slot back, past bookings with no
 * outcome recorded are treated as if they never happened, and free-trial
 * bookings never consume a paid credit.
 * A clinic with no paid packs has nothing bought, so it has 0 remaining.
 */
export async function fetchClinicRemainingSlots(): Promise<Record<string, number>> {
  const todayStr = sydneyTodayISO();
  const [{ data: packs }, { data: appts }] = await Promise.all([
    supabase.from("clinic_packs").select("clinic_id, pack_size, pack_type, date_paid, purchased_at"),
    supabase
      .from("clinic_appointments")
      .select("clinic_id, outcome, disqualified_at, appointment_date, booked_at")
      .not("patient_name", "ilike", "%test%"),
  ]);

  const packsByClinic: Record<string, FreeTrialPack[]> = {};
  const remaining: Record<string, number> = {};
  for (const p of packs ?? []) {
    (packsByClinic[p.clinic_id] ??= []).push(p as FreeTrialPack);
    if (p.pack_type === "free_trial") {
      remaining[p.clinic_id] ??= 0;
      continue;
    }
    remaining[p.clinic_id] = (remaining[p.clinic_id] ?? 0) + (p.pack_size ?? 0);
  }
  const cutoffs: Record<string, string | null> = {};
  for (const [clinicId, list] of Object.entries(packsByClinic)) {
    cutoffs[clinicId] = freeTrialCutoff(list, todayStr);
  }
  for (const a of appts ?? []) {
    if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
    if (!a.clinic_id) continue;
    if (isFreeTrialBooking(a.booked_at, cutoffs[a.clinic_id] ?? null)) continue;
    if (!a.outcome && a.appointment_date && a.appointment_date < todayStr) continue;
    remaining[a.clinic_id] = (remaining[a.clinic_id] ?? 0) - 1;
  }
  for (const key of Object.keys(remaining)) {
    remaining[key] = Math.max(0, remaining[key]);
  }
  return remaining;
}
