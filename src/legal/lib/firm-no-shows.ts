// Ported from the Legal app (family-law-floater/src/lib/firm-no-shows.ts). Re-run the port script to refresh.
type NoShowAppointment = {
  id?: string;
  firm_id?: string | null;
  lead_id?: string | null;
  status: string;
  outcome: string | null;
  disqualified_at?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
};

export function isNoShowAppointment(appointment: NoShowAppointment): boolean {
  return (
    appointment.status !== "cancelled" &&
    !appointment.disqualified_at &&
    appointment.outcome !== "disqualified" &&
    (appointment.outcome === "noshow" || appointment.status === "no_show")
  );
}

/** Both the booking flow's 10:30am and the calendar's 10:30:00 are supported. */
export function appointmentTimeSeconds(value: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value?.trim() ?? "");
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);
  const meridiem = match[4]?.toLowerCase();
  if (minute > 59 || second > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (meridiem) hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  return hour * 3600 + minute * 60 + second;
}

/**
 * A firm's repeat missed bookings for the same lead are one no-show client.
 * Keep the latest missed booking for display; preserve every other outcome.
 * Never infer identity from a shared name/phone or combine different firms.
 * Callers apply eligibility filters first (for example, past-only show rates).
 */
export function deduplicateNoShows<T extends NoShowAppointment>(appointments: readonly T[]): T[] {
  const result: T[] = [];
  const positions = new Map<string, number>();
  for (const appointment of appointments) {
    if (!isNoShowAppointment(appointment) || !appointment.lead_id) {
      result.push(appointment);
      continue;
    }
    const key = JSON.stringify([appointment.firm_id ?? null, appointment.lead_id]);
    const index = positions.get(key);
    if (index === undefined) {
      positions.set(key, result.length);
      result.push(appointment);
      continue;
    }
    const current = result[index]!;
    const dateOrder = (appointment.appointment_date ?? "").localeCompare(
      current.appointment_date ?? "",
    );
    const timeOrder =
      (appointmentTimeSeconds(appointment.appointment_time) ?? -1) -
      (appointmentTimeSeconds(current.appointment_time) ?? -1);
    if (
      dateOrder > 0 ||
      (dateOrder === 0 &&
        (timeOrder > 0 || (timeOrder === 0 && (appointment.id ?? "") > (current.id ?? ""))))
    )
      result[index] = appointment;
  }
  return result;
}
