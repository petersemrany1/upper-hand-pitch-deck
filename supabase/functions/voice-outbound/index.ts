import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";
import { blockedMessage, outboundTwiml, repIdFromIdentity, spokenResponse } from "../_shared/voice-policy.ts";

// The reservation is one bounded, atomic database operation. No stale cache or
// retired fallback: unavailable policy checks must never silently place a call.
serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const xml = (body: string) => new Response(body, { headers: { "Content-Type": "text/xml" } });
  try {
    const form = await req.formData();
    if (!(await validateTwilioSignature(req, form))) return new Response("Forbidden", { status: 403 });
    const get = (key: string) => form.get(key)?.toString() || "";
    const repId = repIdFromIdentity(get("From")); // Identity comes from the signed Voice grant, not SDK custom repId.
    const callSid = get("CallSid");
    const phone = get("phone") || get("To");
    if (!repId || !/^CA[a-f0-9]{32}$/i.test(callSid)) return xml(spokenResponse(blockedMessage("unknown_rep")));
    const uuid = (value: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value : null;
    const base = Deno.env.get("SUPABASE_URL")!;
    const sb = createClient(base, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.rpc("claim_outbound_call", {
      p_call_sid: callSid, p_phone: phone, p_rep_id: repId,
      p_lead_id: uuid(get("leadId")), p_clinic_id: uuid(get("clinicId")),
    }).abortSignal(AbortSignal.timeout(4500));
    if (error || !data?.allowed || !data?.caller_id) {
      if (error) console.error("voice-outbound: reservation unavailable", error.code);
      return xml(spokenResponse(blockedMessage(data?.reason || "unavailable")));
    }
    return xml(outboundTwiml(`+${data.phone}`, data.caller_id, `${base}/functions/v1/twilio-status`, callSid));
  } catch (error) {
    console.error("voice-outbound: unavailable", error instanceof Error ? error.name : "error");
    return xml(spokenResponse(blockedMessage("unavailable")));
  }
});
