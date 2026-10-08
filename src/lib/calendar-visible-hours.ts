import { appointmentDuration, asDate, blocksForDate, effectiveHoursFor, hhmmToMin, type ClinicSchedule } from "./clinic-schedule";

/** Focus on this week's hours without hiding early or late appointments. */
export function calendarVisibleHours(schedule: ClinicSchedule, dates: string[]) {
  const starts: number[] = [], ends: number[] = [];
  for (const date of dates) {
    const hours = effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state);
    if (hours && !hours.is_closed) { starts.push(hhmmToMin(hours.open_time)); ends.push(hhmmToMin(hours.close_time)); }
    for (const block of blocksForDate(asDate(date), schedule.blocks)) {
      // Whole-day and rest-of-day blocks should not expand the grid to midnight.
      const from = hhmmToMin(block.slot_start), until = hhmmToMin(block.slot_end);
      if (from === 0 && until === 1440) continue;
      starts.push(from === 0 ? Math.max(0, until - 30) : from);
      ends.push(until === 1440 ? Math.min(1440, from + 30) : until);
    }
  }
  for (const appointment of schedule.appointments.filter(a => dates.includes(a.appointment_date))) {
    const start = hhmmToMin(appointment.appointment_time);
    starts.push(start); ends.push(start + appointmentDuration(appointment) + schedule.buffer_minutes);
  }
  const firstMinute = Math.max(0, Math.floor(Math.min(...starts, ...(starts.length ? [] : [540])) / 60) * 60);
  const lastMinute = Math.min(1440, Math.ceil(Math.max(firstMinute + 60, ...ends, ...(ends.length ? [] : [1020])) / 30) * 30 + 30);
  return { firstMinute, lastMinute };
}
