import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";

// TwiML returned to Twilio when the browser SDK initiates an outbound call.
// Twilio POSTs here (per the TwiML App's Voice Request URL). We read the
// dialled number from the SDK params and bridge to PSTN with the verified
// callerId. The call is recorded and statusCallback updates call_records.

const FALLBACK_CALLER_ID = "+61483938205";

// Pick least-recently-used ACTIVE number from the pool so outbound calls
// always present a verified, currently-owned AU number. The previously
// hard-coded number was retired, which made Twilio substitute an arbitrary
// fallback (recipients sometimes saw it as a foreign/Japanese number).
async function pickCallerId(sb: ReturnType<typeof createClient>): Promise<string> {
  try {
    const { data } = await sb
      .from("phone_numbers")
      .select("id, number, call_count")
      .eq("status", "active")
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();
    if (data?.number) {
      await sb.from("phone_numbers")
        .update({ last_used_at: new Date().toISOString(), call_count: (data.call_count ?? 0) + 1 })
        .eq("id", data.id);
      return data.number as string;
    }
  } catch (e) {
    console.error("voice-outbound: pickCallerId failed", e);
  }
  return FALLBACK_CALLER_ID;
}

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

  // Twilio always POSTs to voice webhooks. Reject anything else so an
  // unauthenticated GET can't bypass signature validation and inject
  // arbitrary call_records rows via query params.
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let phone = "";
  let callSid = "";
  let clinicId = "";
  let leadId = "";
  let repId = "";

  try {
    const form = await req.formData();

    // Reject unsigned requests so attackers can't probe TwiML generation
    // or trigger arbitrary outbound dials.
    if (!(await validateTwilioSignature(req, form))) {
      return new Response("Forbidden", { status: 403 });
    }

    phone = (form.get("phone")?.toString() ?? "") || (form.get("To")?.toString() ?? "") || url.searchParams.get("phone") || url.searchParams.get("To") || "";
    callSid = (form.get("CallSid")?.toString() ?? "") || url.searchParams.get("CallSid") || "";
    clinicId = (form.get("clinicId")?.toString() ?? "") || url.searchParams.get("clinicId") || "";
    leadId = (form.get("leadId")?.toString() ?? "") || url.searchParams.get("leadId") || "";
    repId = (form.get("repId")?.toString() ?? "") || url.searchParams.get("repId") || "";

    if (!repId) {
      const from = form.get("From")?.toString() ?? "";
      const m = from.match(/^client:rep_([a-f0-9]{32})$/i);
      if (m) {
        const hex = m[1];
        repId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
      }
    }
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  console.log("voice-outbound: incoming", { phone, callSid, clinicId, leadId, repId, method: req.method });

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

  const childStatusCallbackUrl = escapeXml(
    callSid ? `${statusCallbackUrl}?parentCallSid=${encodeURIComponent(callSid)}` : statusCallbackUrl,
  );

  // Pick the caller-ID BEFORE upserting call_records, so we can write the
  // actual dialled from_number and get accurate per-number analytics.
  const sbForCaller = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null;
  const callerId = sbForCaller ? await pickCallerId(sbForCaller) : FALLBACK_CALLER_ID;

  // Server-side safety net: ensure a call_records row exists tagged with
  // clinic_id, lead_id, rep_id, and the REAL from_number (overwrites any
  // stale from_number the browser may have optimistically inserted).
  if (callSid && supabaseUrl && serviceKey) {
    try {
      const sb = sbForCaller ?? createClient(supabaseUrl, serviceKey);
      const { error: upErr } = await sb.from("call_records").upsert(
        {
          twilio_call_sid: callSid,
          status: "initiated",
          clinic_id: clinicId || null,
          lead_id: leadId || null,
          rep_id: repId || null,
          phone: dialTo,
          from_number: callerId,
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
  <Dial answerOnBridge="true" callerId="${escapeXml(callerId)}" record="record-from-answer" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackMethod="POST" trim="trim-silence" timeout="30">
    <Number statusCallback="${childStatusCallbackUrl}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${dialTo}</Number>
  </Dial>
</Response>`;

  return new Response(twiml, { status: 200, headers: { "Content-Type": "text/xml" } });
});
