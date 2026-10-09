import { HISTORY_PAGE_SIZE, type CalendarHistoryPage } from "./calendar-history";
import { supabase } from "@/integrations/supabase/client";
import { applyScheduleCommand, futureScheduleSlots, type ClinicSchedule, type ScheduleCommand } from "./clinic-schedule";
import type { AvailabilityOverride, BlockedSlot, TradingHours } from "./slot-generation";

import { createPreviewScheduleStore } from "./preview-schedule-store";
import { identifyPreviewAppointments } from "./preview-appointment-identity";

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> };
export async function fetchCalendarHistory(clinicId: string, options: { before?: string; date?: string } = {}): Promise<CalendarHistoryPage> {
  const { data, error } = await (supabase as unknown as RpcClient).rpc("get_clinic_calendar_history", {
    p_clinic: clinicId, p_before: options.before ?? null, p_date: options.date ?? null, p_limit: HISTORY_PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Could not load calendar history.");
  return data as CalendarHistoryPage;
}
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

// Shared only within the approval browser/origin and signed-in account.
// No preview write consumes a pack, contacts a patient or writes to Supabase.
const stores = new Map<string, ReturnType<typeof createPreviewScheduleStore>>();
let previewAccount = "anonymous";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
let stopStore: (() => void) | undefined;
function activePreviewStore() {
  let store = stores.get(previewAccount);
  if (!store) {
    store = createPreviewScheduleStore(() => typeof window === "undefined" ? undefined : window.localStorage, {
      namespace: previewAccount,
      legacyStorage: () => typeof window === "undefined" ? undefined : window.sessionStorage,
      withLock: async (key, work) => {
        if (typeof window === "undefined") return work();
        if (!navigator.locks) throw new Error("This browser cannot safely share calendar changes. Use a current browser and try again.");
        return navigator.locks.request(key, work);
      },
      onExternalChange: refresh => {
        if (typeof window === "undefined") return () => {};
        const changed = (event: StorageEvent) => { if (event.storageArea === window.localStorage) refresh(event.key); };
        const focused = () => refresh(null);
        window.addEventListener("storage", changed);
        window.addEventListener("focus", focused);
        document.addEventListener("visibilitychange", focused);
        return () => {
          window.removeEventListener("storage", changed);
          window.removeEventListener("focus", focused);
          document.removeEventListener("visibilitychange", focused);
        };
      },
    });
    stores.set(previewAccount, store);
  }
  return store;
}
function setPreviewAccount(account: string) {
  if (account === previewAccount) return;
  stopStore?.();
  previewAccount = account;
  stopStore = listeners.size ? activePreviewStore().subscribe(notify) : undefined;
  notify();
}
let previewAuthStarted = false;
function startPreviewAuth() {
  if (typeof window === "undefined" || previewAuthStarted) return;
  previewAuthStarted = true;
  supabase.auth.onAuthStateChange((_event, session) => setPreviewAccount(session?.user.id ?? "anonymous"));
}
async function preparePreviewStore() {
  startPreviewAuth();
  if (typeof window !== "undefined") {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    setPreviewAccount(data.session?.user.id ?? "anonymous");
  }
  return activePreviewStore();
}
export const subscribePreviewSchedules = (listener: () => void) => {
  startPreviewAuth();
  listeners.add(listener);
  if (listeners.size === 1) stopStore = activePreviewStore().subscribe(notify);
  return () => { listeners.delete(listener); if (!listeners.size) { stopStore?.(); stopStore = undefined; } };
};
export const getPreviewSchedule = (clinicId: string) => activePreviewStore().get(clinicId);
export async function seedPreviewSchedule(schedule: ClinicSchedule) {
  return (await preparePreviewStore()).seed(schedule);
}
export async function savePreviewSchedule(clinicId: string, version: string, command: ScheduleCommand) {
  return activePreviewStore().update(clinicId, current => applyScheduleCommand(current, command), version);
}
export async function resetPreviewSchedule(schedule: ClinicSchedule) {
  const store = await preparePreviewStore();
  await store.seed(schedule);
  return store.update(schedule.clinic_id, () => ({ ...structuredClone(schedule), version: crypto.randomUUID() }));
}
export async function addPreviewAppointment(clinicId: string, date: string, time: string) {
  return activePreviewStore().update(clinicId, current => {
    if (!futureScheduleSlots(current, date).some(slot => slot.time === time)) throw new Error("That time is no longer available. Choose another time.");
    const next = structuredClone(current);
    next.appointments.push({ id: crypto.randomUUID(), appointment_date: date, appointment_time: time, consultation_duration_minutes: next.consultation_minutes, patient_name: "Preview patient" });
    next.version = crypto.randomUUID();
    return next;
  });
}

export async function loadApprovalSchedule(clinicId: string): Promise<ClinicSchedule> {
  const store = await preparePreviewStore();
  type VisibleAppointment = { id: string; appointment_date: string; appointment_time: string };
  async function repairIdentities(schedule: ClinicSchedule, visible?: VisibleAppointment[]) {
    if (new Set(schedule.appointments.map(a => a.id)).size === schedule.appointments.length) return schedule;
    if (!visible) {
      const result = await supabase.from("clinic_appointments").select("id,appointment_date,appointment_time").eq("clinic_id", clinicId);
      if (result.error) throw new Error(result.error.message);
      visible = result.data;
    }
    // Read the latest draft under the store lock, preserving any simultaneous edits.
    return store.update(clinicId, current => {
      const appointments = identifyPreviewAppointments(current.appointments, visible!);
      if (appointments.every((a, i) => a.id === current.appointments[i].id)) return current;
      return { ...current, appointments, version: crypto.randomUUID() };
    });
  }
  const existing = store.get(clinicId);
  if (existing) return repairIdentities(await store.seed(existing));
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
  const loaded = await store.seed({
    clinic_id: clinicId, clinic_name: clinic.data!.clinic_name, state: clinic.data!.state,
    consultation_minutes: boss ? 90 : 30, buffer_minutes: boss ? 30 : clinic.data!.min_appointment_gap_mins,
    trading: trading.data as TradingHours[], blocks: blocks.data as BlockedSlot[], overrides: overrides.data as AvailabilityOverride[],
    appointments: identifyPreviewAppointments((busy.data as { appointment_date: string; appointment_time: string }[]).map(a => ({ ...a, consultation_duration_minutes: boss ? 90 : 30 })), visibleAppointments.data ?? []),
    version: crypto.randomUUID(),
  });
  return repairIdentities(loaded, visibleAppointments.data ?? []);
}

export async function reschedulePreviewAppointment(clinicId: string, id: string, date: string, time: string) {
  return activePreviewStore().update(clinicId, current => {
    const appointment = current.appointments.find(a => a.id === id);
    if (!appointment) throw new Error("Could not find this appointment in the preview.");
    const withoutCurrent = { ...current, appointments: current.appointments.filter(a => a.id !== id) };
    if (!futureScheduleSlots(withoutCurrent, date, new Date(), appointment.consultation_duration_minutes ?? undefined).some(slot => slot.time === time)) throw new Error("That time is no longer available. Choose another time.");
    const next = structuredClone(current);
    Object.assign(next.appointments.find(a => a.id === id)!, { appointment_date: date, appointment_time: time });
    next.version = crypto.randomUUID();
    return next;
  });
}
