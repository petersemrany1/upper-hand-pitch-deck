import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Twilio fetches this URL when Peter answers. Returns TwiML that bridges him to the clinic.
// The clinic number is passed as ?clinic=+61... when initiate-call creates the call.

const TWILIO_CALLER_ID = "+61468031075";

serve(async (req) => {
  const url = new URL(req.url);
  const clinic = url.searchParams.get("clinic") || "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const recordingStatusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  if (!clinic) {
    const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">No destination number was provided.</Say>
  <Hangup/>
</Response>`;
    return new Response(errXml, { status: 200, headers: { "Content-Type": "text/xml" } });
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call now.</Say>
  <Dial callerId="${TWILIO_CALLER_ID}" record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="30" answerOnBridge="true">
    <Number>${clinic}</Number>
  </Dial>
</Response>`;

  console.log("call-twiml: returning bridge TwiML", { clinic });

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
});
