import { supabase } from "@/integrations/supabase/client";

/**
 * Remaining consult slots per clinic = total shows purchased across their packs
 * minus every live booking (delivered + upcoming + awaiting outcome).
 * No-shows and disqualified bookings hand the slot back.
 * A clinic with no packs has nothing bought, so it has 0 remaining.
 */
export async function fetchClinicRemainingSlots(): Promise<Record<string, number>> {
  const [{ data: packs }, { data: appts }] = await Promise.all([
    supabase.from("clinic_packs").select("clinic_id, pack_size"),
    supabase
      .from("clinic_appointments")
      .select("clinic_id, outcome, disqualified_at")
      .not("patient_name", "ilike", "%test%"),
  ]);

  const remaining: Record<string, number> = {};
  for (const p of packs ?? []) {
    remaining[p.clinic_id] = (remaining[p.clinic_id] ?? 0) + (p.pack_size ?? 0);
  }
  for (const a of appts ?? []) {
    if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
    if (!a.clinic_id) continue;
    remaining[a.clinic_id] = (remaining[a.clinic_id] ?? 0) - 1;
  }
  for (const key of Object.keys(remaining)) {
    remaining[key] = Math.max(0, remaining[key]);
  }
  return remaining;
}
