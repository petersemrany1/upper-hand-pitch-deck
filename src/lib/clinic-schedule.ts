import {
  appointmentDuration, blocksForDate, effectiveHoursFor, generateSlots, hhmmToMin,
  minToHHMM, minToLabel, ymdLocal, holidayLabelFor,
  type AvailabilityOverride, type BlockedSlot, type ExistingAppt, type TradingHours,
} from "./slot-generation";
import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";

export type ScheduleAppointment = ExistingAppt & { id: string };
export type ClinicSchedule = {
  clinic_id: string;
  clinic_name: string;
  state: string | null;
  consultation_minutes: number;
  buffer_minutes: number;
  trading: TradingHours[];
  blocks: BlockedSlot[];
  overrides: AvailabilityOverride[];
  appointments: ScheduleAppointment[];
  version: string;
};
export type ScheduleConfiguration = Pick<ClinicSchedule, "consultation_minutes" | "buffer_minutes" | "blocks" | "overrides">;
export type ScheduleCommand =
  | { action: "settings"; consultation_minutes: number; buffer_minutes: number }
  | { action: "block"; dates: string[]; start: string; end: string; id?: string; scope?: "date" | "series" }
  | { action: "unblock"; id: string; date: string; scope: "date" | "series" }
  | { action: "hours"; dates: string[]; start: string; end: string; closed: boolean }
  | { action: "restore"; configuration: ScheduleConfiguration };

export const asDate = (day: string): Date => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
export const validDate = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(asDate(day).getTime()) && ymdLocal(asDate(day)) === day;
export const addDays = (day: string, n: number) => { const d = asDate(day); d.setDate(d.getDate() + n); return ymdLocal(d); };
export const formatDay = (day: string) => asDate(day).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
export const timeLabel = (minute: number) => minute === 1440 ? "End of day" : minToLabel(minute).replace(":00", "");
export const rangeLabel = (start: number, end: number) => `${timeLabel(start)}–${timeLabel(end)}`;
export const overlap = (a: number, b: number, c: number, d: number) => a < d && b > c;
export const configurationOf = (s: ClinicSchedule): ScheduleConfiguration => structuredClone({
  consultation_minutes: s.consultation_minutes, buffer_minutes: s.buffer_minutes, blocks: s.blocks, overrides: s.overrides,
});
export const scheduleSlots = (s: ClinicSchedule, day: string, duration = s.consultation_minutes) => validDate(day)
  ? generateSlots(asDate(day), s.trading, s.blocks, s.appointments, s.overrides, s.state, s.buffer_minutes, duration) : [];
export function futureScheduleSlots(s: ClinicSchedule, day: string, now = new Date(), duration = s.consultation_minutes) {
  const today = sydneyTodayISO(now);
  const time = now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return day < today ? [] : scheduleSlots(s, day, duration).filter(slot => slot.available && (day > today || slot.time > time));
}

export function datesForEdit(day: string, weekdays: number[], until?: string): string[] {
  if (!validDate(day) || (until && (!validDate(until) || until < day || until > addDays(day, 365)))) throw new Error("Choose a repeat end date within the next year.");
  const selected = new Set([asDate(day).getDay(), ...weekdays]);
  const end = until || addDays(day, 6);
  const days: string[] = [];
  for (let date = day; date <= end; date = addDays(date, 1)) {
    if (date === day || selected.has(asDate(date).getDay()) && (until || weekdays.includes(asDate(date).getDay()))) days.push(date);
  }
  return days;
}

export function freeIntervals(s: ClinicSchedule, day: string): [number, number][] {
  const h = effectiveHoursFor(asDate(day), s.trading, s.overrides, s.state);
  if (!h || h.is_closed) return [];
  const from = hhmmToMin(h.open_time), until = hhmmToMin(h.close_time);
  const busy: [number, number][] = [
    ...s.appointments.filter(a => a.appointment_date === day).map(a => [hhmmToMin(a.appointment_time), hhmmToMin(a.appointment_time) + appointmentDuration(a) + s.buffer_minutes] as [number, number]),
    ...blocksForDate(asDate(day), s.blocks).map(b => [hhmmToMin(b.slot_start), hhmmToMin(b.slot_end)] as [number, number]),
  ].sort((a, b) => a[0] - b[0]);
  let cursor = from;
  const result: [number, number][] = [];
  for (const [start, end] of busy) {
    if (end <= cursor) continue;
    if (start > cursor) result.push([cursor, Math.min(start, until)]);
    cursor = Math.max(cursor, end);
    if (cursor >= until) break;
  }
  if (cursor < until) result.push([cursor, until]);
  return result.filter(([a, b]) => b > a && a < until);
}

/** Display-only shading. It never creates extra blocked rows. */
export function blockedStartBands(s: ClinicSchedule, day: string): [number, number][] {
  const bands = blocksForDate(asDate(day), s.blocks).flatMap(b => {
    const until = hhmmToMin(b.slot_start), from = until - s.consultation_minutes;
    return freeIntervals(s, day).map(([a, z]) => [Math.max(a, from), Math.min(z, until)] as [number, number]).filter(([a, z]) => z > a);
  }).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const band of bands) {
    const previous = merged.at(-1);
    if (previous && band[0] <= previous[1]) previous[1] = Math.max(previous[1], band[1]);
    else merged.push([...band]);
  }
  return merged;
}

/** A manual block or booked patient takes visual priority over buffer shading. */
export function patientBufferBands(s: ClinicSchedule, appointment: ScheduleAppointment): [number, number][] {
  const day = appointment.appointment_date;
  const hours = effectiveHoursFor(asDate(day), s.trading, s.overrides, s.state);
  if (!hours || hours.is_closed || !s.buffer_minutes) return [];
  const start = hhmmToMin(appointment.appointment_time) + appointmentDuration(appointment);
  const end = Math.min(start + s.buffer_minutes, hhmmToMin(hours.close_time));
  let ranges: [number, number][] = end > start ? [[start, end]] : [];
  const occupied = [
    ...blocksForDate(asDate(day), s.blocks).map(b => [hhmmToMin(b.slot_start), hhmmToMin(b.slot_end)]),
    ...s.appointments.filter(a => a.id !== appointment.id && a.appointment_date === day).map(a => [hhmmToMin(a.appointment_time), hhmmToMin(a.appointment_time) + appointmentDuration(a)]),
  ];
  for (const [a, b] of occupied) ranges = ranges.flatMap(([x, y]) => !overlap(x, y, a, b) ? [[x, y]] : [[x, Math.min(a, y)], [Math.max(b, x), y]].filter(([from, to]) => to > from) as [number, number][]);
  return ranges;
}

export function schedulingWarnings(s: ClinicSchedule, today = sydneyTodayISO()) {
  const warnings: { id: string; text: string }[] = [];
  for (const a of s.appointments.filter(a => a.appointment_date >= today)) {
    const from = hhmmToMin(a.appointment_time), to = from + appointmentDuration(a);
    const hours = effectiveHoursFor(asDate(a.appointment_date), s.trading, s.overrides, s.state);
    const outside = !hours || hours.is_closed || from < hhmmToMin(hours.open_time) || to > hhmmToMin(hours.close_time);
    const blocked = blocksForDate(asDate(a.appointment_date), s.blocks).some(b => overlap(from, to, hhmmToMin(b.slot_start), hhmmToMin(b.slot_end)));
    const previous = s.appointments.find(b => b.id !== a.id && b.appointment_date === a.appointment_date && hhmmToMin(b.appointment_time) <= from && hhmmToMin(b.appointment_time) + appointmentDuration(b) + s.buffer_minutes > from);
    if (outside || blocked || previous) warnings.push({ id: a.id, text: `${formatDay(a.appointment_date)} · ${timeLabel(from)}${a.patient_name ? ` · ${a.patient_name}` : ""}: ${outside ? "outside working hours" : blocked ? "overlaps blocked time" : "not enough buffer between patients"}.` });
  }
  return warnings;
}

function checkRange(start: string, end: string) {
  const a = hhmmToMin(start), b = hhmmToMin(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || a >= 1440 || b > 1440 || b <= a) throw new Error("Choose an end time after the start time.");
  return [a, b];
}
function checkDates(dates: string[]) {
  if (!dates.length || dates.length > 366 || dates.some(d => !validDate(d) || d < dates[0] || d > addDays(dates[0], 365)) || new Set(dates).size !== dates.length) throw new Error("Choose valid dates.");
}
function rejectBooked(s: ClinicSchedule, dates: string[], from: number, until: number, hours = false) {
  const booked = s.appointments.find(a => a.appointment_date >= sydneyTodayISO() && dates.includes(a.appointment_date) && (hours
    ? hhmmToMin(a.appointment_time) < from || hhmmToMin(a.appointment_time) + appointmentDuration(a) > until
    : overlap(from, until, hhmmToMin(a.appointment_time), hhmmToMin(a.appointment_time) + appointmentDuration(a))));
  if (booked) throw new Error(`A patient is booked on ${formatDay(booked.appointment_date)} at ${timeLabel(hhmmToMin(booked.appointment_time))}. Keep their appointment free.`);
}

/** Used for immediate form validation and the isolated approval preview.
 * Production repeats these checks inside one locked database transaction. */
export function applyScheduleCommand(current: ClinicSchedule, command: ScheduleCommand): ClinicSchedule {
  const next = structuredClone(current);
  if (command.action === "settings") {
    const { consultation_minutes: duration, buffer_minutes: buffer } = command;
    if (!Number.isInteger(duration) || duration < 5 || duration > 240 || !Number.isInteger(buffer) || buffer < 0 || buffer > 180) throw new Error("Choose a consultation of 5–240 minutes and a buffer of 0–180 minutes.");
    next.consultation_minutes = duration; next.buffer_minutes = buffer;
  } else if (command.action === "block") {
    checkDates(command.dates);
    const [from, until] = checkRange(command.start, command.end);
    const existing = command.id ? next.blocks.find(b => b.id === command.id) : undefined;
    if (command.id && !existing) throw new Error("This block has changed. Refresh and try again.");
    if (existing?.is_recurring && command.scope === "series") {
      const dates = next.appointments.filter(a => blocksForDate(asDate(a.appointment_date), [existing]).length).map(a => a.appointment_date);
      rejectBooked(next, dates, from, until);
      existing.slot_start = command.start; existing.slot_end = command.end;
    } else {
      rejectBooked(next, command.dates, from, until);
      if (existing?.is_recurring) existing.excluded_dates = [...new Set([...(existing.excluded_dates ?? []), ...command.dates])];
      else if (existing) next.blocks = next.blocks.filter(b => b.id !== existing.id);
      command.dates.forEach(day => next.blocks.push({ id: crypto.randomUUID(), slot_date: day, slot_start: command.start, slot_end: command.end, is_recurring: false, recur_day_of_week: null }));
    }
  } else if (command.action === "unblock") {
    const existing = next.blocks.find(b => b.id === command.id);
    if (!existing) throw new Error("This block has changed. Refresh and try again.");
    if (existing.is_recurring && command.scope === "date") existing.excluded_dates = [...new Set([...(existing.excluded_dates ?? []), command.date])];
    else next.blocks = next.blocks.filter(b => b.id !== existing.id);
  } else if (command.action === "hours") {
    checkDates(command.dates);
    const [from, until] = command.closed ? [1440, 0] : checkRange(command.start, command.end);
    for (const day of command.dates) {
      const old = next.overrides.find(o => o.override_date === day);
      // Copying/repeating hours never reopens existing closures or holidays.
      if (day !== command.dates[0] && (old?.override_type === "closed" || old?.override_type === "blocked" || !!holidayLabelFor(asDate(day), next.overrides, next.state))) continue;
      rejectBooked(next, [day], from, until, true);
      next.overrides = next.overrides.filter(o => o.override_date !== day);
      next.overrides.push({ override_date: day, override_type: command.closed ? "closed" : "open", start_time: command.closed ? null : command.start, end_time: command.closed ? null : command.end });
    }
  } else {
    const candidate = { ...next, ...structuredClone(command.configuration) };
    // Undo restores configuration only. Existing buffer conflicts remain review
    // warnings, just as when settings were saved; patients are never moved.
    for (const b of candidate.blocks) {
      if (JSON.stringify(b) === JSON.stringify(next.blocks.find(old => old.id === b.id))) continue;
      const affected = next.appointments.filter(a => blocksForDate(asDate(a.appointment_date), [b]).length).map(a => a.appointment_date);
      rejectBooked(next, affected, hhmmToMin(b.slot_start), hhmmToMin(b.slot_end));
    }
    const hoursKey = (o?: AvailabilityOverride) => JSON.stringify(o && [o.override_type, o.start_time, o.end_time]);
    for (const day of new Set([...next.overrides, ...candidate.overrides].map(o => o.override_date))) {
      if (hoursKey(next.overrides.find(o => o.override_date === day)) === hoursKey(candidate.overrides.find(o => o.override_date === day))) continue;
      const h = effectiveHoursFor(asDate(day), candidate.trading, candidate.overrides, candidate.state);
      rejectBooked(next, [day], h && !h.is_closed ? hhmmToMin(h.open_time) : 1440, h && !h.is_closed ? hhmmToMin(h.close_time) : 0, true);
    }
    Object.assign(next, structuredClone(command.configuration));
  }
  next.version = crypto.randomUUID();
  return next;
}

export { appointmentDuration, blocksForDate, effectiveHoursFor, hhmmToMin, minToHHMM };
