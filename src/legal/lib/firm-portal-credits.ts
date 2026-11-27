// Ported from the Legal app (family-law-floater/src/lib/firm-portal-credits.ts). Re-run the port script to refresh.
import { deduplicateNoShows } from "./firm-no-shows";

// Dedicated demo tenant. This is not an authorization check; server mutations
// must also verify the caller's membership and the appointment's ownership.
export const TEST_FIRM_ID = "7102a000-7729-4141-965c-8ba2d946d3e5";

/** Advances remain owing and are deducted from the next purchased pack. */
export function creditBalance(capacity: number, consumed: number): number {
  return capacity - consumed;
}

export function isCountedPack(pack: { status: string }): boolean {
  return pack.status === "active" || pack.status === "completed";
}

export type CreditAppointment = {
  id?: string;
  firm_id?: string | null;
  lead_id?: string | null;
  client_name: string | null;
  status: string;
  outcome: string | null;
  disqualified_at?: string | null;
};

export function countPortalCredits(appointments: CreditAppointment[], firmId: string) {
  let delivered = 0;
  let reserved = 0;
  let noShows = 0;
  const eligible = appointments.filter(
    (a) =>
      (firmId === TEST_FIRM_ID || !/test/i.test(a.client_name ?? "")) &&
      a.status !== "cancelled" &&
      !a.disqualified_at &&
      a.outcome !== "disqualified",
  );
  for (const a of deduplicateNoShows(eligible)) {
    if (a.outcome === "noshow" || a.status === "no_show") noShows++;
    else if (a.outcome === "show" || a.outcome === "signed" || a.status === "showed") delivered++;
    else reserved++;
  }
  return { delivered, reserved, noShows, bookedSlots: delivered + reserved };
}
