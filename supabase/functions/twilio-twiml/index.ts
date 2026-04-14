import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Twilio sends both GET and POST to TwiML URLs
  const url = new URL(req.url);
  const clientPhone = url.searchParams.get("clientPhone") || "";

  if (!clientPhone) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Error: No client phone number provided.</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const statusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${statusUrl}" recordingStatusCallbackMethod="POST">
    <Number>${clientPhone}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
});
