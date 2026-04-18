import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Called by Twilio when the browser-based Voice SDK client connects.
// The browser passes "To" as a custom param via Device.connect({ params: { To } }).
// We dial that number and record the call. CallerID must be a verified Twilio
// number on the account.

const TWILIO_CALLER_ID = "+61468031075";

function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

async function logCall(params: {
  rawTo: string;
  formattedTo: string;
  callSid: string | null;
  twiml: string;
  error?: string;
}) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return;

    const supabase = createClient(supabaseUrl, serviceKey);
    await supabase.from("call_records").insert({
      twilio_call_sid: params.callSid,
      status: params.error ? "twiml-error" : "twiml-issued",
      call_analysis: {
        rawTo: params.rawTo,
        formattedTo: params.formattedTo,
        callerId: TWILIO_CALLER_ID,
        twimlReturned: params.twiml,
        error: params.error ?? null,
      },
    });
  } catch (err) {
    console.error("twilio-twiml: failed to log call", err);
  }
}

serve(async (req) => {
  console.log(`twilio-twiml: ${req.method} ${req.url}`);

  let rawTo = "";
  let callSid: string | null = null;
  const url = new URL(req.url);

  rawTo = url.searchParams.get("To") || url.searchParams.get("clientPhone") || "";
  callSid = url.searchParams.get("CallSid");

  if (req.method === "POST") {
    try {
      const formData = await req.formData();
      rawTo = formData.get("To")?.toString() || formData.get("clientPhone")?.toString() || rawTo;
      callSid = formData.get("CallSid")?.toString() || callSid;
      console.log("twilio-twiml: form params", {
        To: rawTo,
        CallSid: callSid,
        From: formData.get("From")?.toString(),
        AccountSid: formData.get("AccountSid")?.toString(),
        ApplicationSid: formData.get("ApplicationSid")?.toString(),
      });
    } catch (err) {
      console.error("twilio-twiml: failed to parse form data", err);
    }
  }

  if (!rawTo) {
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Error: No destination number provided.</Say>
  <Hangup/>
</Response>`;
    await logCall({ rawTo: "", formattedTo: "", callSid, twiml: errorTwiml, error: "no-destination" });
    return new Response(errorTwiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const formattedTo = formatAUPhone(rawTo);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const recordingStatusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${TWILIO_CALLER_ID}" record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="30" answerOnBridge="true">
    <Number>${formattedTo}</Number>
  </Dial>
</Response>`;

  console.log("twilio-twiml: returning TwiML", { rawTo, formattedTo, callSid, callerId: TWILIO_CALLER_ID });
  await logCall({ rawTo, formattedTo, callSid, twiml });

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
});
