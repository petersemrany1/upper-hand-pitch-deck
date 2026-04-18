import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
  const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET") ?? "";

  return new Response(
    JSON.stringify({
      runtime_secret_names_read: ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET"],
      account_sid: accountSid,
      api_key_sid: apiKeySid,
      api_key_secret_length: apiKeySecret.length,
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
