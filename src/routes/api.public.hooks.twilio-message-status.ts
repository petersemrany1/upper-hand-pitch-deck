import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyTwilioSignature } from "@/lib/twilio-status-signature.server";
import { recordRefundSmsStatus } from "@/utils/refund-notifications.server";

export const Route = createFileRoute("/api/public/hooks/twilio-message-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
          console.error("twilio-message-status: TWILIO_AUTH_TOKEN missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);
        if (!verifyTwilioSignature(request, params, authToken)) {
          console.warn("twilio-message-status: invalid signature", {
            receivedSig: request.headers.get("x-twilio-signature"),
            messageSid: params.get("MessageSid"),
            status: params.get("MessageStatus"),
          });
          return new Response("Forbidden", { status: 403 });
        }

        const messageSid = params.get("MessageSid") || params.get("SmsSid") || "";
        const status = params.get("MessageStatus") || params.get("SmsStatus") || "";
        const errorCode = params.get("ErrorCode") || null;
        const errorMessage = params.get("ErrorMessage") || null;

        if (!messageSid || !status) {
          return new Response("OK", { status: 200 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          console.error("twilio-message-status: backend env missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const finalStatus = errorCode ? `${status} (${errorCode}${errorMessage ? `: ${errorMessage}` : ""})` : status;
        const refundNotificationId = new URL(request.url).searchParams.get("refund_notification_id");
        if (refundNotificationId && /^[0-9a-f-]{36}$/i.test(refundNotificationId)) {
          try { await recordRefundSmsStatus(supabase, refundNotificationId, messageSid, status, errorCode ? finalStatus : errorMessage); }
          catch (error) {
            console.error("twilio-message-status: refund status update failed", error);
            return new Response("DB update failed", { status: 500 });
          }
          return new Response("OK", { status: 200 });
        }
        const deliveryId = new URL(request.url).searchParams.get("reminder_delivery");
        if (deliveryId && /^[0-9a-f-]{36}$/i.test(deliveryId) && ["delivered", "undelivered", "failed"].includes(status)) {
          const { error: deliveryError } = await supabase.rpc("record_confirmation_delivery_callback", {
            p_delivery: deliveryId, p_sid: messageSid, p_status: status === "delivered" ? "delivered" : "undelivered",
            p_error: status === "delivered" ? null : finalStatus,
          });
          if (deliveryError) return new Response("Reminder status update failed", { status: 500 });
        }
        const { error } = await supabase
          .from("sms_messages")
          .update({ status: finalStatus })
          .eq("twilio_message_sid", messageSid);

        if (error) {
          console.error("twilio-message-status: update failed", { messageSid, status, error });
          return new Response("DB update failed", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
