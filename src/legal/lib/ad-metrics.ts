// Ported from the Legal app (family-law-floater/src/lib/ad-metrics.ts). Re-run the port script to refresh.
import { z } from "zod";

// Null means unavailable, never zero. These are daily, unbroken ad-level counts.
const nullableMetric = z.number().finite().nonnegative().nullable();
export const videoMetricsSchema = z.object({
  starts: nullableMetric,
  threeSecond: nullableMetric,
  thruPlays: nullableMetric,
  exact15Second: nullableMetric,
  averageSeconds: nullableMetric,
  p25: nullableMetric,
  p50: nullableMetric,
  p75: nullableMetric,
  p95: nullableMetric,
  p100: nullableMetric,
  metaLeads: nullableMetric,
  linkClicks: nullableMetric,
});
export type VideoMetrics = z.infer<typeof videoMetricsSchema>;
export const EMPTY_VIDEO: VideoMetrics = {
  starts: null,
  threeSecond: null,
  thruPlays: null,
  exact15Second: null,
  averageSeconds: null,
  p25: null,
  p50: null,
  p75: null,
  p95: null,
  p100: null,
  metaLeads: null,
  linkClicks: null,
};
export type AdMetricRow = {
  date: string;
  ad_id: string;
  ad_name: string;
  account_id: string;
  campaign_id: string | null;
  campaign_name: string | null;
  adset_id: string | null;
  adset_name: string | null;
  creative_id: string | null;
  location: string | null;
  spend_aud: number;
  impressions: number;
  clicks: number;
  video_metrics: VideoMetrics | null;
  metrics_fetched_at: string | null;
};
export type AdGrouping = "ad" | "creative" | "name";
export const divide = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b > 0 ? a / b : null;

export function aggregateAdMetrics(rows: AdMetricRow[], coverageComplete = true) {
  const sum = (key: keyof VideoMetrics): number | null => {
    if (!rows.length || rows.some((r) => r.video_metrics?.[key] == null)) return null;
    return rows.reduce((n, r) => n + r.video_metrics![key]!, 0);
  };
  const spend = rows.reduce((n, r) => n + Math.round(r.spend_aud * 100), 0) / 100;
  const impressions = rows.reduce((n, r) => n + r.impressions, 0);
  const clicks = rows.reduce((n, r) => n + r.clicks, 0);
  const starts = sum("starts"),
    threeSecond = sum("threeSecond"),
    thruPlays = sum("thruPlays");
  const metaLeads = sum("metaLeads"),
    exact15Second = sum("exact15Second");
  // Meta rounds daily averages. Weight by the underlying play count, not by days/ads.
  const watchSeconds =
    rows.length &&
    rows.every(
      (r) =>
        r.video_metrics?.starts != null &&
        (r.video_metrics.starts === 0 || r.video_metrics.averageSeconds != null),
    )
      ? rows.reduce(
          (n, r) => n + r.video_metrics!.starts! * (r.video_metrics!.averageSeconds ?? 0),
          0,
        )
      : null;
  const metrics = {
    spend,
    impressions,
    clicks,
    starts,
    threeSecond,
    thruPlays,
    metaLeads,
    exact15Second,
    p25: sum("p25"),
    p50: sum("p50"),
    p75: sum("p75"),
    p95: sum("p95"),
    p100: sum("p100"),
    hookRate: divide(threeSecond, impressions),
    holdRate: divide(thruPlays, threeSecond),
    retention95: divide(sum("p95"), starts),
    completion: divide(sum("p100"), starts),
    averageSeconds: divide(watchSeconds, starts),
    costPerThruPlay: coverageComplete ? divide(spend, thruPlays) : null,
    costPer15Seconds: coverageComplete ? divide(spend, exact15Second) : null,
    costPerLead: coverageComplete ? divide(spend, metaLeads) : null,
    ctr: divide(clicks, impressions),
    cpc: coverageComplete ? divide(spend, clicks) : null,
    cpm: coverageComplete ? divide(spend * 1000, impressions) : null,
    linkCtr: divide(sum("linkClicks"), impressions),
    coverageComplete,
  };
  return metrics;
}
export type AdMetrics = ReturnType<typeof aggregateAdMetrics>;
// Descriptive leaders within the selected cohort, not an attribution/causality claim.
export function adLeaders(rows: AdMetricRow[], complete: boolean) {
  const ads = groupAds(rows, "ad", false, complete);
  const eligible = ads.filter(
    (a) =>
      a.metrics.costPerLead !== null &&
      (a.metrics.metaLeads ?? 0) >= 5 &&
      a.metrics.impressions >= 1000,
  );
  eligible.sort(
    (a, b) =>
      a.metrics.costPerLead! - b.metrics.costPerLead! ||
      b.metrics.metaLeads! - a.metrics.metaLeads! ||
      a.key.localeCompare(b.key),
  );
  const retention = ads
    .filter(
      (a) =>
        (a.metrics.starts ?? 0) >= 1000 &&
        a.metrics.retention95 !== null &&
        a.metrics.retention95 <= 1,
    )
    .sort(
      (a, b) =>
        b.metrics.retention95! - a.metrics.retention95! || b.metrics.starts! - a.metrics.starts!,
    );
  const total = aggregateAdMetrics(rows, complete);
  const lead = complete ? (eligible[0] ?? null) : null;
  return {
    lead,
    runnerUp: complete ? (eligible[1] ?? null) : null,
    retention: complete ? (retention[0] ?? null) : null,
    candidates: eligible.length,
    compared: ads.length,
    saving: lead && total.costPerLead ? 1 - lead.metrics.costPerLead! / total.costPerLead : null,
  };
}
export function groupAds(
  rows: AdMetricRow[],
  mode: AdGrouping,
  splitLocation: boolean,
  complete: boolean,
) {
  const groups = new Map<string, AdMetricRow[]>();
  for (const row of rows) {
    // Include account identity; missing creative IDs never combine unrelated ads.
    const identity =
      mode === "ad"
        ? ["ad", row.ad_id]
        : mode === "creative"
          ? row.creative_id
            ? ["creative", row.creative_id]
            : ["ad", row.ad_id]
          : ["name", row.ad_name]; // Exact names, only after explicit user selection.
    const key = JSON.stringify([
      row.account_id,
      ...identity,
      ...(splitLocation ? [row.location] : []),
    ]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups]
    .map(([key, items]) => ({
      key,
      name: items[items.length - 1]!.ad_name,
      rows: items,
      adIds: [...new Set(items.map((r) => r.ad_id))],
      creativeIds: [...new Set(items.map((r) => r.creative_id).filter(Boolean))],
      locations: [...new Set(items.map((r) => r.location ?? "Unassigned"))],
      metrics: aggregateAdMetrics(items, complete),
    }))
    .sort((a, b) => b.metrics.spend - a.metrics.spend || a.key.localeCompare(b.key));
}
export function adSignals(
  m: AdMetrics,
): { tone: "neutral" | "positive" | "review"; label: string; detail: string }[] {
  if (!m.coverageComplete)
    return [
      {
        tone: "neutral",
        label: "Incomplete range",
        detail: "Import every day before judging costs or performance.",
      },
    ];
  if (m.starts === null || m.threeSecond === null || m.thruPlays === null || m.p95 === null)
    return [
      {
        tone: "neutral",
        label: "Video data unavailable",
        detail: "Missing metrics or a non-video format. No video health verdict.",
      },
    ];
  if (m.impressions < 1000 || m.starts < 100 || m.threeSecond < 100)
    return [
      {
        tone: "neutral",
        label: "Early signal",
        detail:
          "Wait for 1,000 impressions, 100 starts and 100 three-second plays. These are review guardrails, not statistical confidence.",
      },
    ];
  if ((m.holdRate ?? 0) > 1 || (m.retention95 ?? 0) > 1)
    return [
      {
        tone: "neutral",
        label: "Check video mix",
        detail:
          "These play events do not form a strict viewer funnel; short videos and skipped plays can affect comparisons.",
      },
    ];
  const signals: ReturnType<typeof adSignals> = [];
  if (m.retention95 !== null)
    signals.push(
      m.retention95 >= 0.5
        ? {
            tone: "positive",
            label: "Retention target met",
            detail:
              "At least half of video starts reached 95%. This is your target, not an industry benchmark; skipped plays count.",
          }
        : {
            tone: "review",
            label: "Review the middle",
            detail:
              "Below your 50% starts-to-95% target. Compare similar video lengths and test the opening-to-body transition.",
          },
    );
  if (m.costPer15Seconds !== null)
    signals.push(
      m.costPer15Seconds <= 0.3
        ? {
            tone: "positive",
            label: "15-second cost target met",
            detail: "At or below your AUD $0.30 target per actual 15-second play.",
          }
        : {
            tone: "review",
            label: "15-second cost above target",
            detail: "Above your AUD $0.30 target. Review alongside lead quality and conversion.",
          },
    );
  else
    signals.push({
      tone: "neutral",
      label: "15-second target unscored",
      detail:
        "Exact 15-second counts and durations are unavailable. ThruPlay can be a shorter completion.",
    });
  if (m.metaLeads === 0 && m.spend > 0)
    signals.push({
      tone: "review",
      label: "No attributed leads",
      detail:
        "Check the offer, landing experience and attribution. Video engagement alone is not a business win.",
    });
  return signals;
}
