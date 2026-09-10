import { sydneyTodayISO } from "@/lib/timezone";

/**
 * Free-trial classification for clinic bookings.
 *
 * A clinic can start on a free trial and then buy its first paid pack. Every
 * booking made up to and including the day that first paid pack was paid for
 * belongs to the trial: it costs nothing, doesn't consume a paid credit and
 * doesn't count against the pack balance. Bookings made from the next day
 * onwards run off the paid pack, so the clinic starts fresh.
 */

export type FreeTrialPack = {
  pack_type: string;
  date_paid: string | null;
  purchased_at: string;
};

const dateOf = (p: FreeTrialPack) => (p.date_paid ?? p.purchased_at).slice(0, 10);

/**
 * Returns the last date (YYYY-MM-DD) covered by the free trial, or null when
 * the clinic never had one. Bookings created on or before this date are free.
 */
export function freeTrialCutoff(packs: FreeTrialPack[], todayISO: string): string | null {
  const trials = packs.filter((p) => p.pack_type === "free_trial");
  if (trials.length === 0) return null;
  const lastTrial = trials.map(dateOf).sort().pop()!;
  const firstPaidAfter = packs
    .filter((p) => p.pack_type !== "free_trial" && dateOf(p) >= lastTrial)
    .map(dateOf)
    .sort()[0];
  return firstPaidAfter ?? todayISO;
}

/** True when this booking was made during the free trial window. */
export function isFreeTrialBooking(bookedAt: string | null | undefined, cutoff: string | null): boolean {
  if (!cutoff || !bookedAt) return false;
  const d = new Date(bookedAt);
  if (Number.isNaN(d.getTime())) return false;
  return sydneyTodayISO(d) <= cutoff;
}
