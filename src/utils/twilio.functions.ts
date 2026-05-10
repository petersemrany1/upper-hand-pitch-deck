import { createServerFn } from "@tanstack/react-start";
import { logError } from "./error-logger.functions";
import { getNextNumber } from "./phone-pool.functions";

// Sends the Stripe payment-link SMS via Twilio. Credentials come from server
// env vars only — never hard-coded.

export const sendPaymentLinkSMS = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; firstName: string; stripeLink: string }) => data)
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const { number: from } = await getNextNumber();

    if (!accountSid || !authToken) {
      const msg = "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured";
      await logError("sendPaymentLinkSMS", msg, {
        phone: data.to,
        firstName: data.firstName,
        stepsToReproduce: "Server env vars missing for Twilio SMS",
      });
      return { success: false as const, error: msg };
    }

    let formattedPhone = data.to.replace(/[\s\-()]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+61" + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+61" + formattedPhone;
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

    return { success: true as const, sid: result.sid };
  });
