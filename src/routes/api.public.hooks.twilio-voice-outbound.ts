// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-voice-outbound.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/hooks/twilio-voice-outbound";

export const Route = createFileRoute("/api/public/hooks/twilio-voice-outbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const {
          readTwilioWebhook,
          twimlResponse,
          xmlEscape,
          toAuE164,
          claimPoolNumber,
          publicBaseUrl,
        } = await import("@/legal/lib/twilio.server");

        const url = new URL(request.url);
        const attempt = Number(url.searchParams.get("attempt") ?? "1") || 1;
        const excludeNumber = url.searchParams.get("exclude");
        const retryTo = url.searchParams.get("to");

        const { params, valid } = await readTwilioWebhook(request, `${PATH}${url.search}`);
        if (!valid) return new Response("Invalid signature", { status: 403 });

        if (params["FirmApplicationCallId"]) {
          const { firmApplicationDialTwiml } = await import("@/legal/lib/firm-calling.server");
          try {
            return twimlResponse(
              await firmApplicationDialTwiml(
                params["FirmApplicationCallId"],
                params["CallSid"] ?? "",
                params["From"] ?? "",
              ),
            );
          } catch (error) {
            console.error("[firm-call] dial failed", error);
            return twimlResponse(
              `<Response><Say>The firm call could not start. Please check your calling settings and try again.</Say><Hangup/></Response>`,
            );
          }
        }

        // Firm Cold Calling: the browser passes the attempt id; the number and
        // caller ID come from the database, never from the client.
        const prospectAttemptId = params["ProspectAttemptId"] ?? "";
        if (prospectAttemptId) {
          const { prospectDialTwiml } = await import("@/legal/lib/cold-calling/cold-calling.server");
          return twimlResponse(await prospectDialTwiml(prospectAttemptId, params["CallSid"] ?? ""));
        }

        // On the retry pass Twilio posts the outcome of the first <Dial>.
        const dialStatus = params["DialCallStatus"] ?? null;
        if (dialStatus && ["completed", "answered"].includes(dialStatus)) {
          return twimlResponse(`<Response><Hangup/></Response>`);
        }
        // A missed or busy call is not a routing failure. Leave any deliberate
        // second dial to the rep rather than retrying from another caller ID.
        if (dialStatus && dialStatus !== "failed") {
          if (dialStatus === "canceled") {
            return twimlResponse(`<Response><Hangup/></Response>`);
          }
          const message =
            dialStatus === "no-answer"
              ? "There was no answer. You can try this client again later."
              : dialStatus === "busy"
                ? "The line is busy. Please try this client again later."
                : "The call ended without connecting. Please try again later.";
          return twimlResponse(`<Response><Say voice="alice">${message}</Say><Hangup/></Response>`);
        }

        const to = toAuE164(retryTo ?? params["To"] ?? null);
        if (!to) {
          return twimlResponse(
            `<Response><Say voice="alice">That number could not be dialled. Please check the lead's phone number.</Say><Hangup/></Response>`,
          );
        }

        // Retry routing failures once with a different pool number. A failed
        // status alone does not establish whether either caller ID was blocked.
        if (attempt > 2) {
          return twimlResponse(
            `<Response><Say voice="alice">The call could not be connected after two attempts. Please check the client's phone number before trying again.</Say><Hangup/></Response>`,
          );
        }

        const from = await claimPoolNumber(excludeNumber);
        if (!from) {
          return twimlResponse(
            attempt > 1
              ? `<Response><Say voice="alice">The call could not be connected and no alternative outbound number is available. Please check the client's phone number before trying again.</Say><Hangup/></Response>`
              : `<Response><Say voice="alice">There is no active outbound number in the pool. Add one in settings.</Say><Hangup/></Response>`,
          );
        }

        const base = publicBaseUrl();
        const leadId = params["LeadId"] ?? "";
        const repId = params["RepId"] ?? "";
        const callSid = params["CallSid"] ?? "";

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
        if (callSid && attempt === 1) {
          await supabaseAdmin.from("call_records").insert({
            lead_id: leadId || null,
            rep_id: repId || null,
            twilio_call_sid: callSid,
            direction: "outbound",
            call_status: "initiated",
          });
        }

        const statusUrl = `${base}/api/public/hooks/twilio-status`;
        const recordingUrl = `${base}/api/public/hooks/twilio-recording`;
        const actionUrl =
          `${base}${PATH}?attempt=${attempt + 1}&exclude=${encodeURIComponent(from)}` +
          `&to=${encodeURIComponent(to)}`;

        return twimlResponse(
          `<Response><Dial callerId="${xmlEscape(from)}" record="record-from-answer-dual" answerOnBridge="true" ringTone="au" timeout="25"` +
            ` action="${xmlEscape(actionUrl)}" method="POST"` +
            ` recordingStatusCallback="${xmlEscape(recordingUrl)}" recordingStatusCallbackMethod="POST"` +
            ` recordingStatusCallbackEvent="completed">` +
            `<Number statusCallback="${xmlEscape(statusUrl)}" statusCallbackMethod="POST"` +
            ` statusCallbackEvent="initiated ringing answered completed">${xmlEscape(to)}</Number></Dial></Response>`,
        );
      },
    },
  },
});
