import { expect, test } from "bun:test";
import { reclassificationInput } from "./reclassification";
import { DemoClinicStore } from "./demo-clinic";
import { partnerViewSearch } from "./partner-view";

const appointmentId = "00000000-0000-4000-8000-000000000010";
test("request requires valid appointment, substantial details and explicit acknowledgement", () => {
  const valid = { appointmentId, reason: "The criterion in our agreement was not met.", acknowledged: true };
  expect(reclassificationInput.parse(valid)).toEqual(valid);
  for (const bad of [{ ...valid, reason: "short" }, { ...valid, reason: " ".repeat(30) }, { ...valid, reason: "x".repeat(4001) }, { ...valid, acknowledged: false }, { ...valid, appointmentId: "bad" }]) expect(reclassificationInput.safeParse(bad).success).toBe(false);
  expect(partnerViewSearch({ viewClinic: appointmentId, appointmentId })).toEqual({ viewClinic: appointmentId, appointmentId });
  expect(partnerViewSearch({ appointmentId: "invalid" })).toEqual({});
});
test("demo requests survive reopening, cannot duplicate, leave counts unchanged and reset locally", () => {
  const store = new DemoClinicStore(), other = new DemoClinicStore();
  const before = structuredClone(store.getSnapshot());
  const id = before.appointments[8].id;
  expect(() => store.requestReclassification(id, "Supporting details for review", false)).toThrow();
  const request = store.requestReclassification(id, "Supporting details for review", true);
  expect(store.requestReclassification(id, "Different supporting details", true)).toEqual(request);
  expect(store.reclassificationFor(id)).toEqual(request);
  expect(other.reclassificationFor(id)).toBe(null);
  expect(store.getSnapshot()).toEqual(before);
  expect(() => store.requestReclassification(before.appointments[11].id, "Supporting details for review", true)).toThrow("already disqualified");
  store.reset(); expect(store.reclassificationFor(id)).toBe(null);
});
