import { describe, expect, test } from "bun:test";
import { checkoutDoctorName } from "./checkout-doctor";

const doctor = { id: "doctor", name: "Dr Jai", title: "Hair Transplant Surgeon", is_active: true, conducts_consultations: false };
const consultant = { id: "consultant", name: "Debra Best", title: "Hair Regrowth Specialist", is_active: true, conducts_consultations: true };

describe("checkout consultation provider", () => {
  test("uses the person recorded on the booking instead of the first roster member", () => {
    expect(checkoutDoctorName({ doctor_id: "consultant", doctor_name: "Debra Best — Hair Regrowth Specialist" }, [doctor, consultant]))
      .toBe("Debra Best — Hair Regrowth Specialist");
  });
  test("resolves a booking with an ID but no saved label", () => {
    expect(checkoutDoctorName({ doctor_id: "consultant", doctor_name: null }, [doctor, consultant]))
      .toBe("Debra Best — Hair Regrowth Specialist");
  });
  test("does not replace a missing assigned provider with another person", () => {
    expect(checkoutDoctorName({ doctor_id: "missing", doctor_name: null }, [consultant])).toBeNull();
  });
  test("keeps a historical booking's recorded provider after roster deactivation", () => {
    expect(checkoutDoctorName({ doctor_id: "consultant", doctor_name: "Debra Best" }, [{ ...consultant, is_active: false }])).toBe("Debra Best");
  });
  test("an unbooked link uses the sole active consultation provider, not the surgeon", () => {
    expect(checkoutDoctorName(null, [doctor, consultant])).toBe("Debra Best — Hair Regrowth Specialist");
  });
  test("does not guess when more than one consultation provider is available", () => {
    expect(checkoutDoctorName(null, [consultant, { ...doctor, conducts_consultations: true }])).toBeNull();
  });
  test("does not show an inactive default provider", () => {
    expect(checkoutDoctorName(null, [{ ...consultant, is_active: false }])).toBeNull();
  });
});
