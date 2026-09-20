import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";
import { freeTrialCutoff, isFreeTrialBooking, type FreeTrialPack } from "@/lib/clinic-free-trial";

/**
 * Every lowercase city word a clinic can be recognised by in a lead's location
 * text. Ad set names shorten multi-word cities ("Byron - Natural Video" for
 * Byron Bay), so the first word of a multi-word city counts too — otherwise a
 * full Byron clinic would never hide its leads.
 */
export function clinicLocationKeywords(c: { location?: string | null; city?: string | null }): string[] {
  const keys = new Set<string>();
  for (const raw of [c.location, c.city]) {
    const v = (raw ?? "").trim().toLowerCase();
    if (!v) continue;
    keys.add(v);
    const first = v.split(/\s+/)[0];
    // Only distinctive first words — short ones ("port", "gold") would match
    // unrelated locations.
    if (first && first !== v && first.length >= 5) keys.add(first);
  }
  return [...keys];
}

/**
 * Remaining consult slots per clinic = total shows purchased across their PAID
 * packs minus every live booking (delivered + upcoming).
 * Once a patient is sent through, the slot is consumed — even if the clinic
 * never marks an outcome. Only an explicit no-show or a disqualification hands
 * the slot back (one more show to fill). Free-trial bookings never consume a
 * paid credit.
 * A clinic with no paid packs has nothing bought, so it has 0 remaining.
 */
let cache: { at: number; value: Record<string, number> } | null = null;
let inflight: Promise<Record<string, number>> | null = null;
const CACHE_MS = 30_000;

/** Cached wrapper: reps move between leads constantly, so recomputing the whole
 * pack balance on every lead made the clinic picker look empty while it loaded.
 * Failures are NEVER cached and are retried once after a short pause — a brief
 * network hiccup must not be mistaken for "every clinic is full". */
export function fetchClinicRemainingSlots(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.value);
  if (inflight) return inflight;
  inflight = computeClinicRemainingSlots()
    .catch((err) => {
      console.warn("clinic capacity check failed, retrying once", err);
      return new Promise<Record<string, number>>((resolve, reject) => {
        setTimeout(() => {
          computeClinicRemainingSlots().then(resolve, reject);
        }, 400);
      });
    })
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drop the cached balances after a booking is saved or a pack changes. */
export function invalidateClinicRemainingSlots() {
  cache = null;
  // Let the sales-call queue re-check capacity immediately, so a clinic that
  // just filled up pulls its city's leads out of the rep's session mid-call.
  if (typeof window !== "undefined") window.dispatchEvent(new Event("clinic-capacity-changed"));
}

/** Slow reads must fail fast: a rep waiting 30s on a hung request sees an
 * empty clinic picker for far too long. 6s per attempt, one quick retry, then error + Retry. */
const QUERY_TIMEOUT_MS = 6_000;

async function computeClinicRemainingSlots(): Promise<Record<string, number>> {
  const todayStr = sydneyTodayISO();
  const [packsResult, apptsResult] = await Promise.all([
    supabase
      .from("clinic_packs")
      .select("clinic_id, pack_size, pack_type, date_paid, purchased_at")
      .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS)),
    supabase
      .from("clinic_appointments")
      .select("clinic_id, outcome, disqualified_at, appointment_date, booked_at")
      .not("patient_name", "ilike", "%test%")
      .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS)),
  ]);

  // A failed read must throw — returning empty data here makes every clinic
  // look full and silently wipes the clinic pickers in the sales portal.
  if (packsResult.error) throw packsResult.error;
  if (apptsResult.error) throw apptsResult.error;
  const packs = packsResult.data ?? [];
  const appts = apptsResult.data ?? [];

  const packsByClinic: Record<string, FreeTrialPack[]> = {};
  const remaining: Record<string, number> = {};
  for (const p of packs) {
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
  for (const a of appts) {
    if (a.disqualified_at || a.outcome === "disqualified" || a.outcome === "noshow") continue;
    if (!a.clinic_id) continue;
    if (isFreeTrialBooking(a.booked_at, cutoffs[a.clinic_id] ?? null)) continue;
    remaining[a.clinic_id] = (remaining[a.clinic_id] ?? 0) - 1;
  }
  for (const key of Object.keys(remaining)) {
    remaining[key] = Math.max(0, remaining[key]);
  }
  return remaining;
}
