// Ported from the Legal app (family-law-floater/src/lib/ad-metrics.server.ts). Re-run the port script to refresh.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { buildAdOutcomes } from "./ad-outcomes";
import { loadAdOutcomeSources } from "./ad-outcomes.server";
import { collectPages } from "./collect-pages";
import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";
import { videoMetricsSchema, type AdMetricRow } from "./ad-metrics";

export async function loadAdMetrics(
  range: { from: string | null; to: string | null },
  db: SupabaseClient = supabaseAdmin,
) {
  const until = range.to ?? sydneyTodayISO();
  const [rows, coverage, state, outcomes] = await Promise.all([
    collectPages((from, to) => {
      let query = db
        .from("ad_spend_daily")
        .select(
          "date,ad_id,ad_name,account_id,campaign_id,campaign_name,adset_id,adset_name,creative_id,location,spend_aud,impressions,clicks,video_metrics,metrics_fetched_at",
        )
        .eq("source", "meta")
        .lte("date", until);
      if (range.from) query = query.gte("date", range.from);
      return query.order("date").order("ad_id").order("account_id").range(from, to);
    }),
    collectPages((from, to) =>
      db.from("ad_spend_coverage").select("date").order("date").range(from, to),
    ),
    db
      .from("ad_spend_sync_state")
      .select("last_synced_at,last_status,last_message,currency,timezone,account_name")
      .eq("id", 1)
      .single(),
    loadAdOutcomeSources(db, { from: range.from, to: until }),
  ]);
  if (state.error)
    throw new Error("Ad reporting setup is incomplete. Apply the Numbers migrations.");
  const parsed = (rows as AdMetricRow[]).map((r) => ({
    ...r,
    // Old imports have NULL. Malformed stored metrics fail closed as unavailable.
    video_metrics: videoMetricsSchema.safeParse(r.video_metrics).success
      ? videoMetricsSchema.parse(r.video_metrics)
      : null,
  }));
  const since = range.from ?? parsed[0]?.date ?? until;
  const days = new Set(coverage.map((r) => r.date));
  let missingDays = 0;
  for (let date = since; date <= until; date = addDays(date, 1)) if (!days.has(date)) missingDays++;
  const currencyVerified =
    state.data.currency === "AUD" && state.data.timezone === "Australia/Sydney";
  const coverageComplete =
    missingDays === 0 && currencyVerified && Boolean(state.data.last_synced_at);
  return {
    outcomes: buildAdOutcomes(
      outcomes.catalog,
      parsed,
      outcomes.leads,
      outcomes.appointments,
      coverageComplete,
    ),
    rows: parsed,
    since,
    until,
    missingDays,
    coverageComplete,
    metricsRows: parsed.filter((r) => r.video_metrics !== null).length,
    totalRows: parsed.length,
    lastSynced: state.data.last_synced_at as string | null,
    syncFailed: state.data.last_status === "error",
    accountName: state.data.account_name as string | null,
    currency: currencyVerified ? "AUD" : null,
    provisional: until === sydneyTodayISO() && days.has(until),
  };
}
