import { createServerFn } from "@tanstack/react-start";

const TWILIO_ACCOUNT_SID = "AC4e4b3797155ad508c8dffa4b13a1fd6e";
const TWILIO_AUTH_TOKEN = "376714289a02806ab80049a4afde9b04";
const TWILIO_FROM = "+61468031075";

export const initiateCall = createServerFn({ method: "POST" })
  .inputValidator((data: { clientPhone: string; userPhone: string; callbackUrl: string }) => data)
  .handler(async ({ data }) => {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const twimlUrl = `${data.callbackUrl}/api/twiml?clientPhone=${encodeURIComponent(data.clientPhone)}`;
    const statusCallback = `${data.callbackUrl}/api/twilio-status`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: data.userPhone,
        From: TWILIO_FROM,
        Url: twimlUrl,
        Record: "true",
        RecordingStatusCallback: statusCallback,
        RecordingStatusCallbackMethod: "POST",
        StatusCallback: statusCallback,
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: "completed",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio call error:", JSON.stringify(result));
      return { success: false, error: result.message || "Failed to initiate call" };
    }

    return { success: true, callSid: result.sid };
  });

export const fetchCallRecordings = createServerFn({ method: "POST" })
  .inputValidator((data: { callSid: string }) => data)
  .handler(async ({ data }) => {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${data.callSid}/Recordings.json`;

    const response = await fetch(url, {
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, recordings: [] };
    }

    const recordings = (result.recordings || []).map((rec: Record<string, string>) => ({
      sid: rec.sid,
      duration: parseInt(rec.duration || "0"),
      url: `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${rec.sid}.mp3`,
    }));

    return { success: true, recordings };
  });
