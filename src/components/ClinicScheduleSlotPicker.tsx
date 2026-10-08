import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { asDate, formatDay, futureScheduleSlots, validDate, type ClinicSchedule } from "@/lib/clinic-schedule";
import { ymdLocal, holidayLabelFor } from "@/lib/slot-generation";
import { sydneyTodayISO } from "@/lib/timezone";
import { dateInBookingWindow, type ClinicBookingWindow } from "@/lib/clinic-booking-window";

export function ClinicScheduleSlotPicker({ schedule, date, time, onDate, onTime, bookingWindow = null, excludeAppointmentId, consultationMinutes, disabled = false }: {
  schedule: ClinicSchedule; date: string; time: string; onDate: (date: string) => void; onTime: (time: string) => void;
  bookingWindow?: ClinicBookingWindow; excludeAppointmentId?: string; consultationMinutes?: number; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setClock(new Date()), 30000); return () => clearInterval(timer); }, []);
  const effective = useMemo(() => excludeAppointmentId ? { ...schedule, appointments: schedule.appointments.filter(a => a.id !== excludeAppointmentId) } : schedule, [schedule, excludeAppointmentId]);
  const today = sydneyTodayISO(clock);
  const forDate = (day: string) => dateInBookingWindow(bookingWindow, day, today) ? futureScheduleSlots(effective, day, clock, consultationMinutes) : [];
  const available = forDate(date);
  const selectedDate = validDate(date) ? asDate(date) : undefined;
  const selectedTimeValid = !disabled && available.some(slot => slot.time === time);
  useEffect(() => { if (time && !selectedTimeValid) onTime(""); }, [time, selectedTimeValid, onTime]);
  const holiday = selectedDate ? holidayLabelFor(selectedDate, schedule.overrides, schedule.state) : null;
  return <div className="clinic-schedule-picker" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, color: "#24364f", fontSize: 13 }}>
    <div><label style={{ display: "block", marginBottom: 5 }}>Booking date</label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" aria-label="Choose booking date" disabled={disabled} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 10px", border: "1px solid #dce3ec", borderRadius: 7, background: "#fff", minHeight: 42 }}>{selectedDate ? formatDay(date) : "Pick a date"}<CalendarIcon size={15} /></button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" defaultMonth={selectedDate} selected={selectedDate} onSelect={day => { if (day) { onDate(ymdLocal(day)); onTime(""); setOpen(false); } }} disabled={day => disabled || ymdLocal(day) < today || !forDate(ymdLocal(day)).length} modifiers={{ hasSlots: day => forDate(ymdLocal(day)).length > 0 }} modifiersClassNames={{ hasSlots: "bg-emerald-50 text-emerald-800" }} initialFocus /><p style={{ padding: "0 12px 12px", fontSize: 11, color: "#617086" }}>Only dates with available appointments can be selected.</p></PopoverContent></Popover></div>
    <label>Time slot<select aria-label="Time slot" disabled={disabled || !available.length} value={selectedTimeValid ? time : ""} onChange={e => onTime(e.target.value)} style={{ display: "block", width: "100%", padding: "9px 10px", marginTop: 5, border: "1px solid #dce3ec", borderRadius: 7, background: "#fff", minHeight: 42 }}><option value="">{!date ? "Pick a date first" : available.length ? "Choose a time" : "No available times"}</option>{available.map(slot => <option key={slot.time} value={slot.time}>{slot.label}</option>)}</select></label>
    <p style={{ gridColumn: "1/-1", margin: 0, color: "#617086", fontSize: 12 }}>{holiday ? `Closed for ${holiday}.` : date && !available.length ? "No appointment fits on this date. Choose another day." : `${consultationMinutes ?? schedule.consultation_minutes}-minute consultation${schedule.buffer_minutes ? ` · ${schedule.buffer_minutes}-minute buffer between patients` : ""}`}</p>
  </div>;
}
