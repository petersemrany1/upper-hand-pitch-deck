// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/twilio-voice-inbound.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

const PATH = "/api/public/legal/hooks/twilio-voice-inbound";

export const Route = createFileRoute("/api/public/legal/hooks/twilio-voice-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { readTwilioWebhook, twimlResponse, xmlEscape, findLeadByPhone, publicBaseUrl } =
          await import("@/legal/lib/twilio.server");

        const callbackComplete =
          new URL(request.url).searchParams.get("firmCallback") === "complete";
        const { params, valid } = await readTwilioWebhook(
          request,
          callbackComplete ? `${PATH}?firmCallback=complete` : PATH,
        );
        if (!valid) return new Response("Invalid signature", { status: 403 });

        if (callbackComplete) {
          const { finishFirmCallback } = await import("@/legal/lib/firm-callbacks.server");
          return twimlResponse(await finishFirmCallback(params));
        }

        const caller = params["From"] ?? "";
        const callSid = params["CallSid"] ?? "";

        const { receiveFirmCallback } = await import("@/legal/lib/firm-conversations.server");
        const firmResponse = await receiveFirmCallback(params);
        if (firmResponse) return twimlResponse(firmResponse);

        // A law firm ringing back a cold-call number: never ring a setter's browser (they may be
        // on another call). Flag the firm as the setter's next lead and take a message.
        if (caller) {
          try {
            const { recordProspectCallback } =
              await import("@/legal/lib/cold-calling/cold-calling.server");
            const firm = await recordProspectCallback({
              from: caller,
              to: params["To"] ?? "",
              kind: "call",
              callSid,
            });
            if (firm) {
              const { callbackGreeting } = await import("@/legal/lib/cold-calling/callbacks");
              return twimlResponse(
                `<Response><Say voice="alice">${xmlEscape(callbackGreeting())}</Say>` +
                  `<Record maxLength="120" playBeep="true" recordingStatusCallback="${xmlEscape(
                    `${publicBaseUrl()}/api/public/legal/hooks/twilio-recording`,
                  )}" recordingStatusCallbackMethod="POST"/><Hangup/></Response>`,
              );
            }
          } catch (error) {
            console.error("[voice-inbound] firm callback check failed", error);
          }
        }

        const lead = caller ? await findLeadByPhone(caller) : null;

        const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

        // Log the inbound attempt whether or not it matches a lead.
        if (callSid) {
          await supabaseAdmin.from("call_records").insert({
            lead_id: lead?.id ?? null,
            rep_id: lead?.rep_id ?? null,
            twilio_call_sid: callSid,
            direction: "inbound",
            call_status: "missed",
          });
        }

        // Callbacks are queued for the rep; never dial a browser over an active call.
        const voicemail =
          `<Say voice="alice">Thanks for calling Legal Group. Nobody is free right now, so please leave a message after the tone and we will call you straight back.</Say>` +
          `<Record maxLength="120" playBeep="true" recordingStatusCallback="${xmlEscape(
            `${publicBaseUrl()}/api/public/legal/hooks/twilio-recording`,
          )}" recordingStatusCallbackMethod="POST"/><Hangup/>`;

        return twimlResponse(`<Response>${voicemail}</Response>`);
      },
    },
  },
});
