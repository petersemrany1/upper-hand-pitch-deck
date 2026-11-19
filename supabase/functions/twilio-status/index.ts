import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";
import { repIdFromIdentity } from "../_shared/voice-policy.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  try {
    const form = await req.formData();
    if (!(await validateTwilioSignature(req, form))) return new Response("Forbidden", { status: 403 });
    const get = (key: string) => form.get(key)?.toString() || "";
    const parent = new URL(req.url).searchParams.get("parentCallSid") || "";
    const sid = parent || get("CallSid");
    if (!/^CA[a-f0-9]{32}$/i.test(sid)) return new Response("Bad Request", { status: 400 });
    const integer = (value: string) => /^\d+$/.test(value) ? Number(value) : null;
    const recordingUrl = get("RecordingUrl");
    const base = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(base,key);
    const { data, error } = await sb.rpc("apply_voice_status", {
      p_sid: sid, p_child_sid: parent ? get("CallSid") : null,
      p_status: get("CallStatus"), p_sequence: integer(get("SequenceNumber")),
      p_duration: integer(get("CallDuration") || get("Duration")),
      p_error: get("ErrorCode"), p_sip: get("SipResponseCode"),
      p_recording_sid: get("RecordingSid"), p_recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
      p_answered_rep: repIdFromIdentity(get("To")),
    }).abortSignal(AbortSignal.timeout(6500));
    if (error) {
      console.error("twilio-status: persistence failed",error.code);
      return new Response("Persistence unavailable",{status:503});
    }
    if (data?.analyse && (data.lead_id || data.clinic_id)) {
      EdgeRuntime.waitUntil(fetch(`${base}/functions/v1/auto-analyse-call`, {
        method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},
        body:JSON.stringify({callRecordId:data.id}),signal:AbortSignal.timeout(10000),
      }).then(response => { if (!response.ok) console.error("auto-analyse-call dispatch failed",response.status); })
        .catch(() => console.error("auto-analyse-call dispatch unavailable")));
    }
    return new Response("OK");
  } catch {
    console.error("twilio-status: callback processing failed");
    return new Response("Callback processing unavailable",{status:503});
  }
});
