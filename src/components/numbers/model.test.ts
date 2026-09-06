import { describe, expect, test } from "bun:test";
import type { AdPerformanceRow } from "@/lib/ad-spend.functions";
import { buildAdStats, buildAllCities, buildCityStats, judgeAd, sumCityStats } from "./model";

const ad = (o: Partial<AdPerformanceRow> & { ad_name: string }): AdPerformanceRow => ({
  location: null, spend: 0, impressions: 0, clicks: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0,
  needs_outcome: 0, disqualified: 0, unattributed: false, name_collision: false, ...o,
});

describe("buildCityStats", () => {
  test("cost per lead, booking rate and cost per showed", () => {
    const c = buildCityStats(
      "Byron Bay",
      { location: "Byron Bay", spend: 3000, leads: 30, booked: 6, showed: 4, noshow: 2, upcoming: 0, needs_outcome: 0, disqualified: 0 },
      { key: "Byron Bay", hours: 10, hourly_cost: 400, bonus_cost: 100, hours_missing_rate: 0, hours_fallback: 0, bookings: 6, bonus_missing_rate: 0 },
      { key: "Byron Bay", shows: 4, revenue: 3200 },
    );
    expect(c.costPerLead).toBe(100);
    expect(c.bookRate).toBeCloseTo(0.2);
    expect(c.costPerBooked).toBe(500);
    expect(c.adCostPerShow).toBe(750);
    expect(c.showRate).toBeCloseTo(4 / 6);
    expect(c.labourCost).toBe(500);
    expect(c.totalCost).toBe(3500);
    expect(c.trueCostPerShow).toBe(875);
    expect(c.labourPerShow).toBe(125);
    expect(c.marketingShare).toBeCloseTo(3000 / 3500);
    expect(c.hoursPerBooking).toBeCloseTo(10 / 6);
    expect(c.leadsPerBooking).toBe(5);
    expect(c.profit).toBe(-300);
  });

  test("no hours means no labour-based figures", () => {
    const c = buildCityStats("Perth", { location: "Perth", spend: 500, leads: 5, booked: 1, showed: 1, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0 }, null, null);
    expect(c.hoursOk).toBe(false);
    expect(c.trueCostPerShow).toBeNull();
    expect(c.labourPerShow).toBeNull();
    expect(c.adCostPerShow).toBe(500);
  });

  test("zero divisors give null, not Infinity", () => {
    const c = buildCityStats("X", { location: "X", spend: 100, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0 }, null, null);
    expect(c.costPerLead).toBeNull();
    expect(c.adCostPerShow).toBeNull();
    expect(c.bookRate).toBeNull();
  });
});

describe("buildAllCities", () => {
  test("unions cities from spend, labour and revenue and keeps unallocated labour in the total only", () => {
    const { cities, all, unallocated } = buildAllCities(
      [{ location: "Melbourne", spend: 1000, leads: 10, booked: 2, showed: 1, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0 }],
      [
        { key: "melbourne", hours: 5, hourly_cost: 200, bonus_cost: 0, hours_missing_rate: 0, hours_fallback: 0, bookings: 2, bonus_missing_rate: 0 },
        { key: "(unallocated)", hours: 2, hourly_cost: 80, bonus_cost: 0, hours_missing_rate: 0, hours_fallback: 0, bookings: 0, bonus_missing_rate: 0 },
      ],
      [{ key: "Sydney", shows: 1, revenue: 800 }],
    );
    expect(cities.map((c) => c.key)).toEqual(["Melbourne", "Sydney"]);
    expect(cities[0].labourCost).toBe(200);
    expect(unallocated?.hourly_cost).toBe(80);
    expect(all.labourCost).toBe(280);
    expect(all.revenue).toBe(800);
    expect(all.spend).toBe(1000);
  });

  test("sumCityStats of nothing is an empty row", () => {
    const s = sumCityStats("Nowhere", []);
    expect(s.spend).toBe(0);
    expect(s.costPerLead).toBeNull();
  });
});

describe("judgeAd", () => {
  test("verdicts against the average cost per showed", () => {
    expect(judgeAd(ad({ ad_name: "a", spend: 300, showed: 5 }), 100).label).toBe("Winning");
    expect(judgeAd(ad({ ad_name: "b", spend: 500, showed: 5 }), 100).label).toBe("Average");
    expect(judgeAd(ad({ ad_name: "c", spend: 700, showed: 5 }), 100).label).toBe("Poor");
  });
  test("too early under 3 showed, unless it has burned 10+ leads with no booking", () => {
    expect(judgeAd(ad({ ad_name: "d", spend: 100, leads: 4, showed: 1 }), 100).label).toBe("Too early");
    expect(judgeAd(ad({ ad_name: "e", spend: 900, leads: 12, booked: 0, showed: 0 }), 100).label).toBe("Not booking");
  });
  test("unattributed rows are never judged", () => {
    expect(judgeAd(ad({ ad_name: "f", unattributed: true, leads: 50, showed: 10 }), 100).label).toBe("No ad name");
  });
});

describe("buildAdStats", () => {
  test("average excludes unattributed rows", () => {
    const { avgCostPerShow, rows } = buildAdStats([
      ad({ ad_name: "a", spend: 1000, showed: 5 }),
      ad({ ad_name: "b", spend: 1000, showed: 5 }),
      ad({ ad_name: "z", unattributed: true, showed: 100 }),
    ]);
    expect(avgCostPerShow).toBe(200);
    expect(rows.find((r) => r.ad_name === "z")?.adCostPerShow).toBeNull();
  });
});
