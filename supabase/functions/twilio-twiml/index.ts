import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Called by Twilio when the browser-based Voice SDK client connects.
// The browser passes "To" as a custom param via Device.connect({ params: { To } }).
// We dial that number and record the call. CallerID must be a Twilio number on the account.

const TWILIO_CALLER_ID = "+61483938205";

serve(async (req) => {
  // Twilio posts form-encoded data; also support GET for legacy/testing
  let to = "";
  const url = new URL(req.url);
  to = url.searchParams.get("To") || url.searchParams.get("clientPhone") || "";

  if (!to && req.method === "POST") {
    try {
      const formData = await req.formData();
      to = formData.get("To")?.toString() || formData.get("clientPhone")?.toString() || "";
    } catch {}
  }

  console.log("TwiML requested. To:", to);

  if (!to) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Error: No destination number provided.</Say>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "application/xml" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const recordingStatusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="30" callerId="${TWILIO_CALLER_ID}" answerOnBridge="true">
    <Number>${to}</Number>
  </Dial>
</Response>`,
    { status: 200, headers: { "Content-Type": "application/xml" } },
  );
});
