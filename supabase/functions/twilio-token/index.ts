import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from "npm:twilio@5.7.0";

const { jwt: { AccessToken } } = twilio;
const VoiceGrant = AccessToken.VoiceGrant;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function prefix(value: string): string {
  return value.slice(0, 6);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payloadPart] = token.split(".");
  if (!payloadPart) throw new Error("Generated token is not a valid JWT");
  const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return JSON.parse(atob(padded));
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

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const secretPrefixes = {
      TWILIO_ACCOUNT_SID: prefix(accountSid),
      TWILIO_API_KEY_SID: prefix(apiKeySid),
      TWILIO_API_KEY_SECRET: prefix(apiKeySecret),
      TWILIO_TWIML_APP_SID: prefix(twimlAppSid),
    };
    console.log("Twilio token env prefixes", secretPrefixes);

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity: "peter",
      region: "au1",
      ttl: 3600,
    });
    token.addGrant(voiceGrant);

    const jwt = token.toJwt();
    const decodedPayload = decodeJwtPayload(jwt);

    console.log("Twilio token decoded JWT payload", {
      iss: decodedPayload.iss,
      sub: decodedPayload.sub,
      grants: decodedPayload.grants,
      exp: decodedPayload.exp,
      signingKeySid: apiKeySid,
    });

    return new Response(
      JSON.stringify({
        token: jwt,
        identity: "peter",
        diagnostics: {
          tokenGenerated: true,
          jwtPrefix: jwt.slice(0, 20),
          decodedPayload: {
            iss: decodedPayload.iss,
            sub: decodedPayload.sub,
            grants: decodedPayload.grants,
            exp: decodedPayload.exp,
          },
          signingKeySid: apiKeySid,
          secretPrefixes,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("twilio-token error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown twilio-token error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
