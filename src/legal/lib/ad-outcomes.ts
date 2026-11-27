// Ported from the Legal app (family-law-floater/src/lib/ad-outcomes.ts). Re-run the port script to refresh.
import { trackingAdName } from "./tracking-ad-name";
import type { AdMetricRow } from "./ad-metrics";
export type AdIdentity = Pick<
  AdMetricRow,
  "account_id" | "ad_id" | "ad_name" | "campaign_name" | "adset_name" | "location"
>;
export type OutcomeLead = {
  id: string;
  ad_name: string | null;
  campaign_name: string | null;
  ad_set_name: string | null;
  raw_payload: unknown;
};
export type OutcomeAppointment = {
  lead_id: string | null;
  status: string | null;
  outcome: string | null;
  disqualified_at: string | null;
};
export type AdOutcome = {
  key: string;
  adId: string;
  name: string;
  locations: string[];
  leads: number;
  booked: number;
  nameMatched: number;
  spend: number;
  bookingRate: number | null;
  costPerLead: number | null;
  costPerBooking: number | null;
};
export type AdOutcomeReport = {
  ads: AdOutcome[];
  unmatchedLeads: number;
  unmatchedBookings: number;
  totalLeads: number;
  totalBooked: number;
};
const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
export const adIdentityKey = (ad: Pick<AdIdentity, "account_id" | "ad_id">) =>
  JSON.stringify([ad.account_id.replace(/^act_/, ""), ad.ad_id]);
const idString = (v: unknown) =>
  typeof v === "string" && v.trim()
    ? v.trim()
    : typeof v === "number" && Number.isSafeInteger(v)
      ? String(v)
      : null;

/** The same enquiry cohort supplies numerator and denominator. Never apportion ambiguous names. */
export function buildAdOutcomes(
  catalog: AdIdentity[],
  delivery: AdMetricRow[],
  leads: OutcomeLead[],
  appointments: OutcomeAppointment[],
  complete: boolean,
): AdOutcomeReport {
  const identities = new Map<string, AdIdentity[]>();
  for (const ad of catalog) {
    const key = adIdentityKey(ad);
    const existing = identities.get(key) ?? [];
    existing.push(ad);
    identities.set(key, existing);
  }
  const groups = new Map<string, AdOutcome>();
  const ensure = (key: string) => {
    let result = groups.get(key);
    if (!result) {
      const records = identities.get(key)!;
      const latest = records[records.length - 1]!;
      result = {
        key,
        adId: latest.ad_id,
        name: trackingAdName(latest.ad_id, latest.ad_name),
        locations: [...new Set(records.map((r) => r.location ?? "Unassigned"))],
        leads: 0,
        booked: 0,
        nameMatched: 0,
        spend: 0,
        bookingRate: null,
        costPerLead: null,
        costPerBooking: null,
      };
      groups.set(key, result);
    }
    return result;
  };
  for (const ad of delivery) {
    const key = adIdentityKey(ad);
    if (!identities.has(key)) identities.set(key, [ad]);
    ensure(key).spend += Math.round(ad.spend_aud * 100);
  }
  // A rebooking is still one booked lead. Later cancellation/no-show does not erase acquisition.
  const booked = new Set(
    appointments
      .filter(
        (a) =>
          a.lead_id &&
          !a.disqualified_at &&
          a.outcome !== "disqualified" &&
          a.status !== "disqualified",
      )
      .map((a) => a.lead_id!),
  );
  let unmatchedLeads = 0,
    unmatchedBookings = 0,
    totalBooked = 0;
  const uniqueLeads = [...new Map(leads.map((l) => [l.id, l])).values()];
  for (const lead of uniqueLeads) {
    const payload =
      lead.raw_payload && typeof lead.raw_payload === "object" && !Array.isArray(lead.raw_payload)
        ? (lead.raw_payload as Record<string, unknown>)
        : {};
    const adId = idString(payload["ad_id"]),
      accountId = idString(payload["account_id"])?.replace(/^act_/, "");
    let candidates = [...identities].filter(([, aliases]) =>
      aliases.some((ad) =>
        adId
          ? ad.ad_id === adId && (!accountId || ad.account_id.replace(/^act_/, "") === accountId)
          : Boolean(norm(lead.ad_name)) &&
            norm(ad.ad_name) === norm(lead.ad_name) &&
            (!norm(lead.campaign_name) || norm(ad.campaign_name) === norm(lead.campaign_name)) &&
            (!accountId || ad.account_id.replace(/^act_/, "") === accountId),
      ),
    );
    // Legacy ad-set labels can predate a rename. Use them to resolve collisions;
    // an already unique name/campaign identity does not need that extra hint.
    if (!adId && candidates.length > 1 && norm(lead.ad_set_name))
      candidates = candidates.filter(([, aliases]) =>
        aliases.some(
          (ad) =>
            norm(ad.ad_name) === norm(lead.ad_name) &&
            (!norm(lead.campaign_name) || norm(ad.campaign_name) === norm(lead.campaign_name)) &&
            norm(ad.adset_name) === norm(lead.ad_set_name),
        ),
      );
    if (payload["ad_id"] && !adId) candidates = []; // An unsafe numeric ID is not a legacy name-only enquiry.
    const isBooked = booked.has(lead.id);
    if (isBooked) totalBooked++;
    if (candidates.length !== 1) {
      unmatchedLeads++;
      if (isBooked) unmatchedBookings++;
      continue;
    }
    const row = ensure(candidates[0]![0]);
    row.leads++;
    if (isBooked) row.booked++;
    if (!adId) row.nameMatched++;
  }
  for (const row of groups.values()) {
    row.spend /= 100;
    row.bookingRate = row.leads ? row.booked / row.leads : null;
    row.costPerLead = complete && row.leads ? row.spend / row.leads : null;
    row.costPerBooking = complete && row.booked ? row.spend / row.booked : null;
  }
  return {
    ads: [...groups.values()],
    unmatchedLeads,
    unmatchedBookings,
    totalLeads: uniqueLeads.length,
    totalBooked,
  };
}
export type OutcomeRanking = "bookings" | "leads" | "conversion";

/** Apply filters to whole ads so CRM counts and delivery metrics describe the same identities. */
export function filterTrackingAds(
  delivery: AdMetricRow[],
  outcomes: AdOutcome[],
  location: string,
  search: string,
) {
  const delivered = new Set(delivery.map(adIdentityKey));
  const locations = new Set(delivery.map((ad) => ad.location ?? "Unassigned"));
  const withoutDelivery = outcomes.filter((ad) => !delivered.has(ad.key));
  for (const ad of withoutDelivery) for (const place of ad.locations) locations.add(place);
  const selectedLocation = locations.has(location) ? location : "";
  const term = norm(search);
  const matching = new Set<string>();
  for (const ad of delivery) {
    if (selectedLocation && (ad.location ?? "Unassigned") !== selectedLocation) continue;
    if ([ad.ad_name, ad.campaign_name, ad.adset_name, ad.ad_id].some((v) => norm(v).includes(term)))
      matching.add(adIdentityKey(ad));
  }
  // A lead can arrive in a period when its ad had no delivery.
  for (const ad of withoutDelivery) {
    if (selectedLocation && !ad.locations.includes(selectedLocation)) continue;
    if ([ad.name, ad.adId].some((v) => norm(v).includes(term))) matching.add(ad.key);
  }
  return {
    rows: delivery.filter((ad) => matching.has(adIdentityKey(ad))),
    ads: outcomes.filter((ad) => matching.has(ad.key)),
    locations: [...locations].sort(),
    selectedLocation,
  };
}

export function rankAdOutcomes(rows: AdOutcome[], ranking: OutcomeRanking) {
  return rows
    .filter((r) =>
      ranking === "leads"
        ? r.leads > 0
        : ranking === "conversion"
          ? r.leads >= 10 && r.booked >= 2
          : r.booked > 0,
    )
    .sort(
      (a, b) =>
        (ranking === "leads"
          ? b.leads - a.leads
          : ranking === "conversion"
            ? (b.bookingRate ?? 0) - (a.bookingRate ?? 0)
            : b.booked - a.booked) ||
        b.booked - a.booked ||
        (b.bookingRate ?? 0) - (a.bookingRate ?? 0) ||
        b.leads - a.leads ||
        a.key.localeCompare(b.key),
    );
}
