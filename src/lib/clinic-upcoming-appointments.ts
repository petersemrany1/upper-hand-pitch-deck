import { appointmentDuration, hhmmToMin, type ScheduleAppointment } from "./clinic-schedule";
import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";

/** Read-only ordering; includes a consultation in progress until its scheduled end. */
export function upcomingClinicAppointments(appointments: ScheduleAppointment[], now = new Date()) {
  const today = sydneyTodayISO(now);
  const minute = hhmmToMin(now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
  return appointments.filter(appointment => appointment.appointment_date > today || appointment.appointment_date === today && hhmmToMin(appointment.appointment_time) + appointmentDuration(appointment) > minute)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date) || hhmmToMin(a.appointment_time) - hhmmToMin(b.appointment_time) || a.id.localeCompare(b.id));
}
