import type { ClinicAppointment, ApptNote } from "@/components/ClinicPortalView";
import { addDays, asDate, applyScheduleCommand, futureScheduleSlots, type ClinicSchedule, type ScheduleCommand } from "./clinic-schedule";
import { sydneyTodayISO } from "./timezone";
import type { CalendarHistoryData, CalendarHistoryEntry, CalendarHistoryLoader } from "./calendar-history";

// Intentionally not a database UUID. This clinic exists only in this tab's memory.
export const DEMO_CLINIC_ID = "training-demo-clinic";
export const DEMO_CLINIC_NAME = "Demo Clinic";
export const isDemoClinicPath = (path: string) => path.replace(/\/$/, "") === "/demo-clinic";
export type DemoSnapshot = { appointments: ClinicAppointment[]; schedule: ClinicSchedule; notes: ApptNote[]; history: CalendarHistoryEntry[]; firstDate: string; startedAt: string };

export function createDemoSnapshot(now = new Date()): DemoSnapshot {
  const today = sydneyTodayISO(now);
  const monday = addDays(today, (8 - asDate(today).getDay()) % 7 || 7);
  const names = ["Alex Morgan", "Jamie Carter", "Taylor Bennett", "Jordan Lewis", "Sam Wilson", "Casey Mitchell", "Riley Parker", "Cameron Ellis", "Charlie Brooks", "Morgan Reed", "Avery Hayes", "Drew Collins"];
  const appointments: ClinicAppointment[] = names.map((patient_name, i) => ({
    id: `demo-patient-${i + 1}`, clinic_id: DEMO_CLINIC_ID, lead_id: null, patient_name,
    patient_phone: null, patient_email: `${patient_name.toLowerCase().replace(/ /g, ".")}@example.invalid`,
    appointment_date: i < 8 ? addDays(monday, i < 6 ? Math.floor(i / 2) : i - 3) : addDays(today, -(i - 7)),
    appointment_time: i % 2 ? "13:00" : "10:00", consultation_duration_minutes: 90,
    intel_notes: "Fictional patient for portal training. Interested in discussing the consultation process and next steps.",
    outcome: i === 8 ? "show" : i === 9 ? "proceeded" : i === 10 ? "noshow" : i === 11 ? "disqualified" : null,
    consult_summary: i === 8 || i === 9 ? "Example consultation completed. Options and next steps discussed." : null,
    deposit_amount: 75, stripe_payment_intent_id: null,
    refund_status: i === 8 || i === 9 || i === 11 ? "refunded_manual" : null,
    refund_processed_at: i === 8 || i === 9 || i === 11 ? now.toISOString() : null, stripe_refund_id: null,
    disqualified_reason: i === 11 ? "Example: not proceeding with a consultation." : null,
    booked_at: new Date(now.getTime() - 14 * 86400000).toISOString(),
  }));
  const schedule: ClinicSchedule = {
    clinic_id: DEMO_CLINIC_ID, clinic_name: DEMO_CLINIC_NAME, state: "NSW", consultation_minutes: 90, buffer_minutes: 30,
    version: "demo-initial", trading: Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, open_time: "09:00", close_time: "17:00", is_closed: day_of_week > 4, consult_duration_mins: 15 })),
    blocks: [{ id: "demo-block-1", slot_date: addDays(monday, 3), slot_start: "09:00", slot_end: "10:00", is_recurring: false, recur_day_of_week: null }],
    overrides: [], appointments: appointments.filter(a => a.outcome !== "disqualified"),
  };
  const startedAt = now.toISOString();
  const history: CalendarHistoryEntry[] = appointments.map((a, i) => ({ id: String(i + 1), entity_type: "appointment", entity_id: a.id, operation: "added", recorded_at: a.booked_at!, actor_name: "Demo Clinic", actor_role: "clinic", before_data: null, after_data: appointmentHistory(a) }));
  history.push({ id: "13", entity_type: "block", entity_id: "demo-block-1", operation: "added", recorded_at: startedAt, actor_name: "Demo Clinic", actor_role: "clinic", before_data: null, after_data: { ...schedule.blocks[0] } as CalendarHistoryData });
  return { appointments, schedule, notes: [], history: history.reverse(), firstDate: monday, startedAt };
}
function appointmentHistory(a: ClinicAppointment): CalendarHistoryData {
  return { patient_name: a.patient_name, appointment_date: a.appointment_date, appointment_time: a.appointment_time, consultation_duration_minutes: a.consultation_duration_minutes ?? 90, calendar_status: a.outcome === "disqualified" ? "disqualified" : "booked" };
}

/** No storage, auth, database, fetch, messages or payment dependencies. */
export class DemoClinicStore {
  private state: DemoSnapshot;
  private listeners = new Set<() => void>();
  constructor(now = new Date()) { this.state = createDemoSnapshot(now); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: DemoSnapshot) { this.state = next; this.listeners.forEach(listener => listener()); }
  private entry(entity_type: CalendarHistoryEntry["entity_type"], entity_id: string, before_data: CalendarHistoryData | null, after_data: CalendarHistoryData | null, id: number): CalendarHistoryEntry {
    return { id: String(id), entity_type, entity_id, operation: !before_data ? "added" : !after_data ? "removed" : "changed", recorded_at: new Date().toISOString(), actor_name: DEMO_CLINIC_NAME, actor_role: "clinic", before_data, after_data };
  }
  private nextId() { return Number(this.state.history[0]?.id ?? 0) + 1; }
  private appointment(id: string) {
    const a = this.state.appointments.find(a => a.id === id && a.clinic_id === DEMO_CLINIC_ID);
    if (!a) throw new Error("This is not a demo appointment.");
    return a;
  }
  patchAppointment(id: string, changes: Partial<Pick<ClinicAppointment, "outcome" | "consult_summary" | "refund_status" | "refund_processed_at" | "chase_status" | "chase_requested_at" | "chase_note" | "disqualified_reason" | "appointment_date" | "appointment_time">>) {
    const before = this.appointment(id), after = { ...before, ...changes };
    const appointments = this.state.appointments.map(a => a.id === id ? after : a);
    const beforeData = appointmentHistory(before), afterData = appointmentHistory(after);
    const history = JSON.stringify(beforeData) === JSON.stringify(afterData) ? this.state.history : [this.entry("appointment", id, beforeData, afterData, this.nextId()), ...this.state.history];
    this.publish({ ...this.state, appointments, history, schedule: { ...this.state.schedule, version: crypto.randomUUID(), appointments: appointments.filter(a => a.outcome !== "disqualified") } });
    return { success: true as const };
  }
  checkOutcome(id: string) {
    if (this.appointment(id).outcome) throw new Error("An outcome has already been recorded. Reset it first.");
    return { success: true as const };
  }
  recordOutcome(id: string, outcome: "show" | "proceeded" | "noshow", summary?: string) {
    this.checkOutcome(id);
    return this.patchAppointment(id, { outcome, ...(summary !== undefined ? { consult_summary: summary, refund_status: "refunded_manual", refund_processed_at: new Date().toISOString() } : {}) });
  }
  reschedule(id: string, date: string, time: string) {
    const a = this.appointment(id);
    const schedule = { ...this.state.schedule, appointments: this.state.schedule.appointments.filter(a => a.id !== id) };
    if (!futureScheduleSlots(schedule, date, new Date(), a.consultation_duration_minutes).some(s => s.time === time)) throw new Error("Choose an available appointment time.");
    this.patchAppointment(id, { appointment_date: date, appointment_time: time });
  }
  notesFor(id: string) { this.appointment(id); return this.state.notes.filter(n => n.appointment_id === id); }
  addNote(id: string, body: string) {
    this.appointment(id);
    if (!body.trim()) return;
    const note: ApptNote = { id: crypto.randomUUID(), appointment_id: id, clinic_id: DEMO_CLINIC_ID, author_type: "clinic", author_name: DEMO_CLINIC_NAME, body: body.trim(), created_at: new Date().toISOString() };
    this.publish({ ...this.state, notes: [note, ...this.state.notes] });
  }
  deleteNote(id: string) { this.publish({ ...this.state, notes: this.state.notes.filter(n => n.id !== id) }); }
  deleteAppointment(id: string) {
    const a = this.appointment(id);
    this.publish({ ...this.state, appointments: this.state.appointments.filter(a => a.id !== id), schedule: { ...this.state.schedule, version: crypto.randomUUID(), appointments: this.state.schedule.appointments.filter(a => a.id !== id) }, history: [this.entry("appointment", id, appointmentHistory(a), null, this.nextId()), ...this.state.history] });
  }
  saveSchedule = async (command: ScheduleCommand, version: string) => {
    const before = this.state.schedule;
    if (version !== before.version) throw new Error("The demo calendar has changed. Try again.");
    const schedule = applyScheduleCommand(before, command);
    const entries: CalendarHistoryEntry[] = [];
    let id = this.nextId();
    const diff = (type: CalendarHistoryEntry["entity_type"], oldRows: Record<string, unknown>[], newRows: Record<string, unknown>[], key: string) => {
      for (const value of new Set([...oldRows, ...newRows].map(row => String(row[key])))) {
        const old = oldRows.find(row => String(row[key]) === value), next = newRows.find(row => String(row[key]) === value);
        if (JSON.stringify(old) !== JSON.stringify(next)) entries.push(this.entry(type, value, old as CalendarHistoryData ?? null, next as CalendarHistoryData ?? null, id++));
      }
    };
    diff("block", before.blocks, schedule.blocks, "id");
    diff("hours", before.overrides, schedule.overrides, "override_date");
    diff("weekly_hours", before.trading, schedule.trading, "day_of_week");
    if (before.consultation_minutes !== schedule.consultation_minutes || before.buffer_minutes !== schedule.buffer_minutes) entries.push(this.entry("settings", DEMO_CLINIC_ID, { consultation_duration_minutes: before.consultation_minutes, buffer_minutes: before.buffer_minutes }, { consultation_duration_minutes: schedule.consultation_minutes, buffer_minutes: schedule.buffer_minutes }, id++));
    const appointments = this.state.appointments.map(a => {
      const scheduled = schedule.appointments.find(s => s.id === a.id);
      return scheduled ? { ...a, consultation_duration_minutes: scheduled.consultation_duration_minutes ?? a.consultation_duration_minutes } : a;
    });
    diff("appointment", this.state.appointments.map(a => ({ id: a.id, ...appointmentHistory(a) })), appointments.map(a => ({ id: a.id, ...appointmentHistory(a) })), "id");
    this.publish({ ...this.state, schedule, appointments, history: [...entries.reverse(), ...this.state.history] });
    return schedule;
  };
  loadHistory: CalendarHistoryLoader = async ({ before, date }) => ({
    started_at: this.state.startedAt,
    entries: this.state.history.filter(entry => {
      if (before && Number(entry.id) >= Number(before)) return false;
      if (!date || ["settings", "weekly_hours"].includes(entry.entity_type)) return true;
      return [entry.before_data, entry.after_data].some(data => data && [data.appointment_date, data.slot_date, data.override_date].includes(date));
    }).slice(0, 51),
  });
  reset = () => this.publish(createDemoSnapshot());
}
