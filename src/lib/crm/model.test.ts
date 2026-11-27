import { describe, expect, it } from "vitest";
import { HAIR_STAGES, LEGAL_STAGES, matchesSearch, phaseOf, summarise, type CrmRecord } from "./model";

const rec = (over: Partial<CrmRecord>): CrmRecord => ({
  business: "hair",
  id: "1",
  name: "Clinic",
  person: null,
  phone: null,
  email: null,
  city: null,
  stage: "Not Started",
  createdAt: "2026-11-01T00:00:00Z",
  nextAt: null,
  source: null,
  ...over,
});

describe("crm model", () => {
  it("maps both businesses onto the same phases", () => {
    expect(phaseOf(rec({ business: "hair", stage: "Zoom Set" }))).toBe("meeting");
    expect(phaseOf(rec({ business: "legal", stage: "calendly_booked" }))).toBe("meeting");
    expect(phaseOf(rec({ business: "hair", stage: "Pay on Conversion" }))).toBe("won");
    expect(phaseOf(rec({ business: "legal", stage: "dead" }))).toBe("lost");
  });

  it("never treats an unknown stage as won or lost", () => {
    expect(phaseOf(rec({ business: "legal", stage: "something_new" }))).toBe("contacting");
  });

  it("has unique stage values per business", () => {
    for (const list of [HAIR_STAGES, LEGAL_STAGES]) {
      expect(new Set(list.map((s) => s.value)).size).toBe(list.length);
    }
  });

  it("summarises open, meetings, signed and lost", () => {
    const s = summarise([
      rec({ stage: "Not Started" }),
      rec({ stage: "Zoom Set" }),
      rec({ stage: "Contract Sent" }),
      rec({ stage: "Signed" }),
      rec({ stage: "Not Applicable" }),
    ]);
    expect(s).toEqual({ total: 5, open: 3, meetings: 2, signed: 1, lost: 1 });
  });

  it("searches names, people and phone digits", () => {
    const r = rec({ name: "Smith Family Law", person: "Jane Smith", phone: "0412 345 678" });
    expect(matchesSearch(r, "family")).toBe(true);
    expect(matchesSearch(r, "jane")).toBe(true);
    expect(matchesSearch(r, "345678")).toBe(true);
    expect(matchesSearch(r, "melbourne")).toBe(false);
  });
});
