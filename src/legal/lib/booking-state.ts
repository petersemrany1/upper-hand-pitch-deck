// Ported from the Legal app (family-law-floater/src/lib/booking-state.ts). Re-run the port script to refresh.
export type BookingAppointment = {
  id: string;
  status: string;
  outcome: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  disqualified_at: string | null;
  rebooked_from: string | null;
  location_id?: string | null;
  location_name?: string | null;
  firm_id?: string | null;
};

export type LeadBookingState = {
  kind: "new" | "active" | "no_show" | "closed";
  appointment: BookingAppointment | null;
};

export function bookingState(appointment: BookingAppointment | null): LeadBookingState {
  if (!appointment) return { kind: "new", appointment };
  const { status, outcome, disqualified_at } = appointment;
  if (status === "cancelled" || disqualified_at || outcome === "disqualified")
    return { kind: "closed", appointment };
  if (outcome === "noshow" || (status === "no_show" && !outcome))
    return { kind: "no_show", appointment };
  return { kind: status === "booked" && !outcome ? "active" : "closed", appointment };
}

export function bookingDateLabel(date: string | null, time: string | null): string {
  if (!date) return "Previous appointment";
  const label = new Date(`${date}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${label}${time ? ` at ${time}` : ""}`;
}
