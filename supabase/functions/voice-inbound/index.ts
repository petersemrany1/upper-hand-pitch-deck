import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";
import { inboundTwiml, voicemailTwiml } from "../_shared/voice-policy.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  let form: FormData;
  try { form = await req.formData(); } catch { return new Response("Bad Request", { status: 400 }); }
  if (!(await validateTwilioSignature(req, form))) return new Response("Forbidden", { status: 403 });
  const get = (key: string) => form.get(key)?.toString() || "";
  const base = Deno.env.get("SUPABASE_URL")!;
  const callback = `${base}/functions/v1/twilio-status`;
  const action = `${base}/functions/v1/voice-inbound`;
  const xml = (body: string) => new Response(body, { headers: { "Content-Type": "text/xml" } });
  if (new URL(req.url).searchParams.get("voicemail") === "done") {
    return xml('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
  const dialStatus = get("DialCallStatus");
  if (dialStatus) {
    return xml(dialStatus === "completed" ? '<?xml version="1.0" encoding="UTF-8"?><Response/>' : voicemailTwiml(callback, action));
  }
  try {
    const sb = createClient(base, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.rpc("resolve_inbound_voice", {
      p_phone: get("From"), p_call_sid: get("CallSid"), p_to: get("To"),
    }).abortSignal(AbortSignal.timeout(4500));
    if (error) throw error;
    return xml(inboundTwiml(data?.rep_ids || [],callback,action,get("CallSid")));
  } catch {
    console.error("voice-inbound: routing lookup unavailable; using branded voicemail");
    return xml(voicemailTwiml(callback, action));
  }
});
