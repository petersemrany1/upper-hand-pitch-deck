// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-status.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/legal/hooks/twilio-status";

export const Route = createFileRoute("/api/public/legal/hooks/twilio-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { readTwilioWebhook } = await import("@/legal/lib/twilio.server");
        const { params, valid } = await readTwilioWebhook(request, PATH);
        if (!valid) return new Response("Invalid signature", { status: 403 });

        const sid = params["CallSid"] ?? params["ParentCallSid"] ?? "";
        const status = params["CallStatus"] ?? null;
        const duration = params["CallDuration"] ? Number(params["CallDuration"]) : null;
        if (!sid) return new Response("ok");

        const { applyFirmCallStatus } = await import("@/legal/lib/firm-calling.server");
        await applyFirmCallStatus(params);

        // Firm Cold Calling attempts track their own telephony status (idempotent).
        try {
          const { applyProspectTelephonyStatus } =
            await import("@/legal/lib/cold-calling/cold-calling.server");
          await applyProspectTelephonyStatus(params);
        } catch (error) {
          console.error("[twilio-status] prospect status failed", error);
        }

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        const patch: Record<string, unknown> = {};
        if (status) patch["call_status"] = status;
        if (duration !== null && Number.isFinite(duration)) patch["duration_seconds"] = duration;
        if (Object.keys(patch).length) {
          const { error } = await supabaseAdmin
            .from("call_records")
            .update(patch as never)
            .or(`twilio_call_sid.eq.${sid},twilio_call_sid.eq.${params["ParentCallSid"] ?? sid}`);
          if (error) console.error("[twilio-status] update failed", error.message);
        }
        return new Response("ok");
      },
    },
  },
});
