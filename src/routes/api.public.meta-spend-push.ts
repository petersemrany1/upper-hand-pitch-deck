import { createFileRoute } from "@tanstack/react-router";

// Receives daily ad spend pushed in from Make.com (replaces the direct Meta
// Graph API pull while the developer app is blocked).
//
//   POST /api/public/meta-spend-push
//   Authorization: Bearer <META_LEADS_WEBHOOK_TOKEN>
//   { "rows": [{ date, ad_id?, ad_name, adset_name?, campaign_name?,
//                spend_aud, impressions?, clicks? }, ...] }
//
// Rows are upserted on the same key the sync uses (date + ad_id, falling back
// to ad_name) with source='make'. For every date+location the push covers,
// hand-entered (source='manual') estimate rows are cleared first so real
// figures replace them instead of stacking on top.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const MAX_ROWS = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function asString(v: unknown, max = 500): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s.slice(0, max) : null;
}

function asNumber(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export const Route = createFileRoute("/api/public/meta-spend-push")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const expected = process.env.META_LEADS_WEBHOOK_TOKEN;
        if (!expected) {
          return json({ error: "Webhook token not configured on server" }, 500);
        }
        const token = (request.headers.get("authorization") ?? "")
          .replace(/^Bearer\s+/i, "")
          .trim();
        if (!token || token !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const raw = Array.isArray(payload.rows) ? (payload.rows as unknown[]) : null;
        if (!raw) return json({ error: "Body must include a 'rows' array" }, 400);
        if (raw.length > MAX_ROWS) {
          return json({ error: `Too many rows (max ${MAX_ROWS})` }, 400);
        }

        const { locationFromCampaign } = await import("@/lib/meta-spend.server");

        type Row = {
          date: string;
          ad_id: string | null;
          ad_name: string;
          adset_name: string | null;
          campaign_name: string | null;
          location: string | null;
          spend_aud: number;
          impressions: number;
          clicks: number;
          source: string;
        };

        const rows: Row[] = [];
        for (const item of raw) {
          if (!item || typeof item !== "object") continue;
          const r = item as Record<string, unknown>;
          const date = asString(r.date, 10);
          if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const campaign = asString(r.campaign_name ?? r.campaignName);
          const adName = asString(r.ad_name ?? r.adName) ?? campaign;
          if (!adName) continue;
          rows.push({
            date,
            ad_id: asString(r.ad_id ?? r.adId),
            ad_name: adName,
            adset_name: asString(r.adset_name ?? r.adsetName ?? r.ad_set_name),
            campaign_name: campaign,
            location: locationFromCampaign(campaign),
            spend_aud: asNumber(r.spend_aud ?? r.spend),
            impressions: Math.trunc(asNumber(r.impressions)),
            clicks: Math.trunc(asNumber(r.clicks)),
            source: "make",
          });
        }

        if (rows.length === 0) {
          return json({ received: raw.length, upserted: 0, manualCleared: 0, totalsByLocation: {} });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Clear hand-entered estimates for every date+location covered.
        const pairs = new Map<string, { date: string; location: string | null }>();
        for (const r of rows) pairs.set(`${r.date}|${r.location ?? ""}`, { date: r.date, location: r.location });
        let manualCleared = 0;
        for (const { date, location } of pairs.values()) {
          let q = supabaseAdmin
            .from("ad_spend_daily")
            .delete({ count: "exact" })
            .eq("source", "manual")
            .eq("date", date);
          q = location === null ? q.is("location", null) : q.eq("location", location);
          const { count, error } = await q;
          if (error) return json({ error: `Manual cleanup failed: ${error.message}` }, 500);
          manualCleared += count ?? 0;
        }

        // 2. Upsert on the sync's key: date + ad_id, falling back to ad_name.
        const dates = [...new Set(rows.map((r) => r.date))].sort();
        const existing = await supabaseAdmin
          .from("ad_spend_daily")
          .select("id, date, ad_id, ad_name")
          .gte("date", dates[0]!)
          .lte("date", dates[dates.length - 1]!)
          .limit(20000);
        if (existing.error) return json({ error: `Read failed: ${existing.error.message}` }, 500);

        const keyOf = (date: string, adId: string | null, adName: string) =>
          `${date}|${(adId ?? adName).trim().toLowerCase()}`;
        const byKey = new Map<string, string>();
        for (const e of existing.data ?? []) {
          byKey.set(keyOf(e.date, e.ad_id ?? null, String(e.ad_name)), e.id);
        }

        let upserted = 0;
        const toInsert: Row[] = [];
        for (const row of rows) {
          const id = byKey.get(keyOf(row.date, row.ad_id, row.ad_name));
          if (id) {
            const { error } = await supabaseAdmin.from("ad_spend_daily").update(row).eq("id", id);
            if (error) return json({ error: `Write failed: ${error.message}` }, 500);
            upserted += 1;
          } else {
            toInsert.push(row);
          }
        }
        for (let i = 0; i < toInsert.length; i += 200) {
          const chunk = toInsert.slice(i, i + 200);
          const { error } = await supabaseAdmin.from("ad_spend_daily").insert(chunk);
          if (error) return json({ error: `Write failed: ${error.message}` }, 500);
          upserted += chunk.length;
        }

        const totalsByLocation: Record<string, number> = {};
        for (const r of rows) {
          const key = r.location ?? "(unknown)";
          totalsByLocation[key] = Math.round(((totalsByLocation[key] ?? 0) + r.spend_aud) * 100) / 100;
        }

        await supabaseAdmin
          .from("ad_spend_sync_state")
          .update({
            last_synced_at: new Date().toISOString(),
            last_status: "ok",
            last_message: `make push: ${upserted} rows for ${dates[0]} → ${dates[dates.length - 1]}`,
            rows_upserted: upserted,
          })
          .eq("id", 1);

        return json({ received: raw.length, upserted, manualCleared, totalsByLocation });
      },
    },
  },
});
