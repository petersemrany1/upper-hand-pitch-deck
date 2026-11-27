// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/prospect-call-transcribed.ts). Re-run the port script to refresh.
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

/** Firm cold calls: transcribe the recording and email the handover if the call set a meeting. */
export const Route = createFileRoute("/api/public/legal/hooks/prospect-call-transcribed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        if (!secretOk(request.headers.get("x-internal-secret")))
          return new Response("Unauthorized", { status: 401 });
        let payload: { callRecordId?: string } = {};
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        if (!payload.callRecordId)
          return Response.json({ error: "callRecordId is required" }, { status: 400 });
        const { processProspectRecording } = await import("@/legal/lib/cold-calling/cold-calling.server");
        try {
          return Response.json({
            ok: true,
            ...(await processProspectRecording(payload.callRecordId)),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[prospect-call-transcribed] failed", message);
          const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
          await supabaseAdmin
            .from("error_logs")
            .insert({
              source: "prospect-call-transcribed",
              message,
              detail: { callRecordId: payload.callRecordId },
            });
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
