// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/sync-legal-meta-spend.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
const same = (given: string, expected: string | undefined) =>
  !!expected &&
  Buffer.byteLength(given) === Buffer.byteLength(expected) &&
  timingSafeEqual(Buffer.from(given), Buffer.from(expected));
export const Route = createFileRoute("/api/public/hooks/sync-legal-meta-spend")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const token = request.headers.get("x-internal-secret") ?? "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        if (!same(token, legalEnv["INTERNAL_FUNCTION_SECRET"])) {
          const { data, error } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", "cron_token")
            .maybeSingle();
          const expected = (data?.value as { token?: string } | null)?.token;
          if (error || !same(token, expected)) return new Response("Unauthorized", { status: 401 });
        }
        const parsed = z
          .object({ since: z.string().optional(), until: z.string().optional() })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        try {
          const { syncMetaSpend } = await import("@/legal/lib/meta-spend.server");
          return Response.json(await syncMetaSpend(parsed.data.since, parsed.data.until));
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Meta sync failed" },
            { status: 502 },
          );
        }
      },
    },
  },
});
