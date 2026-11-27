// Ported from the Legal app (family-law-floater/src/lib/numbers.ts). Re-run the port script to refresh.
import { repCallDays, type HourCorrection } from "./rep-labour";
import type { ReportingData } from "./reporting-data.server";
import type {
  AdPerformanceRow,
  LabourRow,
  LocationSummaryRow,
  PackEconomicsRow,
  RevenueRow,
  SpendRow,
} from "./numbers.types";
import { pipelineOf, type Pipeline } from "@/legal/components/numbers/model";
import { bookingOwner } from "./reporting";
import { isCountedPack } from "./firm-portal-credits";
import { sydneyTodayISO } from "./timezone";
import { addDays, sydneyMidnight } from "./reporting-period";
export type ReportingRate = {
  rep_id: string;
  hourly_rate: number | null;
  booking_bonus: number | null;
};
export type NumbersRange = {
  from?: string | null | undefined;
  to?: string | null | undefined;
  location?: string | null | undefined;
  excludePeter?: boolean | undefined;
};
export type AdLeadOutcome = {
  lead_id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  calls: number;
  last_called_at: string | null;
  ad_name: string;
  reporting_key: string;
  location: string;
  is_booked: boolean;
  is_showed: boolean;
  is_noshow: boolean;
  is_upcoming: boolean;
  needs_outcome: boolean;
  is_disqualified: boolean;
  unattributed: boolean;
};
const cities = [
  "Byron Bay",
  "Gold Coast",
  "Sunshine Coast",
  "Central Coast",
  "Melbourne",
  "Sydney",
  "Perth",
  "Brisbane",
  "Adelaide",
  "Canberra",
  "Hobart",
  "Darwin",
  "Newcastle",
  "Cairns",
  "Geelong",
  "Wollongong",
  "Townsville",
];
export function locationFromCampaign(name: string | null): string | null {
  return cities.find((c) => (name ?? "").toLowerCase().includes(c.toLowerCase())) ?? null;
}
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const blank = () => ({
  spend: 0,
  leads: 0,
  booked: 0,
  showed: 0,
  noshow: 0,
  upcoming: 0,
  needs_outcome: 0,
  disqualified: 0,
});
const blankLabour = (key: string): LabourRow => ({
  key,
  hours: 0,
  hourly_cost: 0,
  hours_missing_rate: 0,
  hours_fallback: 0,
  bookings: 0,
  bonus_cost: 0,
  bonus_missing_rate: 0,
});
export function makeNumbersReport(
  data: ReportingData,
  allSpend: SpendRow[],
  rates: ReportingRate[],
  range: NumbersRange,
  now = new Date(),
  corrections: HourCorrection[] = [],
) {
  const today = sydneyTodayISO(now),
    from = range.from ? sydneyMidnight(range.from) : null,
    to = range.to ? sydneyMidnight(addDays(range.to, 1)) : now.toISOString();
  const within = (at: string) =>
    !!at && (!from || at >= from) && at < to && at <= now.toISOString();
  const firms = new Map(data.firms.map((f) => [f.id, f]));
  const leads = new Map(data.leads.map((l) => [l.id, l]));
  const warning = new Set<string>();
  const spend = allSpend.filter(
    (s) =>
      (!range.from || s.date >= range.from) && (!range.to || s.date <= range.to) && s.date <= today,
  );
  const ads = new Map<string, AdPerformanceRow>();
  const locations = new Map<string, LocationSummaryRow>();
  const adIdentities = new Map<string, Set<string>>();
  // A creative reused under multiple ad IDs in the same campaign is reported
  // as one creative. Legacy enquiries have names, so splitting its known cost
  // across IDs would invent attribution. The ledger retains every original ID.
  const creative = (s: SpendRow) => `${norm(s.campaign_name)}:${norm(s.ad_name)}`;
  const creativeIds = new Map<string, Set<string>>();
  for (const s of allSpend) {
    if (!s.ad_id || !s.campaign_name) continue;
    const ids = creativeIds.get(creative(s)) ?? new Set<string>();
    ids.add(s.ad_id);
    creativeIds.set(creative(s), ids);
  }
  const identity = (s: SpendRow) =>
    (creativeIds.get(creative(s))?.size ?? 0) > 1
      ? `creative:${creative(s)}`
      : s.ad_id
        ? `id:${s.ad_id}`
        : `manual:${norm(s.ad_name)}:${norm(s.campaign_name)}:${norm(s.location)}`;
  for (const s of allSpend) {
    const key = norm(s.ad_name);
    const found = adIdentities.get(key) ?? new Set();
    found.add(identity(s));
    adIdentities.set(key, found);
  }
  const getLocation = (key: string) => {
    if (!locations.has(key)) locations.set(key, { location: key, ...blank() });
    return locations.get(key)!;
  };
  function getAd(key: string, name: string, location: string, unattributed = false) {
    if (!ads.has(key))
      ads.set(key, {
        reporting_key: key,
        ad_name: name,
        location,
        ...blank(),
        clicks: 0,
        impressions: 0,
        unattributed,
        name_collision: false,
      });
    return ads.get(key)!;
  }
  for (const s of spend) {
    const location = s.location || locationFromCampaign(s.campaign_name) || "website";
    const a = getAd(identity(s), s.ad_name, location);
    a.spend += Number(s.spend_aud);
    a.impressions += Number(s.impressions);
    a.clicks += Number(s.clicks);
    getLocation(location).spend += Number(s.spend_aud);
  }
  const outcomeRows: AdLeadOutcome[] = [];
  const pipelineRows = new Map<
    string,
    { status: string | null; calls: number; booked: boolean }[]
  >();
  const revenueByLocation = new Map<string, RevenueRow>();
  const packEconomics: PackEconomicsRow[] = data.firms
    .map((f) => {
      const packs = data.packs.filter((p) => p.firm_id === f.id && isCountedPack(p));
      const appts = data.appointments.filter(
        (a) =>
          a.firm_id === f.id &&
          a.status !== "cancelled" &&
          !a.disqualified_at &&
          a.outcome !== "disqualified",
      );
      const size = packs.reduce((s, p) => s + p.pack_size, 0),
        value = packs.reduce(
          (s, p) =>
            s +
            p.pack_size *
              (p.price_per_show_cents != null ? p.price_per_show_cents / 100 : p.price_per_show),
          0,
        );
      const delivered = appts.filter(
        (a) => a.outcome === "show" || a.outcome === "signed" || a.status === "showed",
      ).length;
      const paid = packs
        .filter((p) => (p.price_per_show_cents ?? p.price_per_show * 100) > 0)
        .reduce((s, p) => s + p.pack_size, 0);
      return {
        firm_id: f.id,
        firm_name: f.firm_name,
        city: f.city,
        shows_purchased: size,
        shows_paid_purchased: paid,
        shows_free_purchased: size - paid,
        amount_paid_ex_gst: value,
        packs_missing_amount: 0,
        shows_delivered: delivered,
        free_shows_delivered: 0,
        effective_rate: size ? value / size : null,
        paid_rate: paid ? value / paid : null,
        shows_owed: Math.max(0, size - delivered),
        value_owed: Math.max(0, size - delivered) * (size ? value / size : 0),
        over_delivered: Math.max(0, delivered - size),
        list_rate: size ? value / size : 0,
      };
    })
    .filter((p) => p.shows_purchased || p.shows_delivered);
  const packs = new Map(data.packs.map((p) => [p.id, p]));
  for (const l of data.leads.filter((l) => within(l.created_at))) {
    const payload =
      l.raw_payload && typeof l.raw_payload === "object" && !Array.isArray(l.raw_payload)
        ? (l.raw_payload as Record<string, unknown>)
        : {};
    const adId =
      typeof payload["ad_id"] === "string"
        ? payload["ad_id"]
        : typeof payload["ad_id"] === "number"
          ? String(payload["ad_id"])
          : null;
    // The same creative name is used in Sydney and Townsville. Qualify the
    // name by the enquiry's recorded campaign before testing uniqueness.
    const campaignMatches = l.campaign_name
      ? allSpend.filter(
          (s) =>
            norm(s.ad_name) === norm(l.ad_name) && norm(s.campaign_name) === norm(l.campaign_name),
        )
      : [];
    const identities = campaignMatches.length
      ? new Set(campaignMatches.map(identity))
      : adIdentities.get(norm(l.ad_name));
    const matched = adId
      ? allSpend.find((s) => s.ad_id === adId)
      : identities?.size === 1
        ? allSpend.find((s) => identity(s) === [...identities][0])
        : undefined;
    const baseKey = matched
      ? identity(matched)
      : adId
        ? `id:${adId}`
        : l.ad_name
          ? `unmatched:${norm(l.ad_name)}:${norm(l.campaign_name)}`
          : "__unattributed";
    const location =
      matched?.location ||
      locationFromCampaign(matched?.campaign_name ?? null) ||
      locationFromCampaign(l.campaign_name) ||
      l.city ||
      firms.get(l.firm_id ?? "")?.city ||
      "website";
    const key = matched ? baseKey : `${baseKey}:${norm(location)}`;
    const websiteEnquiry = !matched && norm(l.campaign_name) === "website funnel";
    const ad = getAd(key, l.ad_name || "Unattributed enquiries", location, !matched),
      loc = getLocation(location);
    if (websiteEnquiry) ad.website_enquiry = true;
    ad.name_collision = !matched && !!identities && identities.size > 1;
    if (ad.name_collision && !adId)
      warning.add(
        "Some ad names are reused. Ambiguous enquiries are shown separately until an ad ID is available.",
      );
    if (!adId && !matched && l.ad_name && !websiteEnquiry)
      warning.add(
        "Some legacy enquiry labels do not match any imported Meta ad. Their individual ad costs remain unallocated; account totals include all imported spend.",
      );
    const all = data.appointments.filter((a) => a.lead_id === l.id);
    const eligible = all.filter(
      (a) => a.status !== "cancelled" && !a.disqualified_at && a.outcome !== "disqualified",
    );
    // A single enquiry has one current funnel outcome, even after cancellation/rebooking.
    const a = [...eligible].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id),
    )[0];
    const showed = !!a && (a.outcome === "show" || a.outcome === "signed" || a.status === "showed");
    const noshow = !!a && (a.outcome === "noshow" || a.status === "no_show");
    const upcoming =
      !!a && !showed && !noshow && !!a.appointment_date && a.appointment_date >= today;
    const unresolved = !!a && !showed && !noshow && !upcoming;
    const disqualified = !a && all.some((a) => !!a.disqualified_at || a.outcome === "disqualified");
    const calls = data.calls.filter(
      (c) =>
        c.lead_id === l.id &&
        !["pending", "queued", "initiated", "ringing", "in-progress", "skipped"].includes(
          c.call_status ?? "",
        ),
    );
    const row: AdLeadOutcome = {
      lead_id: l.id,
      created_at: l.created_at,
      first_name: l.first_name,
      last_name: l.last_name,
      status: l.status,
      calls: new Set(calls.map((c) => c.twilio_call_sid || c.id)).size,
      last_called_at:
        calls
          .map((c) => c.created_at)
          .sort()
          .at(-1) ?? null,
      ad_name: ad.ad_name,
      reporting_key: key,
      location,
      is_booked: !!a,
      is_showed: showed,
      is_noshow: noshow,
      is_upcoming: upcoming,
      needs_outcome: unresolved,
      is_disqualified: disqualified,
      unattributed: ad.unattributed,
    };
    outcomeRows.push(row);
    for (const target of [ad, loc]) {
      target.leads++;
      target.booked += Number(!!a);
      target.showed += Number(showed);
      target.noshow += Number(noshow);
      target.upcoming += Number(upcoming);
      target.needs_outcome += Number(unresolved);
      target.disqualified += Number(disqualified);
    }
    const pipeline = pipelineRows.get(key) ?? [];
    pipeline.push({ status: l.status, calls: row.calls, booked: row.is_booked });
    pipelineRows.set(key, pipeline);
    if (showed && a) {
      const exact = packs.get(a.offer_pack_id ?? "");
      const weighted = packEconomics.find((p) => p.firm_id === a.firm_id);
      const rate = exact
        ? exact.price_per_show_cents != null
          ? exact.price_per_show_cents / 100
          : exact.price_per_show
        : weighted?.effective_rate;
      if (!exact)
        warning.add(
          "Consultations without a linked pack use the firm’s weighted pack price. Pack value is contracted value, not verified cash received.",
        );
      if (rate == null)
        warning.add(
          "Some attended consultations have no recorded pack price; their revenue is incomplete.",
        );
      const rev = revenueByLocation.get(location) ?? { key: location, shows: 0, revenue: 0 };
      rev.shows++;
      rev.revenue += rate ?? 0;
      revenueByLocation.set(location, rev);
    }
  }
  const labour = new Map<string, LabourRow>();
  const getLab = (key: string) => {
    if (!labour.has(key)) labour.set(key, blankLabour(key));
    return labour.get(key)!;
  };
  const excluded = new Set(
    range.excludePeter
      ? data.reps.filter((r) => /^peter(?:\b|$)/i.test(r.name ?? "")).map((r) => r.id)
      : [],
  );
  const unresolvedCallOwners = data.calls.some(
    (c) =>
      within(c.created_at) &&
      !c.rep_id &&
      !["pending", "queued", "initiated", "ringing", "in-progress", "skipped"].includes(
        c.call_status ?? "",
      ),
  );
  if (unresolvedCallOwners)
    warning.add(
      "Some client calls have no rep recorded. Their labour cannot be attributed until ownership is reviewed.",
    );
  const repDays = repCallDays(
    data.calls.filter((c) => within(c.created_at) && !excluded.has(c.rep_id ?? "")),
    corrections.filter(
      (c) =>
        !excluded.has(c.rep_id) &&
        (!range.from || c.work_date >= range.from) &&
        (!range.to || c.work_date <= range.to) &&
        c.work_date <= today,
    ),
  );
  for (const day of repDays) {
    const rate = rates.find((r) => r.rep_id === day.rep_id)?.hourly_rate;
    const byCity = new Map<string, { seconds: number; leads: Set<string> }>();
    for (const c of day.calls) {
      const l = leads.get(c.lead_id ?? "");
      const key =
        locationFromCampaign(l?.campaign_name ?? null) ||
        l?.city ||
        firms.get(l?.firm_id ?? "")?.city ||
        "(unallocated)";
      const part = byCity.get(key) ?? { seconds: 0, leads: new Set<string>() };
      part.seconds += Math.max(0, c.duration_seconds ?? 0);
      part.leads.add(c.lead_id || c.id);
      byCity.set(key, part);
    }
    const seconds = [...byCity.values()].reduce((s, p) => s + p.seconds, 0),
      contacted = [...byCity.values()].reduce((s, p) => s + p.leads.size, 0);
    if (!byCity.size) byCity.set("(unallocated)", { seconds: 0, leads: new Set(["manual"]) });
    for (const [key, part] of byCity) {
      const weight = seconds ? part.seconds / seconds : part.leads.size / (contacted || 1),
        h = day.hours * weight,
        lab = getLab(key);
      lab.hours += h;
      lab.hourly_cost += h * (rate ?? 0);
      if (rate == null) lab.hours_missing_rate += h;
      if (!seconds) lab.hours_fallback += h;
    }
  }
  let unresolvedBookingOwners = 0;
  let knownOwnerMissingBonus = false;
  for (const a of data.appointments.filter((a) => within(a.created_at))) {
    const owner = bookingOwner(a, data.calls);
    if (owner && excluded.has(owner)) continue;
    const l = leads.get(a.lead_id ?? "");
    const key = l?.city || firms.get(a.firm_id ?? "")?.city || "(unallocated)",
      lab = getLab(key),
      rate = rates.find((r) => r.rep_id === owner)?.booking_bonus;
    lab.bookings++;
    lab.bonus_cost += rate ?? 0;
    if (rate == null) {
      lab.bonus_missing_rate++;
      if (!owner) unresolvedBookingOwners++;
      else knownOwnerMissingBonus = true;
    }
  }

  if (unresolvedBookingOwners)
    warning.add(
      `${unresolvedBookingOwners} booking${unresolvedBookingOwners === 1 ? " has" : "s have"} no confirmed rep owner. Booking bonuses and contribution totals remain incomplete until ownership is reviewed.`,
    );
  if (knownOwnerMissingBonus || [...labour.values()].some((l) => l.hours_missing_rate))
    warning.add(
      "Rep hourly or booking bonus rates are missing. Complete the rates before relying on labour or contribution totals.",
    );
  const pipelines: Record<string, Pipeline> = {};
  for (const [key, rows] of pipelineRows) pipelines[key] = pipelineOf(rows);
  const needsOutcome = data.appointments
    .filter(
      (a) =>
        a.status !== "cancelled" &&
        !a.disqualified_at &&
        !a.outcome &&
        a.status !== "no_show" &&
        a.status !== "showed" &&
        a.appointment_date &&
        a.appointment_date < today &&
        within(leads.get(a.lead_id ?? "")?.created_at ?? "") &&
        (!range.location ||
          (leads.get(a.lead_id ?? "")?.city || firms.get(a.firm_id ?? "")?.city) ===
            range.location),
    )
    .map((a) => ({
      appointment_id: a.id,
      client_name: a.client_name ?? "Unnamed client",
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      firm_name: firms.get(a.firm_id ?? "")?.firm_name ?? null,
    }));
  const selectedAds = [...ads.values()].filter(
    (a) => !range.location || a.location === range.location,
  );
  return {
    ads: selectedAds,
    locations: [...locations.values()],
    labourByLocation: [...labour.values()],
    revenueByLocation: [...revenueByLocation.values()],
    packEconomics,
    pipelines,
    needsOutcome,
    warnings: [...warning],
    repDays: repDays.map(({ calls, ...day }) => ({
      ...day,
      calls: calls.length,
      rep_name: data.reps.find((r) => r.id === day.rep_id)?.name ?? "Unknown rep",
    })),
    labourComplete:
      !unresolvedCallOwners &&
      ![...labour.values()].some((l) => l.hours_missing_rate || l.bonus_missing_rate),
    revenueComplete: ![...warning].some((w) => w.includes("revenue is incomplete")),
    peterExcluded: excluded.size > 0,
    outcomes: outcomeRows.filter((r) => !range.location || r.location === range.location),
    spendCoverage: {
      from: spend.map((s) => s.date).sort()[0] ?? null,
      to:
        spend
          .map((s) => s.date)
          .sort()
          .at(-1) ?? null,
    },
    spendDuplicates: 0,
    asOf: now.toISOString(),
  };
}
