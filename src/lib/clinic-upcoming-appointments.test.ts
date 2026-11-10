import { expect, test } from "bun:test";
import { upcomingClinicAppointments } from "./clinic-upcoming-appointments";
import type { ScheduleAppointment } from "./clinic-schedule";

const appointment = (id: string, date: string, time: string, minutes = 30): ScheduleAppointment => ({ id, appointment_date: date, appointment_time: time, consultation_duration_minutes: minutes });

test("upcoming appointments use the existing Sydney timezone, retain in-progress patients and exclude finished visits", () => {
  // 01:00 UTC is noon in Sydney, but still the previous day in parts of the world.
  const visits = [appointment('past', '2026-11-09', '15:00'), appointment('finished', '2026-11-10', '11:30'), appointment('in-progress', '2026-11-10', '11:45'), appointment('starting', '2026-11-10', '12:00'), appointment('future', '2026-11-11', '09:00')];
  expect(upcomingClinicAppointments(visits, new Date('2026-11-10T01:00:00Z')).map(a => a.id)).toEqual(['in-progress', 'starting', 'future']);
});

test("appointments are sorted across dates and legacy time formats without mutating the source", () => {
  const visits = [appointment('later-day', '2026-11-12', '08:00'), appointment('afternoon', '2026-11-11', '1:30pm'), appointment('morning', '2026-11-11', '09:00:00')];
  expect(upcomingClinicAppointments(visits, new Date('2026-11-10T01:00:00Z')).map(a => a.id)).toEqual(['morning', 'afternoon', 'later-day']);
  expect(visits.map(a => a.id)).toEqual(['later-day', 'afternoon', 'morning']);
  expect(upcomingClinicAppointments([], new Date('2026-11-10T01:00:00Z'))).toEqual([]);
});
