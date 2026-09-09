import type { AdPerformanceRow, LabourRow, LocationSummaryRow, RevenueRow } from "@/lib/ad-spend.functions";
import type { NeedsOutcomeRow } from "@/lib/ad-spend.functions";
import type { NumbersGameLive } from "@/lib/numbers-game.functions";
import { buildAllCities } from "@/components/numbers/model";

/**
 * Turns the business numbers into a plumbing town. Pure: no React, no
 * three.js, so every rule about what is red, what is green and how full a
 * tank is can be tested on its own.
 *
 * The map: ads are water towers (water = leads), leads flow down pipes to
 * the depot where each advisor has a van and a bay, bookings travel on to
 * the clinics whose rainwater tanks fill against their pack, and money
 * leaks show as puddles by the meter house.
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
  /** 0..1, water level relative to the biggest tower. */
  fill: number;
  /** cost per lead now vs the fortnight before; >1 = getting dearer. */
  trend: number | null;
  tone: Tone;
  note: string;
  smoke: boolean;
};

export type Bay = {
  repId: string;
  name: string;
  inSession: boolean;
  hoursToday: number;
  callsToday: number;
  bookingsToday: number;
  /** bookings per hour; the goal is 1. */
  pace: number | null;
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
  /** 0..1 of the pack delivered. */
  fill: number;
  tone: Tone;
  note: string;
};

export type Clog = {
  id: "outcomes" | "callbacks" | "slow";
  label: string;
  count: number;
  detail: string;
  tone: Tone;
};

export type Puddle = {
  city: string;
  cost: number;
  revenue: number;
  profit: number;
  /** why it leaks, when it does */
  reason: "ads" | "labour" | "both" | null;
  tone: Tone;
  note: string;
};

export type Flag = { tone: Tone; title: string; detail: string; target: { kind: "tower" | "bay" | "tank" | "clog" | "puddle"; id: string } };

export type Town = {
  towers: Tower[];
  bays: Bay[];
  tanks: Tank[];
  clogs: Clog[];
  puddles: Puddle[];
  yardLeads: number;
  todayBooked: number;
  todayShowed: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  flags: Flag[];
  good: Flag[];
  /** Sydney hour 0..23, drives day/night. */
  hour: number;
  depotOpen: boolean;
};

export type TownInput = {
  ads30: AdPerformanceRow[];
  adsRecent: AdPerformanceRow[];
  adsPrior: AdPerformanceRow[];
  locations: LocationSummaryRow[];
  labourByLocation: LabourRow[];
  revenueByLocation: RevenueRow[];
  needsOutcome: NeedsOutcomeRow[];
  live: NumbersGameLive;
  hour: number;
};

export const FATIGUE_UP = 1.25;
export const CHEAP_LEAD = 0.8;
export const TANK_RENEW_AT = 0.8;
export const MIN_LEADS = 10;
export const PACE_GOAL = 1;
export const SLOW_CALLS = 25;

const perLead = (r: { spend: number; leads: number }) => (r.leads > 0 ? r.spend / r.leads : null);
const perShow = (r: { spend: number; showed: number }) => (r.showed > 0 ? r.spend / r.showed : null);

export function buildTown(input: TownInput): Town {
  const cities = buildAllCities(input.locations, input.labourByLocation, input.revenueByLocation);
  const avg = cities.all;
  const avgCostPerLead = avg.costPerLead;

  // ---- Towers
  const named = input.ads30.filter((a) => !a.unattributed && a.ad_name);
  const maxLeads = Math.max(1, ...named.map((a) => a.leads));
  const towers: Tower[] = named.map((a) => {
    const recent = input.adsRecent.find((r) => r.ad_name === a.ad_name);
    const prior = input.adsPrior.find((r) => r.ad_name === a.ad_name);
    const rc = recent ? perLead(recent) : null;
    const pc = prior ? perLead(prior) : null;
    const trend = rc !== null && pc !== null && pc > 0 && (recent?.leads ?? 0) >= 5 && (prior?.leads ?? 0) >= 5 ? rc / pc : null;
    const cpl = perLead(a);
    let tone: Tone = "grey";
    let note = `${a.leads} leads · ${cpl === null ? "no cost" : `$${Math.round(cpl)} each`}`;
    let smoke = false;
    if (a.leads === 0 && a.spend > 0) {
      tone = "red"; note = `$${Math.round(a.spend)} spent, no leads`;
    } else if (trend !== null && trend >= FATIGUE_UP) {
      tone = "amber"; smoke = true; note = `${note} · pressure dropping, cost per lead up ${Math.round((trend - 1) * 100)}%`;
    } else if (a.leads >= MIN_LEADS && a.booked === 0) {
      tone = "red"; note = `${note} · not one booking`;
    } else if (cpl !== null && avgCostPerLead !== null && cpl <= avgCostPerLead * CHEAP_LEAD && a.leads >= MIN_LEADS) {
      tone = "green"; note = `${note} · cheapest water in town`;
    } else if (a.leads >= MIN_LEADS) {
      tone = "green";
    }
    return {
      id: a.ad_name, name: a.ad_name, city: a.location, spend: a.spend, leads: a.leads, booked: a.booked, showed: a.showed,
      costPerLead: cpl, costPerShow: perShow(a), fill: a.leads / maxLeads, trend, tone, note, smoke,
    };
  }).sort((x, y) => y.leads - x.leads);

  const website = input.ads30.find((a) => a.unattributed);
  if (website && website.leads > 0) {
    towers.push({
      id: "__website", name: "Website", city: null, spend: 0, leads: website.leads, booked: website.booked, showed: website.showed,
      costPerLead: null, costPerShow: null, fill: website.leads / maxLeads, trend: null, tone: "grey", note: `${website.leads} leads · free`, smoke: false,
    });
  }

  // ---- Bays
  const bays: Bay[] = input.live.reps.map((r) => {
    const pace = r.hoursToday >= 0.5 ? r.bookingsToday / r.hoursToday : null;
    let tone: Tone = "grey";
    let note = r.inSession ? "in the depot" : r.hoursToday > 0 ? `${r.hoursToday} h today · finished` : "off today";
    if (r.inSession || r.hoursToday > 0) {
      if (r.callsToday >= SLOW_CALLS && r.bookingsToday === 0) { tone = "red"; note = `${r.callsToday} calls, no bookings · backed up`; }
      else if (pace !== null && pace >= PACE_GOAL * 0.75) { tone = "green"; note = `${r.bookingsToday} booked · on pace`; }
      else if (pace !== null) { tone = "amber"; note = `${r.bookingsToday} booked in ${r.hoursToday} h · behind pace`; }
      else { tone = "grey"; note = `${r.callsToday} calls · just started`; }
    }
    return { repId: r.id, name: r.name, inSession: r.inSession, hoursToday: r.hoursToday, callsToday: r.callsToday, bookingsToday: r.bookingsToday, pace, tone, note };
  });

  // ---- Tanks
  const tanks: Tank[] = input.live.tanks.map((t) => {
    const fill = t.packSize > 0 ? Math.min(1, t.delivered / t.packSize) : 0;
    let tone: Tone = "grey";
    let note = `${t.delivered} of ${t.packSize} pack`;
    if (fill >= 1) { tone = "red"; note = `${note} · pack used up, renew now`; }
    else if (fill >= TANK_RENEW_AT) { tone = "amber"; note = `${note} · nearly full, send the renewal`; }
    else if (t.delivered > 0) { tone = "green"; note = `${note} · ${t.owed} to go`; }
    return { clinicId: t.clinicId, name: t.name, city: t.city, packSize: t.packSize, delivered: t.delivered, owed: t.owed, fill, tone, note };
  });

  // ---- Clogs
  const clogs: Clog[] = [];
  if (input.needsOutcome.length > 0) {
    clogs.push({ id: "outcomes", label: "No outcome", count: input.needsOutcome.length, tone: "red",
      detail: input.needsOutcome.slice(0, 4).map((n) => n.patient_name).join(", ") + (input.needsOutcome.length > 4 ? ` + ${input.needsOutcome.length - 4} more` : "") });
  }
  if (input.live.overdueCallbacks > 0) {
    clogs.push({ id: "callbacks", label: "Overdue callbacks", count: input.live.overdueCallbacks, tone: "amber", detail: "callbacks past their time by over an hour" });
  }
  if (input.live.slowLeads.length > 0) {
    clogs.push({ id: "slow", label: "Not called yet", count: input.live.slowLeads.length, tone: "red",
      detail: input.live.slowLeads.slice(0, 3).map((l) => `${l.name} (${l.minutes} min)`).join(", ") });
  }

  // ---- Puddles
  const puddles: Puddle[] = cities.cities.map((c) => {
    const adsBad = c.costPerLead !== null && avgCostPerLead !== null && c.costPerLead >= avgCostPerLead * 1.1;
    const labourBad = c.hoursPerBooking !== null && avg.hoursPerBooking !== null && c.hoursPerBooking >= avg.hoursPerBooking * 1.3;
    const reason = c.profit < 0 ? (adsBad && labourBad ? "both" : labourBad ? "labour" : adsBad ? "ads" : null) : null;
    const tone: Tone = c.profit > 0 ? "green" : c.profit < 0 && c.showed > 0 ? "red" : "grey";
    const note = c.profit > 0 ? `+$${Math.round(c.profit)} profit` : c.showed === 0 ? "no showed appointments yet" : `leaking ${reason === "both" ? "on ads and labour" : reason === "labour" ? "on labour" : reason === "ads" ? "on ads" : ""}`.trim();
    return { city: c.key, cost: c.totalCost, revenue: c.revenue, profit: c.profit, reason, tone, note };
  });

  // ---- Flags
  const flags: Flag[] = [];
  const good: Flag[] = [];
  for (const b of bays) {
    if (b.tone === "red") flags.push({ tone: "red", title: `${b.name}'s bay is backed up`, detail: `${b.callsToday} calls, ${b.bookingsToday} bookings today.`, target: { kind: "bay", id: b.repId } });
    if (b.tone === "amber") flags.push({ tone: "amber", title: `${b.name} is behind pace`, detail: `${b.bookingsToday} booked in ${b.hoursToday} h. Goal is one an hour.`, target: { kind: "bay", id: b.repId } });
    if (b.tone === "green" && b.bookingsToday >= 3) good.push({ tone: "green", title: `${b.name} is on a roll`, detail: `${b.bookingsToday} booked in ${b.hoursToday} h.`, target: { kind: "bay", id: b.repId } });
  }
  for (const c of clogs) flags.push({ tone: c.tone, title: `Clog: ${c.count} ${c.label.toLowerCase()}`, detail: c.detail, target: { kind: "clog", id: c.id } });
  for (const t of towers) {
    if (t.smoke) flags.push({ tone: "amber", title: `${t.name} is losing pressure`, detail: t.note, target: { kind: "tower", id: t.id } });
    else if (t.tone === "red") flags.push({ tone: "red", title: `${t.name} isn't delivering`, detail: t.note, target: { kind: "tower", id: t.id } });
    else if (t.tone === "green" && t.note.includes("cheapest")) good.push({ tone: "green", title: `${t.name} is the cheapest water`, detail: t.note, target: { kind: "tower", id: t.id } });
  }
  for (const t of tanks) {
    if (t.tone === "red" || t.tone === "amber") flags.push({ tone: t.tone, title: `${t.name}: ${t.fill >= 1 ? "pack used up" : "time to renew"}`, detail: t.note, target: { kind: "tank", id: t.clinicId } });
  }
  for (const p of puddles) {
    if (p.tone === "red" && p.reason) flags.push({ tone: "red", title: `${p.city} is leaking money`, detail: `-$${Math.round(-p.profit)} in 30 days, ${p.note}.`, target: { kind: "puddle", id: p.city } });
    if (p.tone === "green") good.push({ tone: "green", title: `${p.city} is in profit`, detail: p.note, target: { kind: "puddle", id: p.city } });
  }
  const order: Record<Tone, number> = { red: 0, amber: 1, grey: 2, green: 3 };
  flags.sort((a, b) => order[a.tone] - order[b.tone]);

  const hour = input.hour;
  return {
    towers, bays, tanks, clogs, puddles,
    yardLeads: input.live.yardLeads, todayBooked: input.live.todayBooked, todayShowed: input.live.todayShowed,
    totalCost: avg.totalCost, totalRevenue: avg.revenue, profit: avg.profit,
    flags, good, hour, depotOpen: bays.some((b) => b.inSession) || (hour >= 8 && hour < 18),
  };
}
