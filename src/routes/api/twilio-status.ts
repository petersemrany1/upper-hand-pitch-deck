import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/twilio-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const callSid = formData.get("CallSid")?.toString() || "";
        const callStatus = formData.get("CallStatus")?.toString() || "";
        const callDuration = formData.get("CallDuration")?.toString() || formData.get("Duration")?.toString() || "0";
        const recordingSid = formData.get("RecordingSid")?.toString() || "";
        const recordingUrl = formData.get("RecordingUrl")?.toString() || "";

        console.log("Twilio status callback:", { callSid, callStatus, recordingSid, recordingUrl, callDuration });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          console.error("Missing Supabase env vars in twilio-status");
          return new Response("OK", { status: 200 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        if (recordingSid && recordingUrl) {
          // Recording completed callback
          const mp3Url = `${recordingUrl}.mp3`;
          await supabase
            .from("call_records")
            .update({
              recording_sid: recordingSid,
              recording_url: mp3Url,
              duration: parseInt(callDuration) || null,
            })
            .eq("twilio_call_sid", callSid);
        } else if (callStatus === "completed") {
          // Call completed callback
          await supabase
            .from("call_records")
            .update({
              status: callStatus,
              duration: parseInt(callDuration) || null,
            })
            .eq("twilio_call_sid", callSid);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
