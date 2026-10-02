import { describe, expect, test } from "bun:test";
import { consultationMemberLabel, consultationProviders, treatingSurgeons } from "./consultation-team";

describe("consultation member labels", () => {
  test("uses Debra's recorded role without giving her a medical title", () => {
    expect(consultationMemberLabel({ name: "Debra Best", title: "Hair Regrowth Specialist" }))
      .toBe("Debra Best — Hair Regrowth Specialist");
  });
  test("preserves existing doctor names and titles", () => {
    expect(consultationMemberLabel({ name: "Dr Jai", title: "Hair Transplant Surgeon" }))
      .toBe("Dr Jai — Hair Transplant Surgeon");
  });
  test("does not invent Russell's title or a missing member", () => {
    expect(consultationMemberLabel({ name: "Russell", title: null })).toBe("Russell");
    expect(consultationMemberLabel(null)).toBe("");
    expect(consultationMemberLabel({ name: "  ", title: "Specialist" })).toBe("");
  });
});

describe("consultation and procedure roles", () => {
  const debra = { name: "Debra Best", conducts_consultations: true, performs_procedures: false };
  const jai = { name: "Dr Jai", conducts_consultations: false, performs_procedures: true };
  const doctorWhoDoesBoth = { name: "Dr Smith", conducts_consultations: true, performs_procedures: true };
  test("Boss bookings only offer Debra while surgeon details remain available", () => {
    expect(consultationProviders([jai, debra])).toEqual([debra]);
    expect(treatingSurgeons([jai, debra])).toEqual([jai]);
  });
  test("a doctor may both consult and perform procedures", () => {
    expect(consultationProviders([doctorWhoDoesBoth])).toEqual([doctorWhoDoesBoth]);
    expect(treatingSurgeons([doctorWhoDoesBoth])).toEqual([doctorWhoDoesBoth]);
  });
  test("a surgeon-only team offers no consultation provider", () => {
    expect(consultationProviders([jai])).toEqual([]);
    expect(treatingSurgeons([debra])).toEqual([]);
  });
});
