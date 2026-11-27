// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-sms-inbound.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/legal/hooks/twilio-sms-inbound";

export const Route = createFileRoute("/api/public/legal/hooks/twilio-sms-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { readTwilioWebhook, twimlResponse, findLeadByPhone, ensureThread } =
          await import("@/legal/lib/twilio.server");
        const { params, valid } = await readTwilioWebhook(request, PATH);
        if (!valid) return new Response("Invalid signature", { status: 403 });

        const from = params["From"] ?? "";
        const body = params["Body"] ?? "";
        const sid = params["MessageSid"] ?? params["SmsMessageSid"] ?? "";
        if (!from) return twimlResponse("<Response/>");

        const lead = await findLeadByPhone(from);
        const threadId = await ensureThread(lead?.id ?? null, from);

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("sms_messages").insert({
          thread_id: threadId,
          lead_id: lead?.id ?? null,
          direction: "inbound",
          body,
          twilio_sid: sid || null,
          delivery_status: "received",
          phone: from,
        });
        if (error) {
          console.error("[sms-inbound] insert failed", error.message);
          return new Response("Could not store message", { status: 500 });
        }

        const { recordAppointmentReply } = await import("@/legal/lib/appointment-reminders.server");
        await recordAppointmentReply({
          sid,
          from,
          to: params["To"] ?? "",
          body,
          optOut: params["OptOutType"] ?? "",
        });

        // A law firm texting a cold-call number back: top of its setter's queue, text on the firm card.
        try {
          const { recordProspectCallback } = await import("@/legal/lib/cold-calling/cold-calling.server");
          await recordProspectCallback({ from, to: params["To"] ?? "", kind: "sms", body });
        } catch (err) {
          console.error("[sms-inbound] firm callback check failed", err);
        }

        return twimlResponse("<Response/>");
      },
    },
  },
});
