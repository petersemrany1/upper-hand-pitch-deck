import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const formData = await req.formData();
    const callSid = formData.get("CallSid")?.toString() || "";
    const callStatus = formData.get("CallStatus")?.toString() || "";
    const callDuration = formData.get("CallDuration")?.toString() || formData.get("Duration")?.toString() || "0";
    const recordingSid = formData.get("RecordingSid")?.toString() || "";
    const recordingUrl = formData.get("RecordingUrl")?.toString() || "";

    console.log("Twilio status callback:", { callSid, callStatus, recordingSid, recordingUrl, callDuration });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (recordingSid && recordingUrl) {
      const mp3Url = `${recordingUrl}.mp3`;
      const { data: updated, error } = await supabase
        .from("call_records")
        .update({
          recording_sid: recordingSid,
          recording_url: mp3Url,
          duration: parseInt(callDuration) || null,
          status: "completed",
        })
        .eq("twilio_call_sid", callSid)
        .select("id, clinic_id")
        .maybeSingle();
      if (error) console.error("DB update error (recording):", error);

      // Fire-and-forget: kick off auto CRM analysis when this call is tied to a clinic.
      if (updated?.id && updated?.clinic_id) {
        const fnUrl = `${supabaseUrl}/functions/v1/auto-analyse-call`;
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ callRecordId: updated.id }),
        }).catch((e) => console.error("auto-analyse-call dispatch failed:", e));
      }
    } else if (callStatus) {
      // Update status for all events: completed, no-answer, busy, failed, canceled
      const updateData: Record<string, unknown> = { status: callStatus };
      if (callDuration && parseInt(callDuration) > 0) {
        updateData.duration = parseInt(callDuration);
      }
      const { error } = await supabase
        .from("call_records")
        .update(updateData)
        .eq("twilio_call_sid", callSid);
      if (error) console.error("DB update error (status):", error);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Status callback error:", error);
    return new Response("OK", { status: 200 });
  }
});
