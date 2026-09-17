// Daily 9am Sydney watchdog for the ad spend feed.
//
//   POST /api/public/hooks/spend-stale-check
//   Authorization: Bearer <INTERNAL_FUNCTION_SECRET>
//
// Reads the newest ad_spend_daily date and the last push status, applies the
// shared staleness rule, and emails Peter once a day when the feed is dead.
// Read-only against the spend data — it never writes ad_spend_daily.
//
// Test/simulation body (does not touch data):
//   { "testNewestDate": "2026-08-01", "testStatus": "error", "dryRun": true }

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { evaluateSpendStaleness } from "@/lib/spend-staleness";
import { APP_TIMEZONE, sydneyTodayISO } from "@/lib/timezone";

const ALERT_SETTING_KEY = "spend_stale_alert_last_sent";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/hooks/spend-stale-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env.INTERNAL_FUNCTION_SECRET ?? process.env.CLINICFLOW_CRON_SECRET;
        if (!expected) return json({ error: "Server misconfigured" }, 500);
        const header = request.headers.get("authorization") ?? "";
        const provided = header.toLowerCase().startsWith("bearer ")
          ? header.slice(7).trim()
          : (request.headers.get("x-internal-secret") ?? "").trim();
        if (provided !== expected) return json({ error: "Unauthorized" }, 401);

        let body: Record<string, unknown> = {};
        try {
          body = ((await request.json()) as Record<string, unknown>) ?? {};
        } catch {
          body = {};
        }
        const testNewestDate =
          typeof body.testNewestDate === "string" ? body.testNewestDate : null;
        const testStatus = typeof body.testStatus === "string" ? body.testStatus : null;
        const dryRun = body.dryRun === true;

        const db = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const [newest, sync, lastSent] = await Promise.all([
          db.from("ad_spend_daily").select("date").order("date", { ascending: false }).limit(1).maybeSingle(),
          db.from("ad_spend_sync_state").select("last_status, last_message, last_synced_at").eq("id", 1).maybeSingle(),
          db.from("app_settings").select("value").eq("key", ALERT_SETTING_KEY).maybeSingle(),
        ]);

        const realNewest = (newest.data?.date as string | undefined) ?? null;
        const result = evaluateSpendStaleness({
          newestDate: testNewestDate ?? realNewest,
          lastStatus: testStatus ?? (sync.data?.last_status ?? null),
          lastMessage: sync.data?.last_message ?? null,
        });

        const today = sydneyTodayISO();
        const alreadySentToday =
          typeof lastSent.data?.value === "string"
            ? lastSent.data.value === today
            : (lastSent.data?.value as { date?: string } | null)?.date === today;

        let emailed = false;
        let skippedReason: string | null = null;

        if (!result.stale) {
          skippedReason = "feed is fresh";
        } else if (alreadySentToday && !testNewestDate && !testStatus) {
          skippedReason = "already emailed today";
        } else if (dryRun) {
          skippedReason = "dry run";
        } else {
          const { sendSpendFeedStaleAlert } = await import("@/utils/ops-alert.server");
          emailed = await sendSpendFeedStaleAlert({
            newestDate: result.newestDate,
            reason: result.reason ?? "",
            checkedAtSydney: new Date().toLocaleString("en-AU", { timeZone: APP_TIMEZONE }),
          });
          if (emailed && !testNewestDate && !testStatus) {
            await db
              .from("app_settings")
              .upsert({ key: ALERT_SETTING_KEY, value: today, updated_at: new Date().toISOString() }, { onConflict: "key" });
          }
        }

        return json({
          ok: true,
          stale: result.stale,
          reason: result.reason,
          newestDateStored: realNewest,
          newestDateEvaluated: result.newestDate,
          lastSyncStatus: sync.data?.last_status ?? null,
          simulated: Boolean(testNewestDate || testStatus),
          emailed,
          skippedReason,
        });
      },
    },
  },
});
