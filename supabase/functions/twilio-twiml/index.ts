import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Only fetched AFTER the user answers. If they don't answer within 20s,
// Twilio hangs up and this URL is never called — client is never dialed.

serve(async (req) => {
  const url = new URL(req.url);
  const clientPhone = url.searchParams.get("clientPhone") || "";

  if (!clientPhone) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Error: No client phone number provided.</Say>
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
  <Say voice="alice">Connecting your call now.</Say>
  <Dial record="record-from-answer-dual" recordingStatusCallback="${recordingStatusUrl}" recordingStatusCallbackMethod="POST" timeout="30" callerId="+61483938205">
    <Number>${clientPhone}</Number>
  </Dial>
  <Say voice="alice">The other party did not answer. Goodbye.</Say>
</Response>`,
    { status: 200, headers: { "Content-Type": "application/xml" } },
  );
});
