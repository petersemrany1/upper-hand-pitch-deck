import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";

/**
 * Remaining consult slots per clinic = total shows purchased across their packs
 * minus every live booking (delivered + upcoming).
 * No-shows and disqualified bookings hand the slot back, and past bookings
 * with no outcome recorded are treated as if they never happened.
 * A clinic with no packs has nothing bought, so it has 0 remaining.
 */
export async function fetchClinicRemainingSlots(): Promise<Record<string, number>> {
  const todayStr = sydneyTodayISO();
  const [{ data: packs }, { data: appts }] = await Promise.all([
    supabase.from("clinic_packs").select("clinic_id, pack_size"),
    supabase
      .from("clinic_appointments")
      .select("clinic_id, outcome, disqualified_at, appointment_date")
      .not("patient_name", "ilike", "%test%"),
  ]);

  const remaining: Record<string, number> = {};
  for (const p of packs ?? []) {
    remaining[p.clinic_id] = (remaining[p.clinic_id] ?? 0) + (p.pack_size ?? 0);
  }
  for (const a of appts ?? []) {
    if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
    if (!a.clinic_id) continue;
    if (!a.outcome && a.appointment_date && a.appointment_date < todayStr) continue;
    remaining[a.clinic_id] = (remaining[a.clinic_id] ?? 0) - 1;
  }
  for (const key of Object.keys(remaining)) {
    remaining[key] = Math.max(0, remaining[key]);
  }
  return remaining;
}
