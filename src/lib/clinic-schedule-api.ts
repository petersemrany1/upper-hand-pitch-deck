import { supabase } from "@/integrations/supabase/client";
import { applyScheduleCommand, futureScheduleSlots, type ClinicSchedule, type ScheduleCommand } from "./clinic-schedule";
import type { AvailabilityOverride, BlockedSlot, TradingHours } from "./slot-generation";

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };
export async function fetchClinicSchedule(clinicId: string): Promise<ClinicSchedule> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc("get_clinic_schedule", { p_clinic: clinicId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not load clinic availability.");
  return data as ClinicSchedule;
}
export async function saveClinicSchedule(clinicId: string, version: string, command: ScheduleCommand): Promise<ClinicSchedule> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc("save_clinic_schedule", { p_clinic: clinicId, p_version: version, p_command: command });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The calendar save could not be confirmed. Refresh before trying again.");
  return data as ClinicSchedule;
}

// Approval data lives only in this browser session. It never calls Supabase,
// consumes a pack, sends a handover/reminder, or changes a patient's booking.
const previewSchedules = new Map<string, ClinicSchedule>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export const subscribePreviewSchedules = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getPreviewSchedule = (clinicId: string) => previewSchedules.get(clinicId);
export function seedPreviewSchedule(schedule: ClinicSchedule) {
  if (!previewSchedules.has(schedule.clinic_id)) { previewSchedules.set(schedule.clinic_id, structuredClone(schedule)); notify(); }
  return previewSchedules.get(schedule.clinic_id)!;
}
export async function savePreviewSchedule(clinicId: string, version: string, command: ScheduleCommand) {
  const current = previewSchedules.get(clinicId);
  if (!current || current.version !== version) throw new Error("This calendar changed while you were editing. Refresh and try again.");
  const next = applyScheduleCommand(current, command);
  previewSchedules.set(clinicId, next); notify();
  return next;
}
export function resetPreviewSchedule(schedule: ClinicSchedule) { previewSchedules.set(schedule.clinic_id, structuredClone(schedule)); notify(); }
export function addPreviewAppointment(clinicId: string, date: string, time: string) {
  const current = previewSchedules.get(clinicId);
  if (!current) throw new Error("Choose a preview clinic first.");
  if (!futureScheduleSlots(current, date).some(slot => slot.time === time)) throw new Error("That time is no longer available. Choose another time.");
  const next = structuredClone(current);
  next.appointments.push({ id: crypto.randomUUID(), appointment_date: date, appointment_time: time, consultation_duration_minutes: next.consultation_minutes, patient_name: "Preview patient" });
  next.version = crypto.randomUUID(); previewSchedules.set(clinicId, next); notify();
}

export async function loadApprovalSchedule(clinicId: string): Promise<ClinicSchedule> {
  const existing = getPreviewSchedule(clinicId);
  if (existing) return existing;
  const [clinic, trading, blocks, overrides, busy, visibleAppointments] = await Promise.all([
    supabase.from("partner_clinics").select("clinic_name,state,min_appointment_gap_mins").eq("id", clinicId).single(),
    supabase.from("clinic_trading_hours").select("*").eq("clinic_id", clinicId),
    supabase.from("clinic_blocked_slots").select("*").eq("clinic_id", clinicId),
    supabase.from("clinic_availability").select("*").eq("clinic_id", clinicId),
    (supabase as unknown as RpcClient).rpc("booking_busy_times", { p_clinic: clinicId }),
    supabase.from("clinic_appointments").select("id,appointment_date,appointment_time").eq("clinic_id", clinicId),
  ]);
  const error = clinic.error || trading.error || blocks.error || overrides.error || busy.error || visibleAppointments.error;
  if (error) throw new Error(error.message);
  const boss = clinicId === "9ac8fa05-c4b0-4faa-b519-f6a347956fb1";
  return seedPreviewSchedule({
    clinic_id: clinicId, clinic_name: clinic.data!.clinic_name, state: clinic.data!.state,
    consultation_minutes: boss ? 90 : 30, buffer_minutes: boss ? 30 : clinic.data!.min_appointment_gap_mins,
    trading: trading.data as TradingHours[], blocks: blocks.data as BlockedSlot[], overrides: overrides.data as AvailabilityOverride[],
    appointments: (busy.data as { appointment_date: string; appointment_time: string }[]).map((a, i) => ({ ...a, id: visibleAppointments.data?.find(p => p.appointment_date === a.appointment_date && p.appointment_time === a.appointment_time)?.id ?? `preview-${i}`, consultation_duration_minutes: boss ? 90 : 30 })),
    version: crypto.randomUUID(),
  });
}

export function reschedulePreviewAppointment(clinicId: string, id: string, date: string, time: string) {
  const current = previewSchedules.get(clinicId);
  const appointment = current?.appointments.find(a => a.id === id);
  if (!current || !appointment) throw new Error("Could not find this appointment in the preview.");
  const withoutCurrent = { ...current, appointments: current.appointments.filter(a => a.id !== id) };
  if (!futureScheduleSlots(withoutCurrent, date, new Date(), appointment.consultation_duration_minutes ?? undefined).some(slot => slot.time === time)) throw new Error("That time is no longer available. Choose another time.");
  const next = structuredClone(current);
  Object.assign(next.appointments.find(a => a.id === id)!, { appointment_date: date, appointment_time: time });
  next.version = crypto.randomUUID(); previewSchedules.set(clinicId, next); notify();
}
