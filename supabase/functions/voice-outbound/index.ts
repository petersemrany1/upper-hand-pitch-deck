import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// TwiML returned to Twilio when the browser SDK initiates an outbound call.
// Twilio POSTs here (per the TwiML App's Voice Request URL). We read the
// dialled number from the SDK params and bridge to PSTN with the verified
// callerId. The call is recorded and statusCallback updates call_records.

const TWILIO_CALLER_ID = "+61468031075";

function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]!));
}

serve(async (req) => {
  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-status`;

  // Twilio will POST application/x-www-form-urlencoded. SDK custom params
  // (anything passed to device.connect({ params })) come through as POST body
  // fields. We also accept query params for manual testing.
  let phone = url.searchParams.get("phone") || url.searchParams.get("To") || "";
  let callSid = url.searchParams.get("CallSid") || "";
  let clinicId = url.searchParams.get("clinicId") || "";

  if (req.method === "POST") {
    try {
      const form = await req.formData();
      phone = phone || (form.get("phone")?.toString() ?? "") || (form.get("To")?.toString() ?? "");
      callSid = callSid || (form.get("CallSid")?.toString() ?? "");
      clinicId = clinicId || (form.get("clinicId")?.toString() ?? "");
    } catch {
      // ignore — fall through to validation
    }
  }

  console.log("voice-outbound: incoming", { phone, callSid, clinicId, method: req.method });

  if (!phone) {
    const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">No destination number was provided.</Say>
  <Hangup/>
</Response>`;
    return new Response(errXml, { status: 200, headers: { "Content-Type": "text/xml" } });
  }

  const dialTo = escapeXml(formatAUPhone(phone));

  // Server-side safety net: ensure a call_records row exists tagged with
  // clinic_id. The browser also inserts this row, but if that races or
  // fails we still want the row to exist by the time twilio-status fires.
  if (callSid && supabaseUrl && serviceKey) {
    try {
      const sb = createClient(supabaseUrl, serviceKey);
      const { error: upErr } = await sb.from("call_records").upsert(
        {
          twilio_call_sid: callSid,
          status: "initiated",
          clinic_id: clinicId || null,
          phone: dialTo,
        },
        { onConflict: "twilio_call_sid" },
      );
      if (upErr) console.error("voice-outbound: upsert error", upErr);
    } catch (err) {
      console.error("voice-outbound: failed to upsert call_records", err);
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${TWILIO_CALLER_ID}" record="record-from-answer-dual" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackMethod="POST" answerOnBridge="true" timeout="30">
    <Number>${dialTo}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
});
