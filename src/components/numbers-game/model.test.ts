import { describe, expect, test } from "bun:test";
import type { AdPerformanceRow, LocationSummaryRow } from "@/lib/ad-spend.functions";
import type { NumbersGameLive } from "@/lib/numbers-game.functions";
import { buildTown, type TownInput } from "./model";

const ad = (o: Partial<AdPerformanceRow> & { ad_name: string }): AdPerformanceRow => ({
  location: null, spend: 0, impressions: 0, clicks: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0,
  needs_outcome: 0, disqualified: 0, unattributed: false, name_collision: false, ...o,
});
const loc = (location: string, spend: number, leads: number, booked: number, showed: number): LocationSummaryRow => ({
  location, spend, leads, booked, showed, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0,
});
const live = (o: Partial<NumbersGameLive> = {}): NumbersGameLive => ({
  now: "2026-09-09T00:00:00Z", reps: [], yardLeads: 500, overdueCallbacks: 0, slowLeads: [], todayBooked: 0, todayShowed: 0, tanks: [], ...o,
});

function input(o: Partial<TownInput> = {}): TownInput {
  return {
    ads30: [ad({ ad_name: "Byron", location: "Byron Bay", spend: 1450, leads: 66, booked: 7, showed: 4 }), ad({ ad_name: "Perth", location: "Perth", spend: 880, leads: 71, booked: 10, showed: 0 })],
    adsRecent: [ad({ ad_name: "Byron", spend: 900, leads: 30 }), ad({ ad_name: "Perth", spend: 440, leads: 35 })],
    adsPrior: [ad({ ad_name: "Byron", spend: 550, leads: 36 }), ad({ ad_name: "Perth", spend: 440, leads: 36 })],
    locations: [loc("Byron Bay", 1450, 66, 7, 4), loc("Perth", 880, 71, 10, 0)],
    labourByLocation: [
      { key: "Byron Bay", hours: 12.6, hourly_cost: 500, hours_missing_rate: 0, hours_fallback: 0, bookings: 7, bonus_cost: 350, bonus_missing_rate: 0 },
      { key: "Perth", hours: 20, hourly_cost: 800, hours_missing_rate: 0, hours_fallback: 0, bookings: 10, bonus_cost: 160, bonus_missing_rate: 0 },
    ],
    revenueByLocation: [{ key: "Byron Bay", shows: 4, revenue: 1600 }],
    needsOutcome: [],
    live: live(),
    hour: 10,
    ...o,
  };
}

describe("buildTown", () => {
  test("an ad whose cost per lead jumped a quarter smokes and gets flagged", () => {
    const t = buildTown(input());
    const byron = t.towers.find((x) => x.id === "Byron")!;
    expect(byron.smoke).toBe(true);
    expect(byron.tone).toBe("amber");
    expect(byron.trend).toBeCloseTo(30 / (550 / 36), 1);
    expect(t.flags.some((f) => f.title.includes("Byron") && f.title.includes("pressure"))).toBe(true);
  });

  test("the cheapest ad in town is green and praised", () => {
    const t = buildTown(input());
    const perth = t.towers.find((x) => x.id === "Perth")!;
    expect(perth.tone).toBe("green");
    expect(t.good.some((f) => f.title.includes("Perth"))).toBe(true);
  });

  test("website enquiries become a free tower", () => {
    const t = buildTown(input({ ads30: [...input().ads30, ad({ ad_name: "", unattributed: true, leads: 73 })] }));
    const web = t.towers.find((x) => x.id === "__website")!;
    expect(web.note).toContain("free");
  });

  test("an advisor with lots of calls and no bookings is backed up; one on pace is green", () => {
    const t = buildTown(input({ live: live({ reps: [
      { id: "n", name: "Nina", inSession: true, sessionStartedAt: null, hoursToday: 3, callsToday: 41, bookingsToday: 0 },
      { id: "b", name: "Bec", inSession: true, sessionStartedAt: null, hoursToday: 4, callsToday: 30, bookingsToday: 3 },
      { id: "a", name: "Aaron", inSession: false, sessionStartedAt: null, hoursToday: 0, callsToday: 0, bookingsToday: 0 },
    ] }) }));
    expect(t.bays.find((b) => b.name === "Nina")!.tone).toBe("red");
    expect(t.bays.find((b) => b.name === "Bec")!.tone).toBe("green");
    expect(t.bays.find((b) => b.name === "Aaron")!.note).toBe("off today");
    expect(t.flags[0].title).toContain("Nina");
    expect(t.good.some((f) => f.title.includes("Bec"))).toBe(true);
  });

  test("a clinic tank past 80% says send the renewal; a used-up pack is red", () => {
    const t = buildTown(input({ live: live({ tanks: [
      { clinicId: "c1", name: "Boss", city: "Melbourne", packSize: 10, delivered: 9, owed: 1, active: true },
      { clinicId: "c2", name: "Byron Hair", city: "Byron Bay", packSize: 10, delivered: 10, owed: 0, active: true },
      { clinicId: "c3", name: "Fresh", city: "Perth", packSize: 8, delivered: 2, owed: 6, active: true },
    ] }) }));
    expect(t.tanks.find((x) => x.name === "Boss")!.tone).toBe("amber");
    expect(t.tanks.find((x) => x.name === "Byron Hair")!.tone).toBe("red");
    expect(t.tanks.find((x) => x.name === "Fresh")!.fill).toBeCloseTo(0.25);
    expect(t.flags.filter((f) => f.target.kind === "tank")).toHaveLength(2);
  });

  test("stuck things become clogs: outcomes, overdue callbacks, uncalled new leads", () => {
    const t = buildTown(input({
      needsOutcome: [{ appointment_id: "1", patient_name: "Bobby Walker", appointment_date: null, appointment_time: null, clinic_name: null }],
      live: live({ overdueCallbacks: 3, slowLeads: [{ id: "l", name: "Sam", minutes: 95 }] }),
    }));
    expect(t.clogs.map((c) => c.id)).toEqual(["outcomes", "callbacks", "slow"]);
    expect(t.clogs[0].detail).toContain("Bobby Walker");
  });

  test("a city losing money leaks, and says which side", () => {
    const t = buildTown(input());
    const byron = t.puddles.find((p) => p.city === "Byron Bay")!;
    expect(byron.tone).toBe("red");
    expect(byron.profit).toBeLessThan(0);
    expect(t.flags.some((f) => f.title === "Byron Bay is leaking money")).toBe(true);
  });

  test("red flags come before amber ones, and night is outside 7 to 19", () => {
    const t = buildTown(input({ hour: 21, needsOutcome: [{ appointment_id: "1", patient_name: "X", appointment_date: null, appointment_time: null, clinic_name: null }] }));
    const tones = t.flags.map((f) => f.tone);
    expect(tones.indexOf("amber")).toBeGreaterThan(tones.lastIndexOf("red"));
    expect(t.depotOpen).toBe(false);
  });
});
