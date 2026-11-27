import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeSmsPhone, INVALID_SMS_PHONE } from "./sms-phone";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { logError } from "./error-logger.functions";
import { getUserSmsSender, ensureSmsConversation } from "./sms-sender.server";

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient(url, key);
}

async function persistOutboundSms(params: {
  to: string;
  userId: string;
  from: string;
  body: string;
  sid?: string;
  status?: string;
}) {
  try {
    const sb = getAdminClient();
    const threadId = await ensureSmsConversation(params.to, params.from);
    await sb.from("sms_messages").insert({
      sender_user_id: params.userId,
      thread_id: threadId,
      direction: "outbound",
      body: params.body,
      media_urls: [],
      twilio_message_sid: params.sid ?? null,
      status: params.status ?? "queued",
      from_number: params.from,
      to_number: params.to,
    });
  } catch (err) {
    await logError("persistOutboundSms", err instanceof Error ? err.message : "persist failed", { to: params.to });
  }
}

// Sends the Stripe payment-link SMS via Twilio. Credentials come from server
// env vars only — never hard-coded.

export const sendPaymentLinkSMS = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { to: string; firstName: string; stripeLink: string }) => data)
  .handler(async ({ data, context }) => {
    const formattedPhone = normalizeSmsPhone(data.to);
    if (!formattedPhone) return { success: false as const, error: INVALID_SMS_PHONE };

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = await getUserSmsSender(context.supabase);

    if (!accountSid || !authToken) {
      const msg = "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured";
      await logError("sendPaymentLinkSMS", msg, {
        phone: data.to,
        firstName: data.firstName,
        stepsToReproduce: "Server env vars missing for Twilio SMS",
      });
      return { success: false as const, error: msg };
    }

    const message = `Hi ${data.firstName}, here's your secure payment link to get started with Bold: ${data.stripeLink}. Any questions? Just reply to this message.`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: from,
        Body: message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", JSON.stringify(result));
      await logError("sendPaymentLinkSMS", result.message || "Twilio SMS failed", {
        phone: data.to,
        formattedPhone,
        firstName: data.firstName,
        rawResponse: result,
        stepsToReproduce: `Sending payment link SMS to ${data.to} for ${data.firstName}`,
      });
      return { success: false as const, error: result.message || "Failed to send SMS" };
    }
    await persistOutboundSms({ userId: context.userId,
      to: formattedPhone,
      from,
      body: message,
      sid: result.sid,
      status: result.status,
    });

    return { success: true as const, sid: result.sid };
  });
