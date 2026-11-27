// Ported from the Legal app (family-law-floater/src/lib/firm-show-rate.ts). Re-run the port script to refresh.
import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";
import { TEST_FIRM_ID, type CreditAppointment } from "./firm-portal-credits";
import { appointmentTimeSeconds, deduplicateNoShows, isNoShowAppointment } from "./firm-no-shows";

export type AttendanceAppointment = CreditAppointment & {
  appointment_date: string | null;
  appointment_time: string | null;
};

/** Match the hair portal: past consults count as attended unless marked no-show. */
export function firmShowRate(
  appointments: readonly AttendanceAppointment[],
  firmId: string,
  now = new Date(),
) {
  const today = sydneyTodayISO(now);
  const time = now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour12: false });
  const pastAppointments: AttendanceAppointment[] = [];
  for (const appointment of appointments) {
    if (firmId !== TEST_FIRM_ID && /test/i.test(appointment.client_name ?? "")) continue;
    if (
      appointment.status === "cancelled" ||
      appointment.disqualified_at ||
      appointment.outcome === "disqualified"
    )
      continue;
    const date = appointment.appointment_date;
    if (!date || date > today) continue;
    if (date === today) {
      const appointmentTime = appointmentTimeSeconds(appointment.appointment_time);
      if (appointmentTime === null || appointmentTime >= appointmentTimeSeconds(time)!) continue;
    }
    pastAppointments.push(appointment);
  }
  const counted = deduplicateNoShows(pastAppointments);
  const past = counted.length;
  const noShows = counted.filter(isNoShowAppointment).length;
  return { past, noShows, percentage: past === 0 ? null : ((past - noShows) / past) * 100 };
}
