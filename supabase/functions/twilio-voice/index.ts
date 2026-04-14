import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = "AC4e4b3797155ad508c8dffa4b13a1fd6e";
const TWILIO_AUTH_TOKEN = "376714289a02806ab80049a4afde9b04";
const TWILIO_FROM = "+61483938205";

function formatAUPhone(num: string): string {
  let cleaned = num.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  return "+61" + cleaned;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { clientPhone, userPhone } = await req.json();

    if (!clientPhone || !userPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "clientPhone and userPhone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedClient = formatAUPhone(clientPhone);
    const formattedUser = formatAUPhone(userPhone);

    console.log("Initiating call:", { formattedUser, formattedClient, from: TWILIO_FROM });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

    // TwiML URL: when the user answers, say a message then dial the client
    const twimlUrl = `${supabaseUrl}/functions/v1/twilio-twiml?clientPhone=${encodeURIComponent(formattedClient)}`;
    const statusUrl = `${supabaseUrl}/functions/v1/twilio-status`;

    // Step 1: Call the USER's phone only. Twilio will fetch twimlUrl when user answers.
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedUser,       // Call MY phone first
        From: TWILIO_FROM,       // Twilio number
        Url: twimlUrl,           // TwiML fetched ONLY after I answer
        Method: "GET",
        StatusCallback: statusUrl,
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: "initiated ringing answered completed",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio API error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Failed to initiate call" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Call created successfully:", result.sid);

    return new Response(
      JSON.stringify({ success: true, callSid: result.sid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
