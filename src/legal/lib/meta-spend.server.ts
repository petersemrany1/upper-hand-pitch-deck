// Ported from the Legal app (family-law-floater/src/lib/meta-spend.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { z } from "zod";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { locationFromCampaign } from "./numbers";
import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";
import { EMPTY_VIDEO, type VideoMetrics } from "./ad-metrics";
// Coercing null/blank strings to zero would turn missing source data into spend.
const metricNumber = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\d+(\.\d+)?$/)
      .transform(Number),
  ])
  .pipe(z.number().finite().nonnegative());
const actionValues = z
  .array(
    z.object({
      action_type: z.string(),
      value: metricNumber,
    }),
  )
  .optional();
const insight = z.object({
  ad_id: z.string().optional(),
  ad_name: z.string().optional(),
  adset_name: z.string().optional(),
  campaign_id: z.string(),
  campaign_name: z.string().optional(),
  spend: metricNumber,
  impressions: metricNumber.refine(Number.isInteger).optional(),
  clicks: metricNumber.refine(Number.isInteger).optional(),
  date_start: z.string().optional(),
  adset_id: z.string().optional(),
  actions: actionValues,
  video_play_actions: actionValues,
  video_avg_time_watched_actions: actionValues,
  video_thruplay_watched_actions: actionValues,
  video_p25_watched_actions: actionValues,
  video_p50_watched_actions: actionValues,
  video_p75_watched_actions: actionValues,
  video_p95_watched_actions: actionValues,
  video_p100_watched_actions: actionValues,
});
export type MetaConfig = {
  token: string;
  accountId: string;
  campaignIds: string[];
  version: string;
};
export function metaConfig(): MetaConfig {
  const token = legalEnv["LEGAL_META_ACCESS_TOKEN"] || legalEnv["META_ACCESS_TOKEN"];
  const accountId = legalEnv["LEGAL_META_AD_ACCOUNT_ID"];
  const campaignIds = (legalEnv["LEGAL_META_CAMPAIGN_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  if (!token || !accountId || !campaignIds.length)
    throw new Error(
      "Connect the legal Meta account: LEGAL_META_ACCESS_TOKEN, LEGAL_META_AD_ACCOUNT_ID and LEGAL_META_CAMPAIGN_IDS are required.",
    );
  if (!/^(act_)?\d+$/.test(accountId) || campaignIds.some((s) => !/^\d+$/.test(s)))
    throw new Error("Invalid legal Meta account or campaign IDs.");
  return {
    token,
    accountId: accountId.startsWith("act_") ? accountId : `act_${accountId}`,
    campaignIds,
    version: legalEnv["LEGAL_META_API_VERSION"] || "v25.0",
  };
}
async function graph(
  path: string,
  params: Record<string, string>,
  config: MetaConfig,
  fetcher: typeof fetch,
) {
  if (!/^v\d+\.0$/.test(config.version)) throw new Error("Invalid Meta API version");
  const response = await fetcher(
    `https://graph.facebook.com/${config.version}/${path}?${new URLSearchParams(params)}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(30000) },
  );
  const value = (await response.json()) as {
    error?: { code?: number };
    data?: unknown[];
    paging?: { next?: string; cursors?: { after?: string } };
  };
  if (!response.ok || value.error)
    throw new Error(
      `Meta could not provide insights (HTTP ${response.status}, code ${value.error?.code ?? "unknown"}). Check the connection and ads_read permission.`,
    );
  return value;
}
export async function fetchVerifiedMetaSpend(
  config: MetaConfig,
  since: string,
  until: string,
  fetcher: typeof fetch = fetch,
) {
  const fetchedAt = new Date().toISOString();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(since) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(until) ||
    addDays(since, 0) !== since ||
    addDays(until, 0) !== until ||
    until < since ||
    until > addDays(since, 366) ||
    until > sydneyTodayISO()
  )
    throw new Error("Choose valid Meta dates within one year and no later than today");
  const account = z
    .object({
      name: z.string(),
      currency: z.literal("AUD"),
      timezone_name: z.literal("Australia/Sydney"),
    })
    .safeParse(
      await graph(config.accountId, { fields: "name,currency,timezone_name" }, config, fetcher),
    );
  if (!account.success)
    throw new Error("The selected ad account must report in AUD and Australia/Sydney time.");
  const allAdStatuses = [
    "ACTIVE",
    "PAUSED",
    "DELETED",
    "ARCHIVED",
    "PENDING_REVIEW",
    "DISAPPROVED",
    "PREAPPROVED",
    "PENDING_BILLING_INFO",
    "CAMPAIGN_PAUSED",
    "ADSET_PAUSED",
    "IN_PROCESS",
    "WITH_ISSUES",
  ];
  async function pages(level: "ad" | "campaign") {
    const all: z.infer<typeof insight>[] = [];
    let after: string | undefined;
    const seen = new Set<string>();
    do {
      const payload = await graph(
        `${config.accountId}/insights`,
        {
          level,
          fields:
            level === "ad"
              ? "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,actions,video_play_actions,video_avg_time_watched_actions,video_thruplay_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p95_watched_actions,video_p100_watched_actions"
              : "campaign_id,campaign_name,spend",
          time_range: JSON.stringify({ since, until }),
          ...(level === "ad" ? { time_increment: "1" } : {}),
          action_attribution_windows: JSON.stringify(["7d_click", "1d_view"]),
          use_unified_attribution_setting: "false",
          action_report_time: "impression",
          filtering: JSON.stringify([
            { field: "campaign.id", operator: "IN", value: config.campaignIds },
            ...(level === "ad"
              ? [{ field: "ad.effective_status", operator: "IN", value: allAdStatuses }]
              : []),
          ]),
          limit: "500",
          ...(after ? { after } : {}),
        },
        config,
        fetcher,
      );
      all.push(...z.array(insight).parse(payload.data));
      after = payload.paging?.next ? payload.paging?.cursors?.after : undefined;
      if (payload.paging?.next && !after)
        throw new Error("Meta pagination was incomplete. Previous spend has been retained.");
      if (after && seen.has(after))
        throw new Error("Meta repeated a page. Previous spend has been retained.");
      if (after) seen.add(after);
    } while (after);
    return all;
  }
  const [ads, campaigns] = await Promise.all([pages("ad"), pages("campaign")]);
  const keys = new Set<string>();
  for (const a of ads) {
    if (
      !a.ad_id ||
      !a.ad_name ||
      a.impressions === undefined ||
      a.clicks === undefined ||
      !a.date_start ||
      a.date_start < since ||
      a.date_start > until ||
      !config.campaignIds.includes(a.campaign_id)
    )
      throw new Error("Meta returned an invalid or out-of-scope ad row.");
    const key = `${a.ad_id}:${a.date_start}`;
    if (keys.has(key)) throw new Error("Meta returned duplicate ad rows.");
    keys.add(key);
  }
  if (campaigns.some((c) => !config.campaignIds.includes(c.campaign_id)))
    throw new Error("Meta returned an out-of-scope campaign.");
  const cents = (n: number) => Math.round(n * 100),
    total = ads.reduce((sum, a) => sum + cents(a.spend), 0),
    reference = campaigns.reduce((sum, a) => sum + cents(a.spend), 0);
  if (Math.abs(total - reference) > 2)
    throw new Error(
      "Daily ad spend does not reconcile with Meta campaign totals. Previous spend has been retained.",
    );
  return {
    fetchedAt,
    accountName: account.data.name,
    total: total / 100,
    referenceTotal: reference / 100,
    rows: ads.map((a) => ({
      date: a.date_start!,
      ad_id: a.ad_id!,
      ad_name: a.ad_name!,
      adset_name: a.adset_name ?? null,
      campaign_id: a.campaign_id,
      campaign_name: a.campaign_name ?? null,
      location: locationFromCampaign(a.campaign_name ?? null),
      spend_aud: a.spend,
      impressions: a.impressions ?? 0,
      clicks: a.clicks ?? 0,
      adset_id: a.adset_id ?? null,
      creative_id: null, // No unverified name-to-creative inference in the direct fallback.
      metrics_fetched_at: fetchedAt,
      video_metrics: directVideoMetrics(a),
    })),
  };
}
export async function syncMetaSpend(
  since = addDays(sydneyTodayISO(), -6),
  until = sydneyTodayISO(),
) {
  try {
    const config = metaConfig();
    const result = await fetchVerifiedMetaSpend(config, since, until);
    const rpc = supabaseAdmin as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
    const { error } = await rpc.rpc("replace_legal_meta_spend_with_metrics", {
      p_from: since,
      p_to: until,
      p_account: config.accountId,
      p_campaigns: config.campaignIds,
      p_rows: result.rows,
      p_account_name: result.accountName,
      p_total: result.total,
      p_fetched_at: result.fetchedAt,
    });
    if (error) throw new Error(error.message);
    return {
      since,
      until,
      rows: result.rows.length,
      total: result.total,
      referenceTotal: result.referenceTotal,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed";
    await supabaseAdmin
      .from("ad_spend_sync_state")
      .update({
        last_attempt_at: new Date().toISOString(),
        last_status: "error",
        last_message: message.slice(0, 500),
      })
      .eq("id", 1);
    throw new Error(message);
  }
}

function directVideoMetrics(row: z.infer<typeof insight>): VideoMetrics {
  const value = (items: z.infer<typeof actionValues>, action = "video_view") => {
    const matches = items?.filter((item) => item.action_type === action);
    // Absent action is not enough evidence of a measured zero.
    return matches?.length === 1 ? matches[0]!.value : null;
  };
  return {
    ...EMPTY_VIDEO,
    starts: value(row.video_play_actions),
    threeSecond: value(row.actions),
    thruPlays: value(row.video_thruplay_watched_actions),
    averageSeconds: value(row.video_avg_time_watched_actions),
    p25: value(row.video_p25_watched_actions),
    p50: value(row.video_p50_watched_actions),
    p75: value(row.video_p75_watched_actions),
    p95: value(row.video_p95_watched_actions),
    p100: value(row.video_p100_watched_actions),
    metaLeads: value(row.actions, "lead"),
    linkClicks: value(row.actions, "link_click"),
  };
}
