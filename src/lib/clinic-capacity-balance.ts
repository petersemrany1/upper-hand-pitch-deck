import { freeTrialCutoff, isFreeTrialBooking, type FreeTrialPack } from "./clinic-free-trial";

export type CapacityPack = FreeTrialPack & { clinic_id: string; pack_size: number };
export type CapacityAppointment = {
  clinic_id: string | null; outcome: string | null; disqualified_at: string | null; booked_at: string | null;
};

/** Includes every rep's bookings, preserves negative balances and excludes trials. */
export function clinicRemainingBalances(packs: CapacityPack[], appts: CapacityAppointment[], todayStr: string): Record<string, number> {
  const packsByClinic: Record<string, FreeTrialPack[]> = {};
  const remaining: Record<string, number> = {};
  for (const p of packs) {
    (packsByClinic[p.clinic_id] ??= []).push(p);
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
  for (const a of appts) {
    if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
    if (!a.clinic_id) continue;
    if (isFreeTrialBooking(a.booked_at, cutoffs[a.clinic_id] ?? null)) continue;
    remaining[a.clinic_id] = (remaining[a.clinic_id] ?? 0) - 1;
  }
  return remaining;
}
