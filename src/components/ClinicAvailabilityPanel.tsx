import { useCallback } from "react";
import { fetchCalendarHistory } from "@/lib/clinic-schedule-api";
import type { CalendarHistoryLoader } from "@/lib/calendar-history";
import { ClinicAvailabilityCalendar } from "./ClinicAvailabilityCalendar";
import { useClinicSchedule } from "@/hooks/useClinicSchedule";
import { isCalendarApprovalHost } from "@/lib/calendar-release";
import type { ExistingAppt } from "@/lib/slot-generation";
import { nameScheduleAppointments } from "@/lib/preview-appointment-identity";

export function ClinicAvailabilityPanel({ clinicId, appointments = [] }: { clinicId: string; appointments?: ExistingAppt[] }) {
  const loadHistory = useCallback<CalendarHistoryLoader>(options => fetchCalendarHistory(clinicId, options), [clinicId]);
  const preview = isCalendarApprovalHost();
  const { schedule, loading, error, reload, save } = useClinicSchedule(clinicId, preview);
  if (!schedule) return <div className="availability-calendar" role={error ? "alert" : "status"}>{loading ? "Loading availability…" : "Could not load availability. Please try again."}{error && <button onClick={reload}>Retry</button>}</div>;
  const named = { ...schedule, appointments: nameScheduleAppointments(schedule.appointments, appointments) };
  return <>
    {error && <div className="availability-error" role="status">Updates are temporarily unavailable. <button onClick={reload}>Retry</button></div>}
    <ClinicAvailabilityCalendar schedule={named} onSave={save} onRefresh={reload} preview={preview} loadHistory={loadHistory} />
  </>;
}
