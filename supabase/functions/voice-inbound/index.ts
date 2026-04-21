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

      // Best-effort clinic match by normalised phone digits.
      let clinicId: string | null = null;
      if (from) {
        const fromDigits = digitsOnly(from);
        // Try last 9 digits (handles +61 vs 0-prefix variations)
        const tail = fromDigits.slice(-9);
        if (tail.length >= 6) {
          const { data: clinic } = await supabase
            .from("clinics")
            .select("id, phone")
            .ilike("phone", `%${tail}%`)
            .limit(1)
            .maybeSingle();
          if (clinic?.id) clinicId = clinic.id;
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
