import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronRight, Search } from "lucide-react";
import { appointmentDuration, asDate, hhmmToMin, rangeLabel, type ClinicSchedule, type ScheduleAppointment } from "@/lib/clinic-schedule";
import { upcomingClinicAppointments } from "@/lib/clinic-upcoming-appointments";
import { sydneyTodayISO } from "@/lib/timezone";

export function ClinicUpcomingAppointments({ schedule, busy, onAppointment, onDate }: {
  schedule: ClinicSchedule;
  busy: boolean;
  onAppointment: (appointment: ScheduleAppointment) => void;
  onDate: (date: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());
  const id = useId();
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const appointments = upcomingClinicAppointments(schedule.appointments, now);
  const visible = appointments.filter(appointment => (appointment.patient_name || "Booked patient").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const groups = new Map<string, ScheduleAppointment[]>();
  for (const appointment of visible) groups.set(appointment.appointment_date, [...(groups.get(appointment.appointment_date) ?? []), appointment]);

  return <div className="availability-upcoming">
    <div className="availability-mobile-day-heading"><h3>Upcoming appointments</h3><p>{appointments.length} consultation{appointments.length === 1 ? "" : "s"} · Soonest first</p></div>
    {!!appointments.length && <label className="availability-upcoming-search"><Search size={18} aria-hidden="true" /><span className="availability-sr-only">Search upcoming patients</span><input type="search" placeholder="Search patients" value={search} onChange={event => setSearch(event.target.value)} /></label>}
    {search.trim() && <p className="availability-upcoming-results" role="status">{visible.length} matching appointment{visible.length === 1 ? "" : "s"}</p>}
    {[...groups].map(([date, patients]) => <section className="availability-upcoming-group" key={date} aria-labelledby={`${id}-${date}`}>
      <h4 id={`${id}-${date}`}>{date === sydneyTodayISO(now) ? "Today · " : ""}{asDate(date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</h4>
      <ol className="availability-mobile-agenda">{patients.map(appointment => {
        const from = hhmmToMin(appointment.appointment_time), minutes = appointmentDuration(appointment);
        return <li className="availability-upcoming-card" key={appointment.id}>
          <button className="availability-mobile-entry availability-mobile-entry-booked" disabled={busy} onClick={() => onAppointment(appointment)}>
            <span className="availability-mobile-entry-time">{rangeLabel(from, from + minutes)}</span>
            <strong>{appointment.patient_name || "Booked patient"}</strong><span className="availability-mobile-entry-detail">{minutes}-minute consultation · View details</span>
            <ChevronRight size={18} className="availability-upcoming-chevron" aria-hidden="true" />
          </button>
          <button className="availability-upcoming-view-day" disabled={busy} onClick={() => onDate(date)}><CalendarDays size={16} aria-hidden="true" />View in calendar</button>
        </li>;
      })}</ol>
    </section>)}
    {!visible.length && <div className="availability-mobile-empty"><CalendarDays size={28} aria-hidden="true" /><strong>{search.trim() ? "No matching patients" : "No upcoming appointments"}</strong><p>{search.trim() ? "Try another name to find an appointment." : "New booked consultations will appear here."}</p>{search.trim() && <button onClick={() => setSearch("")}>Clear search</button>}</div>}
  </div>;
}
