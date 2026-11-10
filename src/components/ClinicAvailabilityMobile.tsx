import { ChevronLeft, ChevronRight, Clock3, Plus, RotateCcw } from "lucide-react";
import {
  addDays, appointmentDuration, asDate, blocksForDate, effectiveHoursFor, formatDay,
  freeIntervals, futureScheduleSlots, hhmmToMin, minToHHMM, patientBufferBands, rangeLabel, validDate,
  type ClinicSchedule,
} from "@/lib/clinic-schedule";
import { mergeCalendarBands } from "@/lib/calendar-event-layout";

type Props = {
  schedule: ClinicSchedule;
  date: string;
  today: string;
  busy: boolean;
  canUndo: boolean;
  onDate: (date: string) => void;
  onHours: (date: string) => void;
  onBlock: (date: string, start: string, end: string, extra?: { id?: string; recurring?: boolean }) => void;
  onAppointment: (date: string, start: string, end: string, patient: string, minutes: number) => void;
  onBuffer: (date: string, start: string, end: string) => void;
  onUndo: () => void;
};

/** A touch-first presentation of the same schedule and commands as the desktop grid. */
export function ClinicAvailabilityMobile({ schedule, date, today, busy, canUndo, onDate, onHours, onBlock, onAppointment, onBuffer, onUndo }: Props) {
  const monday = addDays(date, -((asDate(date).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const hours = effectiveHoursFor(asDate(date), schedule.trading, schedule.overrides, schedule.state);
  const working = hours && !hours.is_closed;
  const editable = date >= today && !busy;
  const booked = schedule.appointments.filter(a => a.appointment_date === date);
  const blocks = blocksForDate(asDate(date), schedule.blocks);
  const availableStarts = futureScheduleSlots(schedule, date);
  const free = freeIntervals(schedule, date);
  const firstFree = free[0];
  const defaultStart = firstFree?.[0] ?? (working ? hhmmToMin(hours.open_time) : 600);
  const defaultEnd = Math.min(defaultStart + 30, firstFree?.[1] ?? 1440);
  const entries = [
    ...free.map(([start, end]) => ({ key: `free:${start}`, start, end, kind: "free" as const, title: "Unbooked time", detail: availableStarts.some(slot => hhmmToMin(slot.time) >= start && hhmmToMin(slot.time) < end) ? "Available for consultations · Tap to block" : "No consultation starts available · Tap to block", disabled: !editable, action: () => onBlock(date, minToHHMM(start), minToHHMM(Math.min(start + 30, end))) })),
    ...booked.map(a => {
      const start = hhmmToMin(a.appointment_time), minutes = appointmentDuration(a), end = start + minutes;
      const patient = a.patient_name || "Booked patient";
      return { key: `appointment:${a.id}`, start, end, kind: "booked" as const, title: patient, detail: `Consultation · ${minutes} minutes`, disabled: busy, action: () => onAppointment(date, minToHHMM(start), minToHHMM(end), patient, minutes) };
    }),
    ...blocks.map((block, index) => ({ key: `block:${block.id ?? index}`, start: hhmmToMin(block.slot_start), end: hhmmToMin(block.slot_end), kind: "blocked" as const, title: "Blocked time", detail: block.is_recurring ? "Repeating · Tap to edit or unblock" : "Tap to edit or unblock", disabled: !editable, action: () => onBlock(date, block.slot_start.slice(0, 5), block.slot_end.slice(0, 5), { id: block.id, recurring: block.is_recurring }) })),
    ...mergeCalendarBands(booked.flatMap(a => patientBufferBands(schedule, a))).map(([start, end]) => ({ key: `buffer:${start}`, start, end, kind: "buffer" as const, title: "Buffer between patients", detail: "Added automatically · Tap for settings", disabled: busy, action: () => onBuffer(date, minToHHMM(start), minToHHMM(end)) })),
  ].sort((a, b) => a.start - b.start || a.end - b.end || a.key.localeCompare(b.key));

  return <div className="availability-mobile">
    <div className="availability-mobile-navigation">
      <label className="availability-mobile-date">Go to date<input type="date" aria-label="Go to date" value={date} onChange={event => { if (validDate(event.target.value)) onDate(event.target.value); }} /></label>
      <button onClick={() => onDate(today)} disabled={date === today}>Today</button>
      <button aria-label="Undo last change" disabled={!canUndo || busy} onClick={onUndo}><RotateCcw size={18} aria-hidden="true" /></button>
    </div>
    <div className="availability-mobile-week-navigation">
      <button aria-label="Previous week" onClick={() => onDate(addDays(date, -7))}><ChevronLeft size={20} /></button>
      <span>{asDate(monday).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – {asDate(addDays(monday, 6)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
      <button aria-label="Next week" onClick={() => onDate(addDays(date, 7))}><ChevronRight size={20} /></button>
    </div>
    <div className="availability-mobile-week" role="group" aria-label="Choose a day">
      {week.map(day => <button key={day} aria-label={formatDay(day)} aria-pressed={day === date} aria-current={day === today ? "date" : undefined} onClick={() => onDate(day)}>
        <span>{asDate(day).toLocaleDateString("en-AU", { weekday: "short" })}</span><strong>{asDate(day).getDate()}</strong>
        <i aria-hidden="true" data-booked={schedule.appointments.some(a => a.appointment_date === day) || undefined} />
      </button>)}
    </div>
    <div className="availability-mobile-day-heading" aria-live="polite" aria-atomic="true">
      <h3>{asDate(date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}</h3>
      <p>{booked.length} consultation{booked.length === 1 ? "" : "s"}{date < today ? " · Past date" : ` · ${availableStarts.length} available start${availableStarts.length === 1 ? "" : "s"}`}</p>
    </div>
    <button className="availability-mobile-hours" aria-label={`Edit working hours for ${formatDay(date)}`} disabled={!editable} onClick={() => onHours(date)}>
      <Clock3 size={20} aria-hidden="true" /><span><strong>{working ? rangeLabel(hhmmToMin(hours.open_time), hhmmToMin(hours.close_time)) : "Closed for consultations"}</strong><small>{working ? "Working hours · Tap to edit" : "Tap to make this day available"}</small></span><ChevronRight size={18} aria-hidden="true" />
    </button>
    <button className="availability-primary availability-mobile-block" disabled={!editable} onClick={() => onBlock(date, minToHHMM(defaultStart), minToHHMM(defaultEnd))}><Plus size={18} aria-hidden="true" />Block time</button>
    <ol className="availability-mobile-agenda" aria-label={`Schedule for ${formatDay(date)}`}>
      {entries.map(entry => <li key={entry.key}><button className={`availability-mobile-entry availability-mobile-entry-${entry.kind}`} disabled={entry.disabled} onClick={entry.action}>
        <span className="availability-mobile-entry-time">{rangeLabel(entry.start, entry.end)}</span>
        <strong>{entry.title}</strong><span className="availability-mobile-entry-detail">{entry.detail}</span>
      </button></li>)}
    </ol>
    {!entries.length && <div className="availability-mobile-empty"><strong>No appointments or blocks</strong><p>{working ? "Your working hours are ready for bookings." : "Edit working hours to make this day available."}</p></div>}
  </div>;
}
