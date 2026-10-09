import { expect, test } from "bun:test";
import { DemoClinicStore, createDemoSnapshot, DEMO_CLINIC_ID, isDemoClinicPath } from "./demo-clinic";
import { configurationOf, schedulingWarnings } from "./clinic-schedule";
import { historySummary } from "./calendar-history";

test("seeds fictional patients and a conflict-free future calendar", () => {
  const state = createDemoSnapshot();
  expect(state.appointments).toHaveLength(12);
  expect(state.appointments.every(a => a.clinic_id === DEMO_CLINIC_ID && a.lead_id === null && a.patient_phone === null && a.patient_email?.endsWith("@example.invalid"))).toBe(true);
  expect(state.appointments.filter(a => !a.outcome)).toHaveLength(8);
  expect(state.schedule.appointments).toHaveLength(11);
  expect(schedulingWarnings(state.schedule)).toEqual([]);
});
test("rescheduling keeps list and calendar in sync, validates overlaps and logs before/after", async () => {
  const store = new DemoClinicStore(), a = store.getSnapshot().appointments[0];
  store.reschedule(a.id, a.appointment_date, "09:30");
  expect(store.getSnapshot().appointments[0].appointment_time).toBe("09:30");
  expect(store.getSnapshot().schedule.appointments[0].appointment_time).toBe("09:30");
  expect(historySummary((await store.loadHistory({})).entries[0])).toContain("Rescheduled from 10am to 9:30am");
  expect(() => store.reschedule(a.id, a.appointment_date, "13:00")).toThrow("available");
  expect(() => store.patchAppointment("real-patient-id", { outcome: "show" })).toThrow("not a demo");
});
test("notes, outcomes, requests and resets remain per-instance and disappear on reset", () => {
  const one = new DemoClinicStore(), two = new DemoClinicStore(), a = one.getSnapshot().appointments[0];
  one.addNote(a.id, "Training note");
  one.recordOutcome(a.id, "proceeded", "Training consult");
  one.patchAppointment(a.id, { chase_status: "requested", chase_note: "Training request" });
  expect(one.notesFor(a.id)).toHaveLength(1);
  expect(two.notesFor(a.id)).toHaveLength(0);
  expect(two.getSnapshot().appointments[0].outcome).toBe(null);
  expect(one.getSnapshot().appointments[0].refund_status).toBe("refunded_manual");
  expect(() => one.recordOutcome(a.id, "noshow")).toThrow("already");
  one.patchAppointment(a.id, { outcome: "disqualified" });
  expect(one.getSnapshot().schedule.appointments.some(s => s.id === a.id)).toBe(false);
  one.reset();
  expect(one.getSnapshot().appointments[0].outcome).toBe(null);
  expect(one.notesFor(a.id)).toHaveLength(0);
});
test("blocks, hours, settings, undo and history run against memory only", async () => {
  const store = new DemoClinicStore();
  const original = store.getSnapshot().schedule, day = store.getSnapshot().firstDate;
  const blocked = await store.saveSchedule({ action: "block", dates: [day], start: "15:00", end: "16:00" }, original.version);
  expect(blocked.blocks).toHaveLength(2);
  expect(historySummary((await store.loadHistory({ date: day })).entries[0])).toContain("Blocked time: 3pm–4pm");
  await expect(store.saveSchedule({ action: "block", dates: [day], start: "10:00", end: "11:00" }, blocked.version)).rejects.toThrow("patient is booked");
  await expect(store.saveSchedule({ action: "hours", dates: [day], start: "09:00", end: "17:00", closed: false }, original.version)).rejects.toThrow("changed");
  const undone = await store.saveSchedule({ action: "restore", configuration: configurationOf(original) }, blocked.version);
  expect(undone.blocks).toEqual(original.blocks);
  const settings = await store.saveSchedule({ action: "settings", consultation_minutes: 60, buffer_minutes: 15, apply_to_existing: true }, undone.version);
  expect(settings.appointments[0].consultation_duration_minutes).toBe(60);
  expect(store.getSnapshot().appointments[0].consultation_duration_minutes).toBe(60);
  const history = await store.loadHistory({});
  expect(history.entries.map(e => Number(e.id))).toEqual(history.entries.map(e => Number(e.id)).sort((a, b) => b - a));
  expect((await store.loadHistory({ before: history.entries[1].id })).entries.every(e => Number(e.id) < Number(history.entries[1].id))).toBe(true);
});
test("only the exact demo route bypasses live providers", () => {
  expect(isDemoClinicPath("/demo-clinic")).toBe(true);
  expect(isDemoClinicPath("/demo-clinic/")).toBe(true);
  expect(isDemoClinicPath("/clinic-portal")).toBe(false);
  expect(isDemoClinicPath("/demo-clinic/anything")).toBe(false);
});
