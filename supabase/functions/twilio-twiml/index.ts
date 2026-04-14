import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This function is fetched by Twilio ONLY AFTER the user answers their phone.
// It returns TwiML that:
// 1. Says "Connecting your call now"
// 2. Then dials the client number (sequential — client is NOT called until this point)
// 3. Records the conversation from the moment the client answers

serve(async (req) => {
  const url = new URL(req.url);
  const clientPhone = url.searchParams.get("clientPhone") || "";

  console.log("TwiML requested for client:", clientPhone);

  if (!clientPhone) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Error: No client phone number provided.</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const recordingStatusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  // Sequential TwiML:
  // <Say> plays first (user hears this after answering)
  // <Dial> then calls the client — this is the ONLY point the client's phone rings
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting your call now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="30" callerId="+61483938205">
    <Number>${clientPhone}</Number>
  </Dial>
  <Say voice="alice">The other party did not answer. Goodbye.</Say>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
});
