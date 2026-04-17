import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// Base64URL encoding helper
function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signHS256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID")!;
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET")!;
    const twimlAppSid = Deno.env.get("TWILIO_TWIML_APP_SID")!;

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const identity = `peter-${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const ttl = 3600; // 1 hour

    const header = { alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" };
    const payload = {
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      iat: now,
      exp: now + ttl,
      grants: {
        identity,
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: twimlAppSid },
        },
      },
    };

    const headerB64 = b64url(JSON.stringify(header));
    const payloadB64 = b64url(JSON.stringify(payload));
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = await signHS256(signingInput, apiKeySecret);
    const token = `${signingInput}.${signature}`;

    return new Response(
      JSON.stringify({ token, identity }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
