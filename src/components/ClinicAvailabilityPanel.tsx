import { ClinicAvailabilityCalendar } from "./ClinicAvailabilityCalendar";
import { useClinicSchedule } from "@/hooks/useClinicSchedule";
import { isCalendarApprovalHost } from "@/lib/calendar-release";
import { hhmmToMin, type ExistingAppt } from "@/lib/slot-generation";

export function ClinicAvailabilityPanel({ clinicId, appointments = [] }: { clinicId: string; appointments?: ExistingAppt[] }) {
  const preview = isCalendarApprovalHost();
  const { schedule, loading, error, reload, save } = useClinicSchedule(clinicId, preview);
  if (!schedule) return <div className="availability-calendar" role={error ? "alert" : "status"}>{loading ? "Loading availability…" : "Could not load availability. Please try again."}{error && <button onClick={reload}>Retry</button>}</div>;
  const named = { ...schedule, appointments: schedule.appointments.map(a => ({ ...a, patient_name: appointments.find(p => p.id === a.id || p.appointment_date === a.appointment_date && hhmmToMin(p.appointment_time) === hhmmToMin(a.appointment_time))?.patient_name ?? a.patient_name })) };
  return <>
    {error && <div className="availability-error" role="status">Updates are temporarily unavailable. <button onClick={reload}>Retry</button></div>}
    <ClinicAvailabilityCalendar schedule={named} onSave={save} onRefresh={reload} preview={preview} />
  </>;
}
