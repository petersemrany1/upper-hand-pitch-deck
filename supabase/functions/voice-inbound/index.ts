import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Returns TwiML to forward all inbound calls to the browser identity "peter_browser"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response> <Dial answerOnBridge="true"> <Client> <Identity>peter_browser</Identity> </Client> </Dial> </Response>`;

  return new Response(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
      ...corsHeaders,
    },
  });
});
