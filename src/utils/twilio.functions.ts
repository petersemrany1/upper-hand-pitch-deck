import { createServerFn } from "@tanstack/react-start";

export const sendPaymentLinkSMS = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string; firstName: string; stripeLink: string }) => data)
  .handler(async ({ data }) => {
    const accountSid = "AC4e4b3797155ad508c8dffa4b13a1fd6e";
    const authToken = "376714289a02806ab80049a4afde9b04";
    const from = "+61483938205";

    let formattedPhone = data.to.replace(/[\s\-()]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+61' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+61' + formattedPhone;
    }

    const message = `Hi ${data.firstName}, here's your secure payment link to get started with Upper Hand: ${data.stripeLink}. Any questions? Just reply to this message.`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
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
      return { success: false, error: result.message || "Failed to send SMS" };
    }

    return { success: true, sid: result.sid };
  });
