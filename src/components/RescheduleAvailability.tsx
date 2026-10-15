import { availableRescheduleSlots, clinicNow, type RescheduleSnapshot } from "@/lib/booking-reschedule";
import { addDays, formatDay } from "@/lib/clinic-schedule";

export function RescheduleAvailability({ snapshot, date, time, onDate, onTime, disabled = false }: {
  snapshot: RescheduleSnapshot; date: string; time: string; onDate(date: string): void; onTime(time: string): void; disabled?: boolean;
}) {
  const today = clinicNow(snapshot.clinic.state).date;
  const start = date >= today ? date : today;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const slots = availableRescheduleSlots(snapshot, date);
  return <section className="space-y-3" aria-label="Clinic availability">
    <div className="flex items-center justify-between gap-3"><label className="grid gap-1 text-sm">New date (Sydney time)<input aria-label="New appointment date" className="rounded border p-2" type="date" min={today} value={date} disabled={disabled} onChange={e => onDate(e.target.value)} /></label>
      <div className="flex gap-2"><button type="button" className="rounded border p-2 text-xs" disabled={disabled || start <= today} onClick={() => onDate(addDays(start, -7) < today ? today : addDays(start, -7))}>Previous week</button><button type="button" className="rounded border p-2 text-xs" disabled={disabled} onClick={() => onDate(addDays(start, 7))}>Next week</button></div>
    </div>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map(day => {
      const count = availableRescheduleSlots(snapshot, day).filter(slot => day !== snapshot.appointment.appointment_date || slot.time !== snapshot.appointment.appointment_time.slice(0, 5)).length;
      return <button type="button" key={day} aria-pressed={date === day} disabled={disabled || !count} className={`rounded border px-1 py-2 text-xs disabled:opacity-40 ${date === day ? "border-orange-500 bg-orange-50" : "bg-white"}`} onClick={() => onDate(day)}>{formatDay(day)}<span className="mt-1 block text-[10px] text-muted-foreground">{count ? `${count} times` : "No times"}</span></button>;
    })}</div>
    <div><p className="mb-2 text-sm font-medium">Available times · {formatDay(start)}</p><div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto" aria-label="Available appointment times">{slots.map(slot => {
      const original = date === snapshot.appointment.appointment_date && slot.time === snapshot.appointment.appointment_time.slice(0, 5);
      return <button type="button" key={slot.time} aria-pressed={time === slot.time} disabled={disabled || original} className={`rounded border p-2 text-xs disabled:opacity-40 ${time === slot.time ? "border-orange-500 bg-orange-50" : "bg-white"}`} onClick={() => onTime(slot.time)}>{slot.label}{original ? " · current" : ""}</button>;
    })}</div>{!slots.length && <p className="text-sm text-muted-foreground">No available times on this date. Choose another day.</p>}</div>
    <p className="text-xs text-muted-foreground">Uses the clinic’s hours, closures and existing bookings. Availability is checked again before saving.</p>
  </section>;
}
