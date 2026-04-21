import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Twilio sends the call params as application/x-www-form-urlencoded.
  // Try formData first; fall back to raw text parsing.
  let from = "";
  let callSid = "";
  try {
    const form = await req.formData();
    from = form.get("From")?.toString() ?? "";
    callSid = form.get("CallSid")?.toString() ?? "";
  } catch {
    // ignore — TwiML body still works without a logged caller
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
        }
      }

      await supabase
        .from("call_records")
        .upsert(
          {
            twilio_call_sid: callSid,
            phone: from || null,
            direction: "inbound",
            status: "ringing",
            clinic_id: clinicId,
          },
          { onConflict: "twilio_call_sid" },
        );
    } catch (e) {
      console.error("voice-inbound: failed to log call_records row", e);
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" timeout="20">
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
