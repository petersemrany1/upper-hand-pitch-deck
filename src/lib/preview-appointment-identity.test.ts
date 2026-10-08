import { expect, test } from "bun:test";
import { identifyPreviewAppointments, nameScheduleAppointments } from "./preview-appointment-identity";

const at = { appointment_date: "2099-10-28", appointment_time: "11:30:00" };
const patients = [{ ...at, id: "first", patient_name: "First Patient" }, { ...at, id: "second", patient_name: "Second Patient" }];

test("two bookings at the same time keep distinct identities and full names", () => {
  const appointments = identifyPreviewAppointments([{ ...at }, { ...at, appointment_time: "11:30" }], patients);
  expect(appointments.map(a => a.id)).toEqual(["first", "second"]);
  expect(nameScheduleAppointments(appointments, patients).map(a => a.patient_name)).toEqual(["First Patient", "Second Patient"]);
});
test("old preview duplicates are repaired without changing times or durations", () => {
  const old = [60, 90].map(consultation_duration_minutes => ({ ...at, id: "first", consultation_duration_minutes }));
  const repaired = identifyPreviewAppointments(old, patients);
  expect(repaired).toEqual([old[0], { ...old[1], id: "second" }]);
  expect(identifyPreviewAppointments(repaired, patients)).toEqual(repaired);
  expect(old[1].id).toBe("first");
});
test("repair cannot steal another booking's identity or remove unseen busy time", () => {
  const busy = [{ ...at, id: "first" }, { ...at, id: "first" }, { ...at, id: "second" }];
  const repaired = identifyPreviewAppointments(busy, patients);
  expect(repaired.map(a => a.id)).toEqual(["first", "preview-busy-1", "second"]);
  const named = nameScheduleAppointments(repaired, patients);
  expect(named[1].patient_name).toBeUndefined();
  expect(named).toHaveLength(3);
});
test("patient names prefer exact IDs over an earlier match at the same time", () => {
  expect(nameScheduleAppointments([{ ...at, id: "second" }], patients)[0].patient_name).toBe("Second Patient");
  expect(nameScheduleAppointments([{ ...at, id: "legacy" }], patients)[0].patient_name).toBeUndefined();
  expect(nameScheduleAppointments([{ ...at, id: "legacy" }], [patients[0]])[0].patient_name).toBe("First Patient");
});
