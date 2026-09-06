import { createFileRoute } from "@tanstack/react-router";

// Pulls AD-LEVEL daily spend from the Meta Marketing API and upserts it into
// public.ad_spend_daily. Called nightly by pg_cron (re-pulling the last 7 days
// so late-reported spend self-corrects) and manually for backfills.
//
//   POST /api/public/meta-ad-spend
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY | INTERNAL_FUNCTION_SECRET>
//   Body (optional): { "since": "2025-09-01", "until": "2026-09-05" }
//
// Defaults to the last 7 days (Sydney time) when no range is supplied.

const GRAPH_VERSION = "v21.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sydneyToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function locationFromCampaign(campaign: string | null): string | null {
  if (!campaign) return null;
  const cleaned = campaign.replace(/^hair\s+transplant\s+/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

type Insight = {
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  date_start?: string;
};

export const Route = createFileRoute("/api/public/meta-ad-spend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const internal = process.env.INTERNAL_FUNCTION_SECRET;
        const token = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        if (!token || (token !== serviceKey && token !== internal)) {
          return json({ error: "Unauthorized" }, 401);
        }

        const accessToken = process.env.META_ACCESS_TOKEN;
        const accountIdRaw = process.env.META_AD_ACCOUNT_ID;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const fail = async (message: string, status = 500) => {
          await supabaseAdmin
            .from("ad_spend_sync_state")
            .update({
              last_synced_at: new Date().toISOString(),
              last_status: "error",
              last_message: message.slice(0, 500),
            })
            .eq("id", 1);
          return json({ error: message }, status);
        };

        if (!accessToken || !accountIdRaw) {
          return fail("META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is not configured", 500);
        }

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        const today = sydneyToday();
        const since =
          typeof body.since === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.since)
            ? body.since
            : shiftDays(today, -6);
        const until =
          typeof body.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.until)
            ? body.until
            : today;

        const accountId = accountIdRaw.startsWith("act_") ? accountIdRaw : `act_${accountIdRaw}`;
        const params = new URLSearchParams({
          level: "ad",
          fields: "ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks",
          time_increment: "1",
          time_range: JSON.stringify({ since, until }),
          limit: "500",
          access_token: accessToken,
        });

        let url: string | null =
          `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights?${params.toString()}`;
        const rows: Insight[] = [];
        let pages = 0;

        try {
          while (url && pages < 60) {
            const res = await fetch(url);
            const payload = (await res.json()) as {
              data?: Insight[];
              paging?: { next?: string };
              error?: { message?: string };
            };
            if (!res.ok || payload.error) {
              return fail(
                `Meta API error: ${payload.error?.message ?? res.status}`,
                res.status === 401 || res.status === 403 ? 401 : 502,
              );
            }
            rows.push(...(payload.data ?? []));
            url = payload.paging?.next ?? null;
            pages += 1;
          }
        } catch (e) {
          return fail(`Meta API request failed: ${(e as Error).message}`);
        }

        const upserts = rows
          .filter((r) => r.date_start && r.ad_name)
          .map((r) => ({
            date: r.date_start as string,
            ad_id: r.ad_id ?? null,
            ad_name: r.ad_name as string,
            adset_name: r.adset_name ?? null,
            campaign_name: r.campaign_name ?? null,
            location: locationFromCampaign(r.campaign_name ?? null),
            spend_aud: Number(r.spend ?? 0),
            impressions: Number(r.impressions ?? 0),
            clicks: Number(r.clicks ?? 0),
            source: "meta",
          }));

        // Upsert one row at a time against the (date, ad_id) uniqueness rule so a
        // re-pull of the same day corrects the figure instead of duplicating it.
        let written = 0;
        for (const row of upserts) {
          const existing = await supabaseAdmin
            .from("ad_spend_daily")
            .select("id")
            .eq("date", row.date)
            .eq("ad_name", row.ad_name)
            .maybeSingle();

          if (existing.data?.id) {
            const { error } = await supabaseAdmin
              .from("ad_spend_daily")
              .update(row)
              .eq("id", existing.data.id);
            if (error) return fail(`Write failed: ${error.message}`);
          } else {
            const { error } = await supabaseAdmin.from("ad_spend_daily").insert([row]);
            if (error) return fail(`Write failed: ${error.message}`);
          }
          written += 1;
        }

        await supabaseAdmin
          .from("ad_spend_sync_state")
          .update({
            last_synced_at: new Date().toISOString(),
            last_status: "ok",
            last_message: `${written} rows for ${since} → ${until}`,
            rows_upserted: written,
          })
          .eq("id", 1);

        return json({ success: true, since, until, rows: written });
      },
    },
  },
});
