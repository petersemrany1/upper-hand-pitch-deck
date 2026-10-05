import { getClinicRemainingSlots } from "@/utils/clinic-capacity.functions";

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
let generation = 0;
const CACHE_MS = 30_000;

/** Cached wrapper: reps move between leads constantly, so recomputing the whole
 * pack balance on every lead made the clinic picker look empty while it loaded.
 * Failures are NEVER cached and are retried once after a short pause — a brief
 * network hiccup must not be mistaken for "every clinic is full". */
export function fetchClinicRemainingSlots(options: { fresh?: boolean } = {}): Promise<Record<string, number>> {
  if (options.fresh) {
    cache = null;
    inflight = null;
    generation += 1;
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return Promise.resolve(cache.value);
  if (inflight) return inflight;
  const startedGeneration = generation;
  const request = computeClinicRemainingSlots()
    .catch((err) => {
      console.warn("clinic capacity check failed, retrying once", err);
      return new Promise<Record<string, number>>((resolve, reject) => {
        setTimeout(() => {
          computeClinicRemainingSlots().then(resolve, reject);
        }, 400);
      });
    })
    .then((value) => {
      if (startedGeneration === generation) cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

/** Drop the cached balances after a booking is saved or a pack changes. */
export function invalidateClinicRemainingSlots() {
  cache = null;
  inflight = null;
  generation += 1;
  // Let the sales-call queue re-check capacity immediately, so a clinic that
  // just filled up pulls its city's leads out of the rep's session mid-call.
  if (typeof window !== "undefined") window.dispatchEvent(new Event("clinic-capacity-changed"));
}

async function computeClinicRemainingSlots(): Promise<Record<string, number>> {
  return getClinicRemainingSlots();
}
