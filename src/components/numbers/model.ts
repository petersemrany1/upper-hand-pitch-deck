import type { AdPerformanceRow, LabourRow, LocationSummaryRow, RevenueRow } from "@/lib/ad-spend.functions";
import { perUnit, ratio } from "./format";

// One row of "how is this city doing" — the same shape whether it is a
// single city or the whole account, so every tab can treat them alike.
export type CityStats = {
  key: string;
  // Funnel
  spend: number;
  leads: number;
  booked: number;
  showed: number;
  noshow: number;
  upcoming: number;
  needsOutcome: number;
  disqualified: number;
  costPerLead: number | null;
  costPerBooked: number | null;
  adCostPerShow: number | null;
  bookRate: number | null;
  showRate: number | null;
  // Labour
  hours: number;
  hourlyCost: number;
  bonusCost: number;
  labourCost: number;
  hoursOk: boolean;
  hoursMissingRate: number;
  hoursFallback: number;
  bonusMissingRate: number;
  // Money
  totalCost: number;
  revenue: number;
  profit: number;
  costPct: number | null;
  marketingShare: number | null;
  labourPerShow: number | null;
  trueCostPerShow: number | null;
  hoursPerBooking: number | null;
  leadsPerBooking: number | null;
};

const EMPTY_LOC: Omit<LocationSummaryRow, "location"> = {
  spend: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0, needs_outcome: 0, disqualified: 0,
};

function finish(base: Omit<CityStats,
  | "costPerLead" | "costPerBooked" | "adCostPerShow" | "bookRate" | "showRate" | "labourCost" | "hoursOk"
  | "totalCost" | "profit" | "costPct" | "marketingShare" | "labourPerShow" | "trueCostPerShow"
  | "hoursPerBooking" | "leadsPerBooking">): CityStats {
  const labourCost = base.hourlyCost + base.bonusCost;
  const hoursOk = base.hours > 0;
  const totalCost = base.spend + labourCost;
  return {
    ...base,
    costPerLead: perUnit(base.spend, base.leads),
    costPerBooked: perUnit(base.spend, base.booked),
    adCostPerShow: perUnit(base.spend, base.showed),
    bookRate: ratio(base.booked, base.leads),
    showRate: ratio(base.showed, base.showed + base.noshow),
    labourCost,
    hoursOk,
    totalCost,
    profit: base.revenue - totalCost,
    costPct: base.revenue > 0 && hoursOk ? totalCost / base.revenue : null,
    marketingShare: totalCost > 0 ? base.spend / totalCost : null,
    labourPerShow: hoursOk ? perUnit(labourCost, base.showed) : null,
    trueCostPerShow: hoursOk ? perUnit(totalCost, base.showed) : null,
    hoursPerBooking: hoursOk ? perUnit(base.hours, base.booked) : null,
    leadsPerBooking: perUnit(base.leads, base.booked),
  };
}

export function buildCityStats(
  key: string,
  loc: LocationSummaryRow | null,
  lab: LabourRow | null,
  rev: RevenueRow | null,
): CityStats {
  const l = loc ?? { ...EMPTY_LOC, location: key };
  return finish({
    key,
    spend: l.spend,
    leads: l.leads,
    booked: l.booked,
    showed: l.showed,
    noshow: l.noshow,
    upcoming: l.upcoming,
    needsOutcome: l.needs_outcome,
    disqualified: l.disqualified,
    hours: lab?.hours ?? 0,
    hourlyCost: lab?.hourly_cost ?? 0,
    bonusCost: lab?.bonus_cost ?? 0,
    hoursMissingRate: lab?.hours_missing_rate ?? 0,
    hoursFallback: lab?.hours_fallback ?? 0,
    bonusMissingRate: lab?.bonus_missing_rate ?? 0,
    revenue: rev?.revenue ?? 0,
  });
}

/** Adds rows together (plus any labour that couldn't be tied to a city). */
export function sumCityStats(key: string, rows: CityStats[], extraLabour: LabourRow | null = null): CityStats {
  const acc = rows.reduce(
    (a, r) => ({
      spend: a.spend + r.spend,
      leads: a.leads + r.leads,
      booked: a.booked + r.booked,
      showed: a.showed + r.showed,
      noshow: a.noshow + r.noshow,
      upcoming: a.upcoming + r.upcoming,
      needsOutcome: a.needsOutcome + r.needsOutcome,
      disqualified: a.disqualified + r.disqualified,
      hours: a.hours + r.hours,
      hourlyCost: a.hourlyCost + r.hourlyCost,
      bonusCost: a.bonusCost + r.bonusCost,
      hoursMissingRate: a.hoursMissingRate + r.hoursMissingRate,
      hoursFallback: a.hoursFallback + r.hoursFallback,
      bonusMissingRate: a.bonusMissingRate + r.bonusMissingRate,
      revenue: a.revenue + r.revenue,
    }),
    {
      spend: 0, leads: 0, booked: 0, showed: 0, noshow: 0, upcoming: 0, needsOutcome: 0, disqualified: 0,
      hours: 0, hourlyCost: 0, bonusCost: 0, hoursMissingRate: 0, hoursFallback: 0, bonusMissingRate: 0, revenue: 0,
    },
  );
  if (extraLabour) {
    acc.hours += extraLabour.hours;
    acc.hourlyCost += extraLabour.hourly_cost;
    acc.bonusCost += extraLabour.bonus_cost;
    acc.hoursMissingRate += extraLabour.hours_missing_rate;
    acc.hoursFallback += extraLabour.hours_fallback;
    acc.bonusMissingRate += extraLabour.bonus_missing_rate;
  }
  return finish({ key, ...acc });
}

export const UNALLOCATED = "(unallocated)";
const isCity = (k: string | null | undefined): k is string => !!k && k.toLowerCase() !== UNALLOCATED;

/** Every city we know about, from spend, leads, labour or revenue. */
export function cityKeys(
  locations: LocationSummaryRow[],
  labour: LabourRow[],
  revenue: RevenueRow[],
): string[] {
  const seen = new Map<string, string>();
  const add = (k: string | null | undefined) => {
    if (isCity(k) && !seen.has(k.toLowerCase())) seen.set(k.toLowerCase(), k);
  };
  locations.forEach((l) => add(l.location));
  labour.forEach((l) => add(l.key));
  revenue.forEach((r) => add(r.key));
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function buildAllCities(
  locations: LocationSummaryRow[],
  labour: LabourRow[],
  revenue: RevenueRow[],
): { cities: CityStats[]; all: CityStats; unallocated: LabourRow | null } {
  const byLoc = new Map(locations.map((l) => [l.location?.toLowerCase() ?? "", l]));
  const byLab = new Map(labour.map((l) => [l.key.toLowerCase(), l]));
  const byRev = new Map(revenue.map((r) => [r.key.toLowerCase(), r]));
  const cities = cityKeys(locations, labour, revenue).map((k) =>
    buildCityStats(k, byLoc.get(k.toLowerCase()) ?? null, byLab.get(k.toLowerCase()) ?? null, byRev.get(k.toLowerCase()) ?? null),
  );
  const unallocated = byLab.get(UNALLOCATED) ?? null;
  return { cities, all: sumCityStats("All cities", cities, unallocated), unallocated };
}

// ---- Ads

export type AdVerdictKey = "winning" | "ok" | "poor" | "notBooking" | "early" | "noName";

export type AdVerdict = { key: AdVerdictKey; label: string; rank: number };

export type AdStats = AdPerformanceRow & {
  costPerLead: number | null;
  costPerBooked: number | null;
  adCostPerShow: number | null;
  bookRate: number | null;
  showRate: number | null;
  verdict: AdVerdict;
};

const VERDICTS: Record<AdVerdictKey, AdVerdict> = {
  winning: { key: "winning", label: "Winning", rank: 0 },
  ok: { key: "ok", label: "Average", rank: 1 },
  poor: { key: "poor", label: "Poor", rank: 2 },
  notBooking: { key: "notBooking", label: "Not booking", rank: 3 },
  early: { key: "early", label: "Too early", rank: 4 },
  noName: { key: "noName", label: "No ad name", rank: 5 },
};

/**
 * A plain-word verdict per ad. Judged on ad cost per show against the average
 * across the ads on screen: 20% cheaper = winning, 20% dearer = poor.
 * Fewer than 3 shows is too early to call — unless the ad has burned through
 * 10+ leads without a single booking.
 */
export function judgeAd(a: AdPerformanceRow, avgCostPerShow: number | null): AdVerdict {
  if (a.unattributed) return VERDICTS.noName;
  const cps = perUnit(a.spend, a.showed);
  if (a.showed < 3) {
    if (a.leads >= 10 && a.booked === 0) return VERDICTS.notBooking;
    return VERDICTS.early;
  }
  if (cps === null || avgCostPerShow === null) return VERDICTS.early;
  if (cps <= avgCostPerShow * 0.8) return VERDICTS.winning;
  if (cps <= avgCostPerShow * 1.2) return VERDICTS.ok;
  return VERDICTS.poor;
}

export function buildAdStats(ads: AdPerformanceRow[]): { rows: AdStats[]; avgCostPerShow: number | null } {
  const attributed = ads.filter((a) => !a.unattributed);
  const spend = attributed.reduce((s, a) => s + a.spend, 0);
  const showed = attributed.reduce((s, a) => s + a.showed, 0);
  const avgCostPerShow = perUnit(spend, showed);
  const rows = ads.map((a) => ({
    ...a,
    costPerLead: a.unattributed ? null : perUnit(a.spend, a.leads),
    costPerBooked: a.unattributed ? null : perUnit(a.spend, a.booked),
    adCostPerShow: a.unattributed ? null : perUnit(a.spend, a.showed),
    bookRate: ratio(a.booked, a.leads),
    showRate: ratio(a.showed, a.showed + a.noshow),
    verdict: judgeAd(a, avgCostPerShow),
  }));
  return { rows, avgCostPerShow };
}
