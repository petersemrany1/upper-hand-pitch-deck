// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-recording.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/hooks/twilio-recording";

export const Route = createFileRoute("/api/public/hooks/twilio-recording")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { readTwilioWebhook, publicBaseUrl } = await import("@/legal/lib/twilio.server");
        const { params, valid } = await readTwilioWebhook(request, PATH);
        if (!valid) return new Response("Invalid signature", { status: 403 });

        const recordingSid = params["RecordingSid"] ?? "";
        const recordingUrl = params["RecordingUrl"] ?? "";
        const callSid = params["CallSid"] ?? "";
        const status = params["RecordingStatus"] ?? "";
        if (!callSid || !recordingSid) return new Response("ok");

        const { receiveFirmRecording } = await import("@/legal/lib/firm-calling.server");
        if (await receiveFirmRecording(params)) return new Response("ok");

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        const { data: rows } = await supabaseAdmin
          .from("call_records")
          .select("id, direction")
          .eq("twilio_call_sid", callSid)
          .limit(1);
        let recordId = rows?.[0]?.id ?? null;
        const firmVoicemail = rows?.[0]?.direction === "prospect_inbound";

        if (recordId) {
          await supabaseAdmin
            .from("call_records")
            .update({ recording_sid: recordingSid, recording_url: recordingUrl })
            .eq("id", recordId);
        } else {
          const { data: created } = await supabaseAdmin
            .from("call_records")
            .insert({
              twilio_call_sid: callSid,
              recording_sid: recordingSid,
              recording_url: recordingUrl,
              direction: "unknown",
              call_status: "completed",
            })
            .select("id")
            .single();
          recordId = created?.id ?? null;
        }

        // Firm cold-call recordings: transcribe and hand over (no client AI analysis).
        if (recordId && (status === "completed" || !status)) {
          const { prospectAttemptForCallRecord } =
            await import("@/legal/lib/cold-calling/cold-calling.server");
          if (firmVoicemail || (await prospectAttemptForCallRecord(recordId, callSid))) {
            const secret = legalEnv["INTERNAL_FUNCTION_SECRET"];
            if (secret) {
              try {
                const response = await fetch(
                  `${publicBaseUrl()}/api/public/hooks/prospect-call-transcribed`,
                  {
                    method: "POST",
                    headers: { "content-type": "application/json", "x-internal-secret": secret },
                    body: JSON.stringify({ callRecordId: recordId }),
                  },
                );
                if (!response.ok)
                  console.error(
                    `[twilio-recording] prospect transcription failed [${response.status}]: ${await response.text()}`,
                  );
              } catch (error) {
                console.error("[twilio-recording] prospect transcription threw", error);
              }
            } else {
              console.error(
                "[twilio-recording] INTERNAL_FUNCTION_SECRET missing — prospect transcription skipped",
              );
            }
            return new Response("ok");
          }
        }

        // Recording finished — kick off transcription + AI analysis server-to-server.
        if (recordId && (status === "completed" || !status)) {
          const secret = legalEnv["INTERNAL_FUNCTION_SECRET"];
          if (secret) {
            try {
              const response = await fetch(
                `${publicBaseUrl()}/api/public/hooks/auto-analyse-call`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json", "x-internal-secret": secret },
                  body: JSON.stringify({ callRecordId: recordId }),
                },
              );
              if (!response.ok) {
                console.error(
                  `[twilio-recording] analysis trigger failed [${response.status}]: ${await response.text()}`,
                );
              }
            } catch (error) {
              console.error("[twilio-recording] analysis trigger threw", error);
            }
          } else {
            console.error("[twilio-recording] INTERNAL_FUNCTION_SECRET missing — analysis skipped");
          }
        }

        return new Response("ok");
      },
    },
  },
});
