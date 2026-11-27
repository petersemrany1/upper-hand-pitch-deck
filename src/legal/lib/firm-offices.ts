// Ported from the Legal app (family-law-floater/src/lib/firm-offices.ts). Re-run the port script to refresh.
import type { FirmLocationNotes } from "./firm-location";

export type FirmOffice = FirmLocationNotes & {
  id: string;
  firm_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
};

export type AppointmentOffice = {
  location_id?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_parking_info?: string | null;
  location_nearby_landmarks?: string | null;
};

export function officeAddress(office: Pick<FirmOffice, "address" | "city" | "state">): string {
  return [office.address, office.city, office.state].filter((v) => v?.trim()).join(", ");
}

/** Snapshots must never borrow another office's parking, even if theirs is blank. */
export function appointmentOffice(
  appointment: AppointmentOffice | null | undefined,
  legacy?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    parking_info?: string | null;
    nearby_landmarks?: string | null;
  } | null,
) {
  const saved = Boolean(appointment?.location_id || appointment?.location_name);
  return {
    name: appointment?.location_name ?? null,
    address: saved
      ? (appointment?.location_address ?? null)
      : officeAddress({
          address: legacy?.address ?? null,
          city: legacy?.city ?? null,
          state: legacy?.state ?? null,
        }) || null,
    parking: saved ? (appointment?.location_parking_info ?? null) : (legacy?.parking_info ?? null),
    directions: saved
      ? (appointment?.location_nearby_landmarks ?? null)
      : (legacy?.nearby_landmarks ?? null),
  };
}

export function chosenOfficeId(
  offices: FirmOffice[],
  selected: string | null | undefined,
): string | null {
  const active = offices.filter((office) => office.is_active);
  if (selected) return active.some((office) => office.id === selected) ? selected : null;
  return active.length === 1 ? active[0]!.id : null;
}
