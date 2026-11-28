// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/import-legal-meta-spend.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { verifySpendWorkflowToken } from "@/legal/lib/legal-spend-oidc.server";
import {
  verifyLegalSpendImport,
  LEGAL_AD_ACCOUNT,
  LEGAL_AD_CAMPAIGNS,
  sameVerifiedSpendRows,
} from "@/legal/lib/legal-spend-import";
import { collectPages } from "@/legal/lib/collect-pages";
import { addDays } from "@/legal/lib/reporting-period";

export const Route = createFileRoute("/api/public/hooks/import-legal-meta-spend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        try {
          const authorization = request.headers.get("authorization") ?? "";
          if (!authorization.startsWith("Bearer "))
            return new Response("Unauthorized", { status: 401 });
          await verifySpendWorkflowToken(authorization.slice(7));
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const text = await request.text();
          if (text.length > 10_000_000) return new Response("Payload too large", { status: 413 });
          const now = new Date();
          const result = verifyLegalSpendImport(JSON.parse(text), now, {
            allowStaleForComparison: true,
          });
          const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
          const reportingDb: SupabaseClient = supabaseAdmin;
          const rpc = supabaseAdmin as unknown as {
            rpc: (
              name: string,
              args: Record<string, unknown>,
            ) => PromiseLike<{ error: { message: string } | null }>;
          };
          // An old cache can only be compared with a still-current saved import.
          // Never send it to the write RPC or advance coverage/freshness with it.
          const { error } = result.stale
            ? { error: { message: "Source data is more than 26 hours old" } }
            : await rpc.rpc("import_verified_legal_spend", {
                p_from: result.since,
                p_to: result.until,
                p_account: `act_${LEGAL_AD_ACCOUNT}`,
                p_campaigns: LEGAL_AD_CAMPAIGNS,
                p_rows: result.rows,
                p_account_name: result.accountName,
                p_total: result.total,
                p_fetched_at: result.fetchedAt,
              });
          let unchanged = false;
          if (
            result.stale ||
            error?.message.includes("A newer source snapshot has already been imported")
          ) {
            const [stored, coverage, sync] = await Promise.all([
              collectPages((from, to) =>
                reportingDb
                  .from("ad_spend_daily")
                  .select(
                    "date,ad_id,ad_name,adset_name,campaign_id,campaign_name,location,spend_aud,impressions,clicks,creative_id,adset_id,video_metrics",
                  )
                  .eq("source", "meta")
                  .eq("account_id", `act_${LEGAL_AD_ACCOUNT}`)
                  .gte("date", result.since)
                  .lte("date", result.until)
                  .order("date")
                  .order("ad_id")
                  .range(from, to),
              ),
              collectPages((from, to) =>
                reportingDb
                  .from("ad_spend_coverage")
                  .select("date")
                  .gte("date", result.since)
                  .lte("date", result.until)
                  .order("date")
                  .range(from, to),
              ),
              reportingDb
                .from("ad_spend_sync_state")
                .select("last_synced_at,last_status")
                .eq("id", 1)
                .single(),
            ]);
            if (sync.error) throw new Error("Could not verify saved source freshness");
            const days = new Set(coverage.map((r) => r.date));
            let covered = true;
            for (let d = result.since; d <= result.until; d = addDays(d, 1))
              if (!days.has(d)) covered = false;
            const savedTime = Date.parse(sync.data?.last_synced_at ?? "");
            const current =
              sync.data?.last_status === "ok" &&
              Number.isFinite(savedTime) &&
              savedTime >= now.getTime() - 26 * 3600000 &&
              savedTime <= now.getTime() + 300000;
            unchanged = current && covered && sameVerifiedSpendRows(result.rows, stored);
          }
          if (error && !unchanged) throw new Error(error.message);
          return Response.json({
            unchanged,
            message: unchanged
              ? "Identical cached source; newer verified snapshot retained without changing data or timestamps."
              : "Reconciled source imported.",
            rows: result.rows.length,
            total: result.total,
            referenceTotal: result.referenceTotal,
            verifiedThrough: result.referenceUntil,
            since: result.since,
            until: result.until,
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Import failed" },
            { status: 422 },
          );
        }
      },
    },
  },
});
