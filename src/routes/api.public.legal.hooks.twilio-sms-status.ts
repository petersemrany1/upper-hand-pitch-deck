// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-sms-status.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/legal/hooks/twilio-sms-status";

export const Route = createFileRoute("/api/public/legal/hooks/twilio-sms-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { readTwilioWebhook } = await import("@/legal/lib/twilio.server");
        const { params, valid } = await readTwilioWebhook(
          request,
          `${PATH}${new URL(request.url).search}`,
        );
        if (!valid) return new Response("Invalid signature", { status: 403 });

        const sid = params["MessageSid"] ?? params["SmsSid"] ?? "";
        const status = params["MessageStatus"] ?? params["SmsStatus"] ?? "";
        if (!sid || !status) return new Response("ok");

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        const { recordAppointmentDelivery } = await import("@/legal/lib/appointment-reminders.server");
        await recordAppointmentDelivery(
          sid,
          status,
          new URL(request.url).searchParams.get("appointmentReminderId"),
          params["ErrorCode"] || null,
        );
        const firmMessageId = new URL(request.url).searchParams.get("firmMessageId");
        const { error: firmStatusError } = await (
          supabaseAdmin as import("@supabase/supabase-js").SupabaseClient
        ).rpc("update_firm_sms_status", {
          p_id: firmMessageId && /^[0-9a-f-]{36}$/i.test(firmMessageId) ? firmMessageId : null,
          p_sid: sid,
          p_status: status,
          p_error: params["ErrorCode"] || null,
        });
        if (firmStatusError) throw new Error(firmStatusError.message);
        const { error } = await supabaseAdmin
          .from("sms_messages")
          .update({ delivery_status: status })
          .eq("twilio_sid", sid);
        if (error) console.error("[sms-status] update failed", error.message);
        const { recordFirmBookingDeliveryFailure } =
          await import("@/legal/lib/firm-booking-follow-up.server");
        await recordFirmBookingDeliveryFailure(sid, status);
        return new Response("ok");
      },
    },
  },
});
