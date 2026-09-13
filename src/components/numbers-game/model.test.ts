import { describe, expect, test } from "bun:test";
import type { AdPerformanceRow, LocationSummaryRow } from "@/lib/ad-spend.functions";
import type { GameRep, NumbersGameLive } from "@/lib/numbers-game.functions";
import { buildTown, type TownInput } from "./model";

const ad = (o: Partial<AdPerformanceRow> & { ad_name: string }): AdPerformanceRow => ({
  location: null, spend: 0, impressions: 0, clicks: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0,
  needs_outcome: 0, disqualified: 0, unattributed: false, name_collision: false, ...o,
});
const loc = (location: string, spend: number, leads: number, booked: number, showed: number): LocationSummaryRow => ({
  location, spend, leads, booked, showed, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0,
});
const rep = (o: Partial<GameRep> & { id: string; name: string }): GameRep => ({
  inSession: false, sessionStartedAt: null, hoursToday: 0, callsToday: 0, bookingsToday: 0, hours7d: 0, bookings7d: 0, ...o,
});
const live = (o: Partial<NumbersGameLive> = {}): NumbersGameLive => ({
  now: "2026-09-13T00:00:00Z", reps: [], yardLeads: 500, todayBooked: 0, todayShowed: 0, bookingsToday: [], tanks: [], automationIssues: [], ...o,
});

function input(o: Partial<TownInput> = {}): TownInput {
  return {
    ads: [
      ad({ ad_name: "Byron", location: "Byron Bay", spend: 1450, leads: 66, booked: 7, showed: 4 }),
      ad({ ad_name: "Perth", location: "Perth", spend: 880, leads: 71, booked: 10, showed: 0 }),
      ad({ ad_name: "Melb", location: "Melbourne", spend: 1200, leads: 49, booked: 5, showed: 1 }),
    ],
    adsRecent: [ad({ ad_name: "Byron", spend: 900, leads: 30 }), ad({ ad_name: "Perth", spend: 440, leads: 35 }), ad({ ad_name: "Melb", spend: 600, leads: 12 })],
    adsPrior: [ad({ ad_name: "Byron", spend: 550, leads: 36 }), ad({ ad_name: "Perth", spend: 440, leads: 36 }), ad({ ad_name: "Melb", spend: 600, leads: 30 })],
    locations: [loc("Byron Bay", 1450, 66, 7, 4), loc("Perth", 880, 71, 10, 0), loc("Melbourne", 1200, 49, 5, 1)],
    labourByLocation: [
      { key: "Byron Bay", hours: 12.6, hourly_cost: 500, hours_missing_rate: 0, hours_fallback: 0, bookings: 7, bonus_cost: 350, bonus_missing_rate: 0 },
      { key: "Perth", hours: 20, hourly_cost: 800, hours_missing_rate: 0, hours_fallback: 0, bookings: 10, bonus_cost: 160, bonus_missing_rate: 0 },
      { key: "Melbourne", hours: 24, hourly_cost: 900, hours_missing_rate: 0, hours_fallback: 0, bookings: 5, bonus_cost: 100, bonus_missing_rate: 0 },
    ],
    revenueByLocation: [{ key: "Byron Bay", shows: 4, revenue: 3200 }],
    live: live(),
    rangeLabel: "30 days",
    hour: 10,
    ...o,
  };
}

describe("towers", () => {
  test("cost per lead up a quarter sets the ad on fire", () => {
    const byron = buildTown(input()).towers.find((t) => t.id === "Byron")!;
    expect(byron.fire).toBe(true);
    expect(byron.note).toContain("cost per lead up");
  });

  test("leads drying up sets the ad on fire even if cost per lead holds", () => {
    const melb = buildTown(input()).towers.find((t) => t.id === "Melb")!;
    expect(melb.fire).toBe(true);
    expect(melb.note).toContain("leads down 60%");
  });

  test("the cheapest ad gets a star and a place in the good list", () => {
    const t = buildTown(input());
    const perth = t.towers.find((x) => x.id === "Perth")!;
    expect(perth.fire).toBe(false);
    expect(perth.star).toBe(true);
    expect(t.good.some((f) => f.title === "Perth is a winner")).toBe(true);
  });

  test("money spent with no leads burns; too few leads to judge is just grey", () => {
    const t = buildTown(input({ ads: [...input().ads, ad({ ad_name: "Dead", spend: 300, leads: 0 }), ad({ ad_name: "New", spend: 40, leads: 3, booked: 0 })] }));
    expect(t.towers.find((x) => x.id === "Dead")!.fire).toBe(true);
    expect(t.towers.find((x) => x.id === "New")!.tone).toBe("grey");
  });
});

describe("bays", () => {
  test("under one booking every two hours after eight hours means a chat", () => {
    const t = buildTown(input({ live: live({ reps: [rep({ id: "n", name: "Nina", hours7d: 9.5, bookings7d: 2 })] }) }));
    const nina = t.bays[0];
    expect(nina.fire).toBe(true);
    expect(nina.note).toContain("time for a chat");
    expect(t.flags[0].title).toBe("Talk to Nina");
  });

  test("under eight hours is too early to judge, whatever the rate", () => {
    const t = buildTown(input({ live: live({ reps: [rep({ id: "a", name: "Aaron", hours7d: 3, bookings7d: 0 })] }) }));
    expect(t.bays[0].fire).toBe(false);
    expect(t.bays[0].note).toContain("too early");
  });

  test("a booking an hour over four hours is a star", () => {
    const t = buildTown(input({ live: live({ reps: [rep({ id: "b", name: "Bec", hours7d: 6, bookings7d: 7, inSession: true, callsToday: 20, bookingsToday: 2 })] }) }));
    expect(t.bays[0].star).toBe(true);
    expect(t.bays[0].note).toContain("on the tools now");
    expect(t.good.some((f) => f.title === "Bec is flying")).toBe(true);
  });
});

describe("tanks, pump and money", () => {
  test("tank fill and percent follow the pack; a failed refund sets the clinic on fire", () => {
    const t = buildTown(input({ live: live({ tanks: [
      { clinicId: "c1", name: "Boss", city: "Melbourne", packSize: 10, delivered: 6, owed: 4, active: true, refundFails: 0, refundNames: [] },
      { clinicId: "c2", name: "Byron Hair", city: "Byron Bay", packSize: 10, delivered: 2, owed: 8, active: true, refundFails: 1, refundNames: ["Jason"] },
    ] }) }));
    const boss = t.tanks.find((x) => x.name === "Boss")!;
    expect(boss.pct).toBe(60);
    expect(boss.note).toBe("6 of 10 shows · 60% full");
    const byron = t.tanks.find((x) => x.name === "Byron Hair")!;
    expect(byron.fire).toBe(true);
    expect(t.flags.some((f) => f.title === "Byron Hair: refund failed" && f.detail.includes("Jason"))).toBe(true);
  });

  test("automation trouble lights the pump and tops the list", () => {
    const t = buildTown(input({ live: live({ automationIssues: ["no leads in 24 h while ads spent 120 yesterday"] }) }));
    expect(t.pump.fire).toBe(true);
    expect(t.flags[0].title).toBe("Automation suspected broken");
  });

  test("a city in profit gets a star; a losing one is amber in the list", () => {
    const t = buildTown(input());
    expect(t.puddles.find((p) => p.city === "Byron Bay")!.star).toBe(true);
    expect(t.puddles.find((p) => p.city === "Melbourne")!.tone).toBe("red");
    expect(t.flags.some((f) => f.title === "Melbourne is losing money" && f.tone === "amber")).toBe(true);
  });

  test("fires come before money warnings", () => {
    const t = buildTown(input());
    const tones = t.flags.map((f) => f.tone);
    expect(tones.indexOf("amber")).toBeGreaterThan(tones.lastIndexOf("red"));
  });
});
