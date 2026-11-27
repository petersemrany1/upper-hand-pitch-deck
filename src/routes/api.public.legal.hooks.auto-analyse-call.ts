// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/auto-analyse-call.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function secretOk(given: string | null): boolean {
  const expected = legalEnv["INTERNAL_FUNCTION_SECRET"];
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/legal/hooks/auto-analyse-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        if (!secretOk(request.headers.get("x-internal-secret"))) {
          return new Response("Unauthorized", { status: 401 });
        }
        let payload: { callRecordId?: string; firmCallId?: string; transcript?: string } = {};
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (payload.firmCallId) {
          const { analyseFirmCall } = await import("@/legal/lib/firm-calling.server");
          try {
            await analyseFirmCall(payload.firmCallId);
            return Response.json({ ok: true });
          } catch (error) {
            console.error("[firm-call] analysis failed", error);
            return Response.json(
              { error: "Firm call notes could not be generated" },
              { status: 500 },
            );
          }
        }
        if (!payload.callRecordId) {
          return Response.json({ error: "callRecordId is required" }, { status: 400 });
        }

        const { analyseCallRecord } = await import("@/legal/lib/ai-analysis.server");
        try {
          const result = await analyseCallRecord(payload.callRecordId, payload.transcript);
          return Response.json({
            ok: true,
            structured: result.analysis.structured,
            notes: result.notes,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[auto-analyse-call] failed", message);
          const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
          await supabaseAdmin.from("error_logs").insert({
            source: "auto-analyse-call",
            message,
            detail: { callRecordId: payload.callRecordId },
          });
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
