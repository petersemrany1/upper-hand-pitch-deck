import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateTwilioSignature } from "../_shared/twilio-signature.ts";

// Returns TwiML to forward all inbound calls to the browser identity
// "peter_browser". Also logs the inbound call to call_records (with
// direction='inbound') and tries to match the caller to a known clinic
// so the dashboard "Missed Calls" panel can show clinic name.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function digitsOnly(s: string): string {
  return (s || "").replace(/[^0-9]/g, "");
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]!));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Twilio sends the call params as application/x-www-form-urlencoded.
  // Try formData first; fall back to raw text parsing.
  let from = "";
  let callSid = "";
  let form: FormData | null = null;
  try {
    form = await req.formData();
    from = form.get("From")?.toString() ?? "";
    callSid = form.get("CallSid")?.toString() ?? "";
  } catch {
    // ignore — TwiML body still works without a logged caller
  }

  // Verify the request actually came from Twilio. Without this check anyone
  // can POST fake inbound calls.
  if (!form || !(await validateTwilioSignature(req, form))) {
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  console.log("voice-inbound: incoming", { from, callSid });

  // Fire-and-forget log to call_records.
  if (callSid) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Best-effort clinic match: compare last 9 digits of normalised phone.
      // This handles +61 vs 0-prefix and any spaces/brackets in the stored
      // clinic phone column.
      let clinicId: string | null = null;
      let leadId: string | null = null;
      if (from) {
        const fromDigits = digitsOnly(from);
        const tail = fromDigits.slice(-9);
        if (tail.length >= 6) {
          // Pull all clinics with a phone and match in JS — clinic phones
          // contain spaces ("+61 437 778 852") so an ilike on the raw column
          // with a digits-only tail will never match.
          const { data: clinics } = await supabase
            .from("clinics")
            .select("id, phone")
            .not("phone", "is", null);
          if (clinics) {
            const match = clinics.find((c) => {
              const cd = digitsOnly(c.phone || "");
              return cd.length >= 6 && cd.slice(-9) === tail;
            });
            if (match?.id) clinicId = match.id;
          }

          const { data: leads } = await supabase
            .from("meta_leads")
            .select("id, phone")
            .not("phone", "is", null);
          if (leads) {
            const match = leads.find((l) => {
              const ld = digitsOnly(l.phone || "");
              return ld.length >= 6 && ld.slice(-9) === tail;
            });
            if (match?.id) leadId = match.id;
          }
        }
      }

      // TODO: rep_id is not set here. Today every inbound call is forwarded
      // to the single hardcoded "peter_browser" client identity, so all
      // inbound calls implicitly belong to that one rep. When multiple reps
      // start answering inbound calls (e.g. round-robin or based on which
      // browser is online), this needs to resolve the answering rep —
      // probably by mapping the Twilio Client identity that accepts the
      // call to a sales_reps row, then UPDATE'ing rep_id on this row from
      // a follow-up status callback.
      await supabase
        .from("call_records")
        .upsert(
          {
            twilio_call_sid: callSid,
            phone: from || null,
            direction: "inbound",
            status: "ringing",
            clinic_id: clinicId,
            lead_id: leadId,
          },
          { onConflict: "twilio_call_sid" },
        );
    } catch (e) {
      console.error("voice-inbound: failed to log call_records row", e);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const statusCallbackUrl = escapeXml(`${supabaseUrl}/functions/v1/twilio-status`);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="20" record="record-from-answer" recordingStatusCallback="${statusCallbackUrl}" recordingStatusCallbackMethod="POST" trim="trim-silence">
    <Client>peter_browser</Client>
  </Dial>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
      ...corsHeaders,
    },
  });
});
