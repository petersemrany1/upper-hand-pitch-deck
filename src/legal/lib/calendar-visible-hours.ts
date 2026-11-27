// Ported from the Legal app (family-law-floater/src/lib/calendar-visible-hours.ts). Re-run the port script to refresh.
import {
  appointmentDuration,
  asDate,
  blocksForDate,
  effectiveHoursFor,
  hhmmToMin,
  type FirmSchedule,
} from "./firm-schedule";

/** Focus on this week's hours without hiding early or late appointments. */
export function calendarVisibleHours(schedule: FirmSchedule, dates: string[]) {
  const starts: number[] = [],
    ends: number[] = [];
  for (const date of dates) {
    const hours = effectiveHoursFor(
      asDate(date),
      schedule.trading,
      schedule.overrides,
      schedule.state,
    );
    if (hours && !hours.is_closed) {
      starts.push(hhmmToMin(hours.open_time));
      ends.push(hhmmToMin(hours.close_time));
    }
    for (const block of blocksForDate(asDate(date), schedule.blocks)) {
      // Whole-day and rest-of-day blocks should not expand the grid to midnight.
      const from = hhmmToMin(block.start_time),
        until = hhmmToMin(block.end_time);
      if (from === 0 && until === 1440) continue;
      starts.push(from === 0 ? Math.max(0, until - 30) : from);
      ends.push(until === 1440 ? Math.min(1440, from + 30) : until);
    }
  }
  for (const appointment of schedule.appointments.filter((a) =>
    dates.includes(a.appointment_date),
  )) {
    const start = hhmmToMin(appointment.appointment_time);
    starts.push(start);
    ends.push(start + appointmentDuration(appointment) + schedule.buffer_minutes);
  }
  const firstMinute = Math.max(
    0,
    Math.floor(Math.min(...starts, ...(starts.length ? [] : [540])) / 60) * 60,
  );
  const lastMinute = Math.min(
    1440,
    Math.ceil(Math.max(firstMinute + 60, ...ends, ...(ends.length ? [] : [1020])) / 30) * 30 + 30,
  );
  return { firstMinute, lastMinute };
}
