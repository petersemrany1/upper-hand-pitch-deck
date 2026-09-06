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
// The sync itself lives in src/lib/meta-spend.server.ts so the Numbers page
// can run a backfill from the UI with the same code.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        const { syncMetaSpend, MetaSyncError } = await import("@/lib/meta-spend.server");
        try {
          const result = await syncMetaSpend({
            since: typeof body.since === "string" ? body.since : undefined,
            until: typeof body.until === "string" ? body.until : undefined,
          });
          return json({ success: true, ...result });
        } catch (e) {
          const status = e instanceof MetaSyncError ? e.status : 500;
          return json({ error: (e as Error).message }, status);
        }
      },
    },
  },
});
