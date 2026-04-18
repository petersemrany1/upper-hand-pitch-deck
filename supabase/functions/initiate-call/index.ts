import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Click-to-call: Twilio first calls Peter, then on answer bridges him to the clinic.
//   1. Frontend POSTs { clinicPhone, clientId? } to this function
//   2. We call the Twilio REST API to dial Peter's number (+61418214953)
//   3. When Peter answers, Twilio fetches the call-twiml function which dials the clinic
//   4. Recording is enabled on the bridged leg
//   5. We insert a call_records row tagged with the parent CallSid so the UI can poll status

const PETER_PHONE = "+61418214953";
const TWILIO_CALLER_ID = "+61468031075";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio account credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawClinic: string = body.clinicPhone || body.to || "";
    const clientId: string | null = body.clientId ?? null;

    if (!rawClinic) {
      return new Response(
        JSON.stringify({ error: "clinicPhone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clinicPhone = formatAUPhone(rawClinic);
    const twimlUrl = `${supabaseUrl}/functions/v1/call-twiml?clinic=${encodeURIComponent(clinicPhone)}`;
    const statusCallback = `${supabaseUrl}/functions/v1/twilio-status`;

    // REST: POST /2010-04-01/Accounts/{Sid}/Calls.json
    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const params = new URLSearchParams({
      To: PETER_PHONE,
      From: TWILIO_CALLER_ID,
      Url: twimlUrl,
      Method: "POST",
      Record: "true",
      RecordingStatusCallback: statusCallback,
      RecordingStatusCallbackMethod: "POST",
      StatusCallback: statusCallback,
      StatusCallbackMethod: "POST",
      StatusCallbackEvent: "initiated",
      StatusCallbackEvent: "ringing",
      StatusCallbackEvent: "answered",
      StatusCallbackEvent: "completed",
    });

    const twilioRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioJson = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio REST error", twilioJson);
      return new Response(
        JSON.stringify({ error: twilioJson.message || "Twilio REST API rejected the call", twilio: twilioJson }),
        { status: twilioRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const callSid: string = twilioJson.sid;
    console.log("initiate-call: Twilio call created", { callSid, peter: PETER_PHONE, clinicPhone });

    // Insert tracking row (best-effort)
    if (supabaseUrl && serviceKey) {
      try {
        const sb = createClient(supabaseUrl, serviceKey);
        await sb.from("call_records").insert({
          twilio_call_sid: callSid,
          client_id: clientId,
          status: "initiated",
          call_analysis: {
            mode: "click-to-call",
            peter: PETER_PHONE,
            clinicPhone,
            callerId: TWILIO_CALLER_ID,
          },
        });
      } catch (err) {
        console.error("initiate-call: failed to insert call_records", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, callSid, clinicPhone }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("initiate-call: unhandled error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
