import { useCallback } from "react";
import { useClinicSchedule } from "@/hooks/useClinicSchedule";
import { useQuietRefresh } from "@/hooks/useQuietRefresh";
import { getClinicBookingWindow } from "@/utils/clinic-booking-window.functions";
import { isCalendarApprovalHost } from "@/lib/calendar-release";
import { ClinicScheduleSlotPicker } from "./ClinicScheduleSlotPicker";

export function ConnectedScheduleSlotPicker(props: { clinicId: string; date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void; excludeAppointmentId?: string; consultationMinutes?: number; enforceBookingWindow?: boolean }) {
  const preview = isCalendarApprovalHost();
  const { schedule, loading, error, reload } = useClinicSchedule(props.clinicId, preview);
  const loadWindow = useCallback(() => props.enforceBookingWindow === false ? Promise.resolve(null) : getClinicBookingWindow({ data: { clinicId: props.clinicId } }), [props.clinicId, props.enforceBookingWindow]);
  const { data: bookingWindow, error: windowError, reload: reloadWindow } = useQuietRefresh({ queryKey: props.clinicId, load: loadWindow, enabled: !!props.clinicId });
  if (!props.clinicId) return <p style={{ fontSize: 12, color: "#617086" }}>Pick a clinic first.</p>;
  if (error || windowError) return <div role="alert" style={{ color: "#a03631", fontSize: 12 }}>Could not check availability. <button onClick={() => { reload(); reloadWindow(); }}>Retry</button></div>;
  if (loading || !schedule || bookingWindow === undefined) return <p role="status" style={{ fontSize: 12, color: "#617086" }}>Checking available times…</p>;
  return <><ClinicScheduleSlotPicker {...props} schedule={schedule} bookingWindow={bookingWindow} />{preview && <p style={{ fontSize: 11, color: "#785217", marginTop: 8 }}>Approval preview · bookings stay in this preview.</p>}</>;
}
