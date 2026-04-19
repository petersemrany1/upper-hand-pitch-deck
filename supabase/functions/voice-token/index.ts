import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Mints a Twilio AccessToken with a VoiceGrant for the browser SDK.
// JWT is built manually (HS256) so we don't pull in the Node-only twilio SDK.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signHs256(payload: object, header: object, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${base64UrlEncode(new Uint8Array(sig))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET") ?? "";
    const twimlAppSid = Deno.env.get("TWILIO_TWIML_APP_SID") ?? "";

    const missing: string[] = [];
    if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!apiKeySid) missing.push("TWILIO_API_KEY_SID");
    if (!apiKeySecret) missing.push("TWILIO_API_KEY_SECRET");
    if (!twimlAppSid) missing.push("TWILIO_TWIML_APP_SID");
    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing secrets: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Identity is required by Twilio; Voice JS only allows [A-Za-z0-9_].
    const url = new URL(req.url);
    let identity = url.searchParams.get("identity") || "";
    if (!identity && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      identity = body.identity || "";
    }
    if (!identity) {
      identity = `peter_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    }
    // Sanitize: replace any char outside [A-Za-z0-9_] with _, cap at 120 chars.
    identity = identity.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 120);
    if (!identity) identity = `peter_${Date.now().toString(36)}`;

    const now = Math.floor(Date.now() / 1000);
    const ttl = 60 * 60; // 1 hour

    const header = {
      alg: "HS256",
      typ: "JWT",
      cty: "twilio-fpa;v=1",
    };

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

    const token = await signHs256(payload, header, apiKeySecret);

    const incomingAllowed = payload.grants.voice.incoming.allow === true;
    console.log(`TOKEN IDENTITY: ${identity}`);
    console.log(`TOKEN INCOMING ALLOWED: ${incomingAllowed}`);

    return new Response(
      JSON.stringify({ token, identity, ttl, incomingAllowed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("voice-token error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
