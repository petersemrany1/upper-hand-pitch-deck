// Ported from the Legal app (family-law-floater/src/lib/dashboard-shows.ts). Re-run the port script to refresh.
import {
  countPortalCredits,
  isCountedPack,
  TEST_FIRM_ID,
  type CreditAppointment,
} from "./firm-portal-credits";

type Firm = { id: string; firm_name: string; is_active: boolean };
type Pack = { firm_id: string; pack_size: number; status: string };
type Appointment = CreditAppointment & { firm_id: string | null };

/** Outstanding delivery obligations, using the same credit rules as the firm portal. */
export function dashboardShows(firms: Firm[], packs: Pack[], appointments: Appointment[]) {
  const rows = firms
    .filter((firm) => firm.is_active && firm.id !== TEST_FIRM_ID)
    .map((firm) => {
      const capacity = packs
        .filter((pack) => pack.firm_id === firm.id && isCountedPack(pack))
        .reduce((total, pack) => total + pack.pack_size, 0);
      const { delivered, reserved } = countPortalCredits(
        appointments.filter((appointment) => appointment.firm_id === firm.id),
        firm.id,
      );
      const remaining = Math.max(0, capacity - delivered);
      return {
        id: firm.id,
        name: firm.firm_name,
        capacity,
        delivered,
        booked: Math.min(reserved, remaining),
        remaining,
        toBook: Math.max(0, remaining - reserved),
      };
    })
    .filter((firm) => firm.remaining > 0)
    .sort((a, b) => b.toBook - a.toBook || a.name.localeCompare(b.name));
  return {
    rows,
    remaining: rows.reduce((total, firm) => total + firm.remaining, 0),
    booked: rows.reduce((total, firm) => total + firm.booked, 0),
    toBook: rows.reduce((total, firm) => total + firm.toBook, 0),
  };
}
