// Ported from the Legal app (family-law-floater/src/lib/legal-spend-import.ts). Re-run the port script to refresh.
import { z } from "zod";
import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";
import { locationFromCampaign } from "./numbers";
import { EMPTY_VIDEO, type VideoMetrics } from "./ad-metrics";

export const WINDSOR_VIDEO_FIELDS = {
  starts: "video_play_actions_video_view",
  threeSecond: "actions_video_view",
  thruPlays: "video_thruplay_watched_actions_video_view",
  averageSeconds: "video_avg_time_watched_actions_video_view",
  p25: "video_p25_watched_actions_video_view",
  p50: "video_p50_watched_actions_video_view",
  p75: "video_p75_watched_actions_video_view",
  p95: "video_p95_watched_actions_video_view",
  p100: "video_p100_watched_actions_video_view",
  metaLeads: "actions_lead",
  linkClicks: "actions_link_click",
} as const;
// Coercion of null/empty strings would silently turn unavailable into zero.
const optionalMetric = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number().finite().nonnegative())
  .nullish();
const videoFields = z.object(
  Object.fromEntries(Object.values(WINDSOR_VIDEO_FIELDS).map((key) => [key, optionalMetric])) as {
    [K in (typeof WINDSOR_VIDEO_FIELDS)[keyof typeof WINDSOR_VIDEO_FIELDS]]: typeof optionalMetric;
  },
);

export const LEGAL_AD_ACCOUNT = "3333812883673737";
// Include historical/deleted launch campaigns as well as the two current campaigns.
export const LEGAL_AD_CAMPAIGNS = [
  "120248790310150599",
  "120248848747060599",
  "120248855679240599",
  "120248932680660599",
  "120249122136120599",
];
const metric = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number().finite().nonnegative());
const metadata = z.object({
  account_id: z.literal(LEGAL_AD_ACCOUNT),
  account_name: z.string().min(1),
  account_currency: z.literal("AUD"),
  account_timezone: z.literal("Australia/Sydney"),
  campaign_id: z.string(),
  campaign: z.string().nullable(),
  spend: metric,
});
const daily = metadata
  .extend({
    date: z.string(),
    ad_id: z.string().regex(/^\d+$/),
    ad_name: z.string().min(1),
    adset_name: z.string().nullable(),
    impressions: metric.refine(Number.isInteger),
    clicks: metric.refine(Number.isInteger),
    data_fetched_at: z.string(),
    creative_id: z.string().nullable().optional(),
    adset_id: z.string().nullable().optional(),
  })
  .merge(videoFields);
const schema = z.object({
  since: z.string(),
  until: z.string(),
  referenceUntil: z.string(),
  videoSchemaVersion: z.literal(1).optional(),
  rows: z.preprocess(removeEmptyDailyRows, z.array(daily).min(1).max(100000)),
  campaigns: z.preprocess(removeEmptyAccountRows, z.array(metadata).min(1).max(1000)),
});
// Explicitly requested idle ads have no date and cannot become delivery rows.
// Keep anything with activity or an unexpected identity so validation rejects it.
function removeEmptyDailyRows(value: unknown) {
  const rows = removeEmptyAccountRows(value);
  if (!Array.isArray(rows)) return rows;
  return rows.filter(
    (r) =>
      !(
        r &&
        r.account_id === LEGAL_AD_ACCOUNT &&
        r.account_currency === "AUD" &&
        r.account_timezone === "Australia/Sydney" &&
        LEGAL_AD_CAMPAIGNS.includes(r.campaign_id) &&
        typeof r.ad_id === "string" &&
        /^\d+$/.test(r.ad_id) &&
        r.date === null &&
        r.spend === 0 &&
        ["impressions", "clicks", ...Object.values(WINDSOR_VIDEO_FIELDS)].every(
          (key) => r[key] == null || r[key] === 0,
        )
      ),
  );
}
// Windsor emits a metadata-only zero row for an account with no activity in part
// of the requested period. It is not an ad. Never discard a positive/foreign row.
function removeEmptyAccountRows(value: unknown) {
  if (!Array.isArray(value)) return value;
  return value.filter(
    (r) =>
      !(
        r &&
        r.account_id === LEGAL_AD_ACCOUNT &&
        r.account_currency === "AUD" &&
        r.account_timezone === "Australia/Sydney" &&
        r.spend === 0 &&
        r.campaign_id === null &&
        r.campaign === null &&
        r.ad_id == null &&
        r.date == null &&
        !(r.impressions > 0) &&
        !(r.clicks > 0)
      ),
  );
}

/** Independently requested campaign totals must reconcile for EACH campaign.
 * Fail closed on missing pages, duplicates, foreign accounts or newly unreviewed campaigns. */
export function verifyLegalSpendImport(
  input: unknown,
  now = new Date(),
  options: { allowStaleForComparison?: boolean } = {},
) {
  const data = schema.parse(input);
  const today = sydneyTodayISO(now);
  const closedThrough = data.until === today ? addDays(today, -1) : data.until;
  if (data.referenceUntil !== closedThrough || closedThrough < data.since)
    throw new Error("Campaign reference must cover the same completed days");
  if (
    ![data.since, data.until].every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d) ||
    data.until < data.since ||
    data.until > today ||
    data.until > addDays(data.since, 366)
  )
    throw new Error("Invalid spend date range");
  const keys = new Set<string>(),
    totals = new Map<string, number>(),
    closedTotals = new Map<string, number>(),
    refs = new Map<string, number>();
  let fetchedAt = Infinity;
  for (const r of data.rows) {
    if (r.date < data.since || r.date > data.until || addDays(r.date, 0) !== r.date)
      throw new Error("Spend row outside requested dates");
    const key = `${r.ad_id}:${r.date}`;
    if (keys.has(key)) throw new Error("Duplicate daily ad row");
    keys.add(key);
    const timestamp = Date.parse(
      /[zZ]|[+-]\d\d:\d\d$/.test(r.data_fetched_at) ? r.data_fetched_at : `${r.data_fetched_at}Z`,
    );
    if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 300000)
      throw new Error("Invalid source fetch timestamp");
    // A single fresh row must not disguise stale cached history.
    fetchedAt = Math.min(fetchedAt, timestamp);
    totals.set(r.campaign_id, (totals.get(r.campaign_id) ?? 0) + Math.round(r.spend * 100));
    if (r.date <= closedThrough)
      closedTotals.set(
        r.campaign_id,
        (closedTotals.get(r.campaign_id) ?? 0) + Math.round(r.spend * 100),
      );
  }
  for (const r of data.campaigns) {
    if (refs.has(r.campaign_id)) throw new Error("Duplicate campaign reference");
    refs.set(r.campaign_id, Math.round(r.spend * 100));
  }
  for (const id of new Set([...totals.keys(), ...refs.keys()])) {
    if (!LEGAL_AD_CAMPAIGNS.includes(id))
      throw new Error("Unreviewed legal campaign; import retained for review");
    if ((closedTotals.get(id) ?? 0) !== (refs.get(id) ?? 0))
      throw new Error("Daily ad spend does not reconcile exactly with campaign totals");
  }
  const stale = now.getTime() - fetchedAt > 26 * 3600000;
  if (stale && !options.allowStaleForComparison)
    throw new Error("Source data is more than 26 hours old");
  const total = [...totals.values()].reduce((a, b) => a + b, 0) / 100;
  return {
    since: data.since,
    until: data.until,
    total,
    referenceTotal: [...refs.values()].reduce((a, b) => a + b, 0) / 100,
    referenceUntil: closedThrough,
    fetchedAt: new Date(fetchedAt).toISOString(),
    stale,
    accountName: data.rows[0]!.account_name,
    rows: data.rows.map((r) => ({
      date: r.date,
      ad_id: r.ad_id,
      ad_name: r.ad_name,
      adset_name: r.adset_name,
      campaign_id: r.campaign_id,
      campaign_name: r.campaign,
      location: locationFromCampaign(r.campaign),
      spend_aud: r.spend,
      impressions: r.impressions,
      clicks: r.clicks,
      ...(data.videoSchemaVersion === 1
        ? {
            creative_id: r.creative_id ?? null,
            adset_id: r.adset_id ?? null,
            video_metrics: Object.fromEntries(
              Object.entries(EMPTY_VIDEO).map(([key]) => [
                key,
                key in WINDSOR_VIDEO_FIELDS
                  ? (r[WINDSOR_VIDEO_FIELDS[key as keyof typeof WINDSOR_VIDEO_FIELDS]] ?? null)
                  : null,
              ]),
            ) as VideoMetrics,
            metrics_fetched_at: /[zZ]|[+-]\d\d:\d\d$/.test(r.data_fetched_at)
              ? r.data_fetched_at
              : `${r.data_fetched_at}Z`,
          }
        : {}),
    })),
  };
}

/** An older cached response is harmless only when it is exactly the data already
 * stored. Never permit it to change a number, identity, metadata or row coverage. */
export function sameVerifiedSpendRows(
  incoming: ReturnType<typeof verifyLegalSpendImport>["rows"],
  existing: Record<string, unknown>[],
) {
  if (incoming.length !== existing.length || !incoming.length) return false;
  const canonical = (row: Record<string, unknown>) => {
    if (!row["video_metrics"] || typeof row["video_metrics"] !== "object") return null;
    const metrics = row["video_metrics"] as Record<string, unknown>;
    return JSON.stringify([
      ...[
        "date",
        "ad_id",
        "ad_name",
        "adset_name",
        "campaign_id",
        "campaign_name",
        "location",
        "creative_id",
        "adset_id",
      ].map((k) => row[k] ?? null),
      ...["spend_aud", "impressions", "clicks"].map((k) => Number(row[k])),
      ...Object.keys(EMPTY_VIDEO).map((k) => metrics[k] ?? null),
    ]);
  };
  const a = incoming.map(canonical),
    b = existing.map(canonical);
  if (a.includes(null) || b.includes(null)) return false;
  return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
}
