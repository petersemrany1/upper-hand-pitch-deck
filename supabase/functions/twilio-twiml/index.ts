import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Only fetched AFTER the user answers. If machine detected, Twilio will have
// already hung up before reaching this point via the IfMachine=Hangup approach.
// But as a safety net, we also check AnsweredBy here.

serve(async (req) => {
  const url = new URL(req.url);
  const clientPhone = url.searchParams.get("clientPhone") || "";

  // Check if Twilio detected a machine — GET params or POST form data
  let answeredBy = url.searchParams.get("AnsweredBy") || "";
  if (!answeredBy && req.method === "POST") {
    try {
      const formData = await req.formData();
      answeredBy = formData.get("AnsweredBy")?.toString() || "";
    } catch {}
  }

  console.log("TwiML requested. clientPhone:", clientPhone, "AnsweredBy:", answeredBy);

  // If machine/voicemail detected, hang up immediately — never dial client
  if (answeredBy && answeredBy !== "human") {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`,
      { status: 200, headers: { "Content-Type": "application/xml" } },
    );
  }

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
