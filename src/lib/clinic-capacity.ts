import { createCapacityCache } from "./clinic-capacity-cache";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export { clinicLocationKeywords } from "./clinic-capacity-state";

/**
 * Remaining consult slots per clinic = total shows purchased across their PAID
 * packs minus every live booking (delivered + upcoming).
 * Once a patient is sent through, the slot is consumed — even if the clinic
 * never marks an outcome. Only an explicit no-show or a disqualification hands
 * the slot back (one more show to fill). Free-trial bookings never consume a
 * paid credit.
 * A clinic with no paid packs has nothing bought, so it has 0 remaining.
 */
const capacitySchema = z.object({
  clinics: z.array(z.object({ id: z.string(), city: z.string().nullable(), location: z.string().nullable() })),
  remaining: z.record(z.number().int()),
});

const capacityCache = createCapacityCache(async (signal) => {
  const { data, error } = await supabase.rpc("sales_capacity_snapshot").abortSignal(signal ?? AbortSignal.timeout(25_000));
  if (error) throw error;
  return capacitySchema.parse(data);
});
export const fetchClinicCapacity = capacityCache.fetch;
export const fetchClinicRemainingSlots = async (options: { fresh?: boolean } = {}) =>
  (await fetchClinicCapacity(options)).remaining;

/** Drop the cached balances after a booking is saved or a pack changes. */
export function invalidateClinicRemainingSlots(clinicId?: string) {
  capacityCache.invalidate();
  // Let the sales-call queue re-check capacity immediately, so a clinic that
  // just filled up pulls its city's leads out of the rep's session mid-call.
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("clinic-capacity-changed", { detail: { clinicId } }));
}
