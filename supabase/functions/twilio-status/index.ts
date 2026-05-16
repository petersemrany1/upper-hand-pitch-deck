import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";

serve(async (req) => {
  try {
    const requestUrl = new URL(req.url);
    const formData = await req.formData();

    // Reject unsigned requests. Without this an attacker could POST a fake
    // RecordingUrl and we'd hand it to the AI analysis pipeline.
    if (!(await validateTwilioSignature(req, formData))) {
      return new Response("Forbidden", { status: 403 });
    }

    const callSid = formData.get("CallSid")?.toString() || "";
    const parentCallSid = requestUrl.searchParams.get("parentCallSid") || "";
    const recordSid = parentCallSid || callSid;
    const callStatus = formData.get("CallStatus")?.toString() || "";
    const callDuration =
      formData.get("CallDuration")?.toString() ||
      formData.get("Duration")?.toString() ||
      "0";
    const recordingSid = formData.get("RecordingSid")?.toString() || "";
    const recordingUrl = formData.get("RecordingUrl")?.toString() || "";

    console.log("Twilio status callback:", {
      callSid,
      parentCallSid,
      callStatus,
      recordingSid,
      recordingUrl,
      callDuration,
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!recordSid) {
      console.warn("twilio-status: no CallSid in payload, ignoring");
      return new Response("OK", { status: 200 });
    }

    const duration = parseInt(callDuration);
    const hasRecording = Boolean(recordingSid && recordingUrl);
    const mp3Url = hasRecording ? `${recordingUrl}.mp3` : null;

    // Build the patch. Always include status when we have one; only set
    // duration when > 0 (Twilio sometimes sends 0 on intermediate events).
    const patch: Record<string, unknown> = {};
    if (hasRecording) {
      patch.recording_sid = recordingSid;
      patch.recording_url = mp3Url;
      patch.status = "completed";
      patch.analysis_stage = "transcribing";
    } else if (callStatus) {
      patch.status = callStatus;
    }
    if (duration > 0) {
      // Belt-and-braces: write BOTH columns. A DB trigger also mirrors them,
      // but writing both here means dashboards see the value even if the
      // trigger is ever dropped or fails.
      patch.duration = duration;
      patch.duration_seconds = duration;
    } else if (callStatus === "completed") {
      // Log when Twilio reports a completed call with no duration — signal
      // that the webhook payload is broken so we can investigate.
      console.warn("twilio-status: completed call with zero/missing CallDuration", {
        callSid: recordSid,
        callStatus,
        rawCallDuration: callDuration,
      });
    }

    // Upsert by twilio_call_sid so we always end up with exactly one row,
    // even if the browser-side insert was lost or raced.
    const { data: upserted, error: upErr } = await supabase
      .from("call_records")
      .upsert(
        { twilio_call_sid: recordSid, ...patch },
        { onConflict: "twilio_call_sid" },
      )
      .select("id, clinic_id, lead_id")
      .maybeSingle();

    if (upErr) {
      console.error("twilio-status: upsert error", upErr);
    }

    // Fire-and-forget: trigger AI analysis whenever a recording URL is present.
    // Duration is NOT a reliable signal — Twilio's recording status callback
    // often sends CallDuration: "0" even for real conversations. The presence
    // of a recording URL is the only gate we need.
    const shouldAnalyse = hasRecording && upserted?.id && (upserted?.clinic_id || upserted?.lead_id);

    if (shouldAnalyse) {
      const fnUrl = `${supabaseUrl}/functions/v1/auto-analyse-call`;
      console.log("twilio-status: dispatching auto-analyse-call", {
        callRecordId: upserted!.id,
        clinicId: upserted!.clinic_id,
        leadId: upserted!.lead_id,
        duration,
      });
      fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ callRecordId: upserted!.id }),
      }).catch((e) => console.error("auto-analyse-call dispatch failed:", e));
    } else if (hasRecording && upserted?.id && !upserted?.clinic_id && !upserted?.lead_id) {
      console.log("twilio-status: skipping AI analysis — no clinic_id or lead_id", {
        callRecordId: upserted?.id,
      });
    } else if (!hasRecording) {
      console.log("twilio-status: no recording URL, skipping analysis", {
        callSid,
        parentCallSid,
        callStatus,
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Status callback error:", error);
    return new Response("OK", { status: 200 });
  }
});
