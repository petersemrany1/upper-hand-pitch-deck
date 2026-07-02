import { authedServerFn } from "@/lib/authed-fn";
import { pickNextPoolNumber, sendTwilioSms } from "@/services/twilio.server";

// Sends the Stripe payment-link SMS via Twilio. Credentials come from server
// env vars only — never hard-coded.

export const sendPaymentLinkSMS = authedServerFn({ method: "POST" })
  .inputValidator((data: { to: string; firstName: string; stripeLink: string }) => data)
  .handler(async ({ data }) => {
    const { number: from } = await pickNextPoolNumber();
    const message = `Hi ${data.firstName}, here's your secure payment link to get started with Bold: ${data.stripeLink}. Any questions? Just reply to this message.`;

    const result = await sendTwilioSms({
      to: data.to,
      from,
      body: message,
      logSource: "sendPaymentLinkSMS",
    });
    if (!result.success) return result;
    return { success: true as const, sid: result.sid };
  });
