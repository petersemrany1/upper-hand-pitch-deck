import type { AdPerformanceRow, LabourRow, LocationSummaryRow, RevenueRow } from "@/lib/ad-spend.functions";
import type { NumbersGameLive } from "@/lib/numbers-game.functions";
import { buildAllCities } from "@/components/numbers/model";

/**
 * Turns the business numbers into a plumbing town. Pure: no React, no
 * three.js, so every rule about what burns, what shines and how full a tank
 * is can be tested on its own.
 *
 * The town is about two things: are the ads working, and are the advisors
 * converting. Anything bleeding or broken catches fire. Anything going well
 * gets a gold star.
 */

export type Tone = "red" | "amber" | "green" | "grey";

export type Tower = {
  id: string;
  name: string;
  city: string | null;
  spend: number;
  leads: number;
  booked: number;
  showed: number;
  costPerLead: number | null;
  costPerShow: number | null;
  bookRate: number | null;
  /** 0..1 water level relative to the biggest tower in the range. */
  fill: number;
  /** cost per lead, last fortnight over the fortnight before. >1 = dearer. */
  costTrend: number | null;
  /** leads per day, last fortnight over the fortnight before. <1 = drying up. */
  leadsTrend: number | null;
  fire: boolean;
  star: boolean;
  tone: Tone;
  note: string;
};

export type Bay = {
  repId: string;
  name: string;
  inSession: boolean;
  hoursToday: number;
  callsToday: number;
  bookingsToday: number;
  hours7d: number;
  bookings7d: number;
  /** bookings per hour over the last 7 days */
  rate7d: number | null;
  fire: boolean;
  star: boolean;
  tone: Tone;
  note: string;
};

export type Tank = {
  clinicId: string;
  name: string;
  city: string | null;
  packSize: number;
  delivered: number;
  owed: number;
  fill: number;
  pct: number;
  refundFails: number;
  refundNames: string[];
  fire: boolean;
  tone: Tone;
  note: string;
};

export type Puddle = {
  city: string;
  cost: number;
  revenue: number;
  profit: number;
  reason: "ads" | "labour" | "both" | null;
  star: boolean;
  tone: Tone;
  note: string;
};

export type Pump = { fire: boolean; issues: string[]; note: string };

export type FlagTarget = { kind: "tower" | "bay" | "tank" | "puddle" | "pump"; id: string };
export type Flag = { tone: Tone; title: string; detail: string; target: FlagTarget };

export type Town = {
  towers: Tower[];
  bays: Bay[];
  tanks: Tank[];
  puddles: Puddle[];
  pump: Pump;
  yardLeads: number;
  todayBooked: number;
  todayShowed: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  rangeLabel: string;
  flags: Flag[];
  good: Flag[];
  hour: number;
  depotOpen: boolean;
};

export type TownInput = {
  ads: AdPerformanceRow[];
  adsRecent: AdPerformanceRow[];
  adsPrior: AdPerformanceRow[];
  locations: LocationSummaryRow[];
  labourByLocation: LabourRow[];
  revenueByLocation: RevenueRow[];
  live: NumbersGameLive;
  rangeLabel: string;
  hour: number;
};

// ---- The rules, in one place.
export const FATIGUE_COST_UP = 1.25;      // cost per lead up a quarter on the fortnight before
export const FATIGUE_LEADS_DOWN = 0.75;   // leads per day down a quarter
export const CHEAP_LEAD = 0.8;            // cost per lead at or under 80% of the account average
export const HOT_BOOKING = 1.5;           // booking rate 1.5x the account average
export const MIN_LEADS = 10;
export const MIN_TREND_LEADS = 5;
export const TALK_HOURS = 8;              // an advisor needs this many hours before we judge them
export const TALK_RATE = 0.5;             // under one booking every two hours: we need to talk
export const STAR_RATE = 1;               // a booking an hour: going great
export const STAR_HOURS = 4;

const perLead = (r: { spend: number; leads: number }) => (r.leads > 0 ? r.spend / r.leads : null);
const perShow = (r: { spend: number; showed: number }) => (r.showed > 0 ? r.spend / r.showed : null);
const rate = (r: { leads: number; booked: number }) => (r.leads > 0 ? r.booked / r.leads : null);
const $ = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function buildTown(input: TownInput): Town {
  const cities = buildAllCities(input.locations, input.labourByLocation, input.revenueByLocation);
  const avg = cities.all;

  // ---- Towers (ads)
  const named = input.ads.filter((a) => !a.unattributed && a.ad_name);
  const maxLeads = Math.max(1, ...named.map((a) => a.leads));
  const towers: Tower[] = named.map((a) => {
    const recent = input.adsRecent.find((r) => r.ad_name === a.ad_name);
    const prior = input.adsPrior.find((r) => r.ad_name === a.ad_name);
    const enough = (recent?.leads ?? 0) >= MIN_TREND_LEADS && (prior?.leads ?? 0) >= MIN_TREND_LEADS;
    const rc = recent ? perLead(recent) : null;
    const pc = prior ? perLead(prior) : null;
    const costTrend = enough && rc !== null && pc !== null && pc > 0 ? rc / pc : null;
    const leadsTrend = enough && prior ? (recent?.leads ?? 0) / prior.leads : null;
    const cpl = perLead(a);
    const br = rate(a);

    const reasons: string[] = [];
    if (a.spend >= 50 && a.leads === 0) reasons.push(`${$(a.spend)} spent, no leads`);
    if (costTrend !== null && costTrend >= FATIGUE_COST_UP) reasons.push(`cost per lead up ${Math.round((costTrend - 1) * 100)}%`);
    if (leadsTrend !== null && leadsTrend <= FATIGUE_LEADS_DOWN) reasons.push(`leads down ${Math.round((1 - leadsTrend) * 100)}%`);
    if (a.leads >= MIN_LEADS && a.booked === 0) reasons.push(`${a.leads} leads, not one booking`);
    const fire = reasons.length > 0;

    const wins: string[] = [];
    if (!fire && a.leads >= MIN_LEADS && cpl !== null && avg.costPerLead !== null && cpl <= avg.costPerLead * CHEAP_LEAD) wins.push(`cheapest leads, ${$(cpl)} each`);
    if (!fire && a.leads >= MIN_LEADS && br !== null && avg.bookRate !== null && avg.bookRate > 0 && br >= avg.bookRate * HOT_BOOKING) wins.push(`books ${Math.round(br * 100)}%, ${(br / avg.bookRate).toFixed(1)}x the average`);
    const star = wins.length > 0;

    const base = `${a.leads} leads${cpl === null ? "" : ` · ${$(cpl)} each`} · ${a.booked} booked`;
    return {
      id: a.ad_name, name: a.ad_name, city: a.location, spend: a.spend, leads: a.leads, booked: a.booked, showed: a.showed,
      costPerLead: cpl, costPerShow: perShow(a), bookRate: br, fill: a.leads / maxLeads, costTrend, leadsTrend, fire, star,
      tone: (fire ? "red" : star ? "green" : "grey") as Tone,
      note: fire ? reasons.join(" · ") : star ? wins.join(" · ") : base,
    };
  }).sort((x, y) => y.leads - x.leads);

  const website = input.ads.find((a) => a.unattributed);
  if (website && website.leads > 0) {
    towers.push({
      id: "__website", name: "Website", city: null, spend: 0, leads: website.leads, booked: website.booked, showed: website.showed,
      costPerLead: null, costPerShow: null, bookRate: rate(website), fill: website.leads / maxLeads, costTrend: null, leadsTrend: null,
      fire: false, star: false, tone: "grey", note: `${website.leads} leads · free · ${website.booked} booked`,
    });
  }

  // ---- Bays (advisors): judged on the last 7 days once they've done 8 hours.
  const bays: Bay[] = input.live.reps.map((r) => {
    const rate7d = r.hours7d >= 0.5 ? r.bookings7d / r.hours7d : null;
    const fire = r.hours7d >= TALK_HOURS && rate7d !== null && rate7d < TALK_RATE;
    const star = !fire && r.hours7d >= STAR_HOURS && rate7d !== null && rate7d >= STAR_RATE;
    const every = rate7d && rate7d > 0 ? `1 every ${(1 / rate7d).toFixed(1)} h` : "none yet";
    let note: string;
    if (fire) note = `${r.bookings7d} booked in ${r.hours7d} h this week · ${every} · time for a chat`;
    else if (star) note = `${r.bookings7d} booked in ${r.hours7d} h this week · ${every} · flying`;
    else if (r.hours7d < TALK_HOURS && r.hours7d > 0) note = `${r.bookings7d} booked in ${r.hours7d} h this week · too early to judge`;
    else if (r.hours7d === 0) note = "no calling this week";
    else note = `${r.bookings7d} booked in ${r.hours7d} h this week · ${every}`;
    if (r.inSession) note = `on the tools now · ${r.callsToday} calls, ${r.bookingsToday} booked today · ${note}`;
    return {
      repId: r.id, name: r.name, inSession: r.inSession, hoursToday: r.hoursToday, callsToday: r.callsToday, bookingsToday: r.bookingsToday,
      hours7d: r.hours7d, bookings7d: r.bookings7d, rate7d, fire, star, tone: fire ? "red" : star ? "green" : "grey", note,
    };
  });

  // ---- Tanks (clinics): how full the pack is, plus fire on failed refunds.
  const tanks: Tank[] = input.live.tanks.map((t) => {
    const fill = t.packSize > 0 ? Math.min(1, t.delivered / t.packSize) : 0;
    const pct = Math.round(fill * 100);
    const fire = t.refundFails > 0;
    const note = fire
      ? `${t.refundFails} refund${t.refundFails === 1 ? "" : "s"} failed: ${t.refundNames.slice(0, 3).join(", ")}`
      : `${t.delivered} of ${t.packSize} shows · ${pct}% full${fill >= 1 ? " · pack used up" : fill >= 0.8 ? " · nearly time to renew" : ""}`;
    return {
      clinicId: t.clinicId, name: t.name, city: t.city, packSize: t.packSize, delivered: t.delivered, owed: t.owed, fill, pct,
      refundFails: t.refundFails, refundNames: t.refundNames, fire, tone: fire ? "red" : fill >= 0.8 ? "amber" : "grey", note,
    };
  });

  // ---- Puddles (money per city)
  const puddles: Puddle[] = cities.cities.map((c) => {
    const adsBad = c.costPerLead !== null && avg.costPerLead !== null && c.costPerLead >= avg.costPerLead * 1.1;
    const labourBad = c.hoursPerBooking !== null && avg.hoursPerBooking !== null && c.hoursPerBooking >= avg.hoursPerBooking * 1.3;
    const reason = c.profit < 0 ? (adsBad && labourBad ? "both" : labourBad ? "labour" : adsBad ? "ads" : null) : null;
    const star = c.profit > 0;
    const tone: Tone = star ? "green" : c.profit < 0 && c.showed > 0 ? "red" : "grey";
    const note = star ? `+${$(c.profit)} profit` : c.showed === 0 ? `${$(c.totalCost)} spent, no showed appointments yet` : `lost ${$(-c.profit)} · ${reason === "both" ? "ads and calling both dear" : reason === "labour" ? "the calling is dear" : reason === "ads" ? "the ads are dear" : "costs above revenue"}`;
    return { city: c.key, cost: c.totalCost, revenue: c.revenue, profit: c.profit, reason, star, tone, note };
  });

  // ---- Pump (Make.com automations)
  const pump: Pump = {
    fire: input.live.automationIssues.length > 0,
    issues: input.live.automationIssues,
    note: input.live.automationIssues.length > 0 ? input.live.automationIssues.join(" · ") : "leads and reminders flowing",
  };

  // ---- Flags: fires first
  const flags: Flag[] = [];
  const good: Flag[] = [];
  if (pump.fire) flags.push({ tone: "red", title: "Automation suspected broken", detail: pump.issues.join(" · "), target: { kind: "pump", id: "pump" } });
  for (const b of bays) {
    if (b.fire) flags.push({ tone: "red", title: `Talk to ${b.name}`, detail: `${b.bookings7d} booked in ${b.hours7d} h this week. The bar is one every two hours.`, target: { kind: "bay", id: b.repId } });
    if (b.star) good.push({ tone: "green", title: `${b.name} is flying`, detail: `${b.bookings7d} booked in ${b.hours7d} h this week.`, target: { kind: "bay", id: b.repId } });
  }
  for (const t of towers) {
    if (t.fire) flags.push({ tone: "red", title: `${t.name} is on fire`, detail: t.note, target: { kind: "tower", id: t.id } });
    if (t.star) good.push({ tone: "green", title: `${t.name} is a winner`, detail: t.note, target: { kind: "tower", id: t.id } });
  }
  for (const t of tanks) if (t.fire) flags.push({ tone: "red", title: `${t.name}: refund failed`, detail: t.note, target: { kind: "tank", id: t.clinicId } });
  for (const p of puddles) {
    if (p.tone === "red") flags.push({ tone: "amber", title: `${p.city} is losing money`, detail: p.note, target: { kind: "puddle", id: p.city } });
    if (p.star) good.push({ tone: "green", title: `${p.city} is in profit`, detail: p.note, target: { kind: "puddle", id: p.city } });
  }
  const order: Record<Tone, number> = { red: 0, amber: 1, grey: 2, green: 3 };
  flags.sort((a, b) => order[a.tone] - order[b.tone]);

  return {
    towers, bays, tanks, puddles, pump,
    yardLeads: input.live.yardLeads, todayBooked: input.live.todayBooked, todayShowed: input.live.todayShowed,
    totalCost: avg.totalCost, totalRevenue: avg.revenue, profit: avg.profit, rangeLabel: input.rangeLabel,
    flags, good, hour: input.hour, depotOpen: bays.some((b) => b.inSession) || (input.hour >= 8 && input.hour < 18),
  };
}
