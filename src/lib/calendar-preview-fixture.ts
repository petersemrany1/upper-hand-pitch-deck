import { addDays, asDate, type ClinicSchedule } from "./clinic-schedule";
import { sydneyTodayISO } from "./timezone";

export function calendarPreviewFixture(): ClinicSchedule {
  const today = sydneyTodayISO();
  const monday = addDays(today, (8 - asDate(today).getDay()) % 7 || 7);
  return {
    clinic_id: "00000000-0000-4000-8000-000000000090", clinic_name: "Boss Clinic · Deb", state: "WA",
    consultation_minutes: 90, buffer_minutes: 30, version: "calendar-preview-initial",
    trading: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, open_time: "09:00", close_time: "15:00", is_closed: day_of_week > 4, consult_duration_mins: 15 })),
    blocks: [{ id: "00000000-0000-4000-8000-000000000091", slot_date: monday, slot_start: "10:30", slot_end: "12:00", is_recurring: false, recur_day_of_week: null }],
    overrides: [{ override_date: addDays(monday, 11), override_type: "closed", start_time: null, end_time: null }],
    appointments: [1, 2].map(i => ({ id: `00000000-0000-4000-8000-00000000009${i + 1}`, appointment_date: addDays(monday, i), appointment_time: "09:00", consultation_duration_minutes: 90, patient_name: "Example patient" })),
  };
}
