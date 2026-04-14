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
      // Recording completed
      const mp3Url = `${recordingUrl}.mp3`;
      const { error } = await supabase
        .from("call_records")
        .update({
          recording_sid: recordingSid,
          recording_url: mp3Url,
          duration: parseInt(callDuration) || null,
          status: "completed",
        })
        .eq("twilio_call_sid", callSid);
      if (error) console.error("DB update error (recording):", error);
    } else if (callStatus === "completed") {
      const { error } = await supabase
        .from("call_records")
        .update({
          status: callStatus,
          duration: parseInt(callDuration) || null,
        })
        .eq("twilio_call_sid", callSid);
      if (error) console.error("DB update error (status):", error);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Status callback error:", error);
    return new Response("OK", { status: 200 });
  }
});
