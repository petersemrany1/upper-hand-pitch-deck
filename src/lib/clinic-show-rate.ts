import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";

type AttendanceAppointment = {
  appointment_date: string;
  appointment_time: string;
  outcome: string | null;
  disqualified_at: string | null;
};

/** All past consults count as attended unless explicitly marked no-show. */
export function clinicShowRate(appointments: readonly AttendanceAppointment[], now = new Date()) {
  const today = sydneyTodayISO(now);
  const time = now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour12: false });
  let past = 0;
  let noShows = 0;

  for (const appointment of appointments) {
    if (appointment.disqualified_at || appointment.outcome === "disqualified") continue;
    if (appointment.appointment_date > today) continue;
    if (appointment.appointment_date === today) {
      const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(appointment.appointment_time);
      const appointmentTime = match ? `${match[1].padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}` : null;
      if (!appointmentTime || appointmentTime >= time) continue;
    }
    past += 1;
    if (appointment.outcome === "noshow") noShows += 1;
  }

  return { past, noShows, percentage: past === 0 ? null : ((past - noShows) / past) * 100 };
}
