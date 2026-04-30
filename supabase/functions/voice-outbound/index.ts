import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";

// TwiML returned to Twilio when the browser SDK initiates an outbound call.
// Twilio POSTs here (per the TwiML App's Voice Request URL). We read the
// dialled number from the SDK params and bridge to PSTN with the verified
// callerId. The call is recorded and statusCallback updates call_records.

const TWILIO_CALLER_ID = "+61468031075";

// Mirror of src/utils/phone.ts — keep in sync. Returns E.164 (+61...)
// when valid, otherwise null so we can refuse to dial bad numbers.
function formatAUPhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (hasPlus && digits.startsWith("61")) {
    const rest = digits.slice(2);
    if (rest.length < 8 || rest.length > 12) return null;
    return "+" + digits;
  }
  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return null;
    return "+" + digits;
  }
  if (digits.startsWith("61") && digits.length >= 10) return "+" + digits;
  if (digits.startsWith("1300") || digits.startsWith("1800")) {
    if (digits.length !== 10) return null;
    return "+61" + digits;
  }
  if (digits.startsWith("13") && digits.length === 6) return "+61" + digits;
  if (digits.startsWith("0")) {
    if (digits.length !== 10) return null;
    if (!"234578".includes(digits[1])) return null;
    return "+61" + digits.slice(1);
  }
  if (digits.length === 9 && "234578".includes(digits[0])) return "+61" + digits;
  return null;
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
  let leadId = url.searchParams.get("leadId") || "";

  if (req.method === "POST") {
    try {
      const form = await req.formData();

      // Reject unsigned requests so attackers can't probe TwiML generation
      // or trigger arbitrary outbound dials.
      if (!(await validateTwilioSignature(req, form))) {
        return new Response("Forbidden", { status: 403 });
      }

      phone = phone || (form.get("phone")?.toString() ?? "") || (form.get("To")?.toString() ?? "");
      callSid = callSid || (form.get("CallSid")?.toString() ?? "");
      clinicId = clinicId || (form.get("clinicId")?.toString() ?? "");
      leadId = leadId || (form.get("leadId")?.toString() ?? "");
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

  const formatted = formatAUPhone(phone);
  if (!formatted) {
    console.log("voice-outbound: rejected unformattable number", phone);
    const errXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">The destination number could not be formatted.</Say>
  <Hangup/>
</Response>`;
    return new Response(errXml, { status: 200, headers: { "Content-Type": "text/xml" } });
  }
  const dialTo = escapeXml(formatted);

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
          lead_id: leadId || null,
          phone: dialTo,
        },
        { onConflict: "twilio_call_sid" },
      );
      if (upErr) console.error("voice-outbound: upsert error", upErr);
    } catch (err) {
      console.error("voice-outbound: failed to upsert call_records", err);
    }
  }

  const childStatusCallbackUrl = escapeXml(
    callSid ? `${statusCallbackUrl}?parentCallSid=${encodeURIComponent(callSid)}` : statusCallbackUrl,
  );

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${TWILIO_CALLER_ID}" record="record-from-answer" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackMethod="POST" trim="do-not-trim" timeout="30">
    <Number statusCallback="${childStatusCallbackUrl}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${dialTo}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
});
