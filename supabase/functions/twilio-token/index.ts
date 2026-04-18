import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import twilio from "npm:twilio@5.7.0";

const { jwt: { AccessToken } } = twilio;
const VoiceGrant = AccessToken.VoiceGrant;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

type JsonRecord = Record<string, unknown>;

type TwimlAppDiagnostic = {
  exists: boolean;
  voiceUrlSet: boolean;
  voiceUrl: string | null;
  expectedVoiceUrl: string;
  updated: boolean;
  updateAttempted: boolean;
  host: string | null;
  sid: string;
  error?: unknown;
};

function prefix(value: string): string {
  return value.slice(0, 6);
}

function decodeJwtPayload(token: string): JsonRecord {
  const [, payloadPart] = token.split(".");
  if (!payloadPart) {
    throw new Error("Generated token is not a valid JWT");
  }

  const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return JSON.parse(atob(padded)) as JsonRecord;
}

async function readJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchTwimlApp(
  accountSid: string,
  apiKeySid: string,
  apiKeySecret: string,
  twimlAppSid: string,
) {
  const authHeader = `Basic ${btoa(`${apiKeySid}:${apiKeySecret}`)}`;
  const hosts = ["https://api.au1.twilio.com", "https://api.twilio.com"];
  const errors: Array<{ host: string; status: number; body: unknown }> = [];

  for (const host of hosts) {
    const response = await fetch(
      `${host}/2010-04-01/Accounts/${accountSid}/Applications/${twimlAppSid}.json`,
      {
        method: "GET",
        headers: { Authorization: authHeader },
      },
    );

    const body = await readJsonSafe(response);

    if (response.ok) {
      return {
        host,
        authHeader,
        data: body as JsonRecord,
      };
    }

    errors.push({ host, status: response.status, body });
  }

  return {
    host: null,
    authHeader,
    data: null,
    errors,
  };
}

async function ensureTwimlAppVoiceUrl(params: {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  supabaseUrl: string;
}): Promise<TwimlAppDiagnostic> {
  const { accountSid, apiKeySid, apiKeySecret, twimlAppSid, supabaseUrl } = params;
  const expectedVoiceUrl = `${supabaseUrl}/functions/v1/twilio-twiml`;
  const application = await fetchTwimlApp(accountSid, apiKeySid, apiKeySecret, twimlAppSid);

  if (!application.host || !application.data) {
    return {
      exists: false,
      voiceUrlSet: false,
      voiceUrl: null,
      expectedVoiceUrl,
      updated: false,
      updateAttempted: false,
      host: null,
      sid: twimlAppSid,
      error: application.errors ?? "Unable to fetch TwiML App",
    };
  }

  const currentVoiceUrl =
    (application.data.voice_url as string | undefined) ??
    (application.data.voiceUrl as string | undefined) ??
    null;

  if (currentVoiceUrl === expectedVoiceUrl) {
    return {
      exists: true,
      voiceUrlSet: true,
      voiceUrl: currentVoiceUrl,
      expectedVoiceUrl,
      updated: false,
      updateAttempted: false,
      host: application.host,
      sid: (application.data.sid as string | undefined) ?? twimlAppSid,
    };
  }

  const updateResponse = await fetch(
    `${application.host}/2010-04-01/Accounts/${accountSid}/Applications/${twimlAppSid}.json`,
    {
      method: "POST",
      headers: {
        Authorization: application.authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        VoiceUrl: expectedVoiceUrl,
        VoiceMethod: "POST",
      }),
    },
  );

  const updateBody = await readJsonSafe(updateResponse);

  if (!updateResponse.ok) {
    return {
      exists: true,
      voiceUrlSet: Boolean(currentVoiceUrl),
      voiceUrl: currentVoiceUrl,
      expectedVoiceUrl,
      updated: false,
      updateAttempted: true,
      host: application.host,
      sid: (application.data.sid as string | undefined) ?? twimlAppSid,
      error: {
        status: updateResponse.status,
        body: updateBody,
      },
    };
  }

  const updatedData = (updateBody ?? {}) as JsonRecord;
  const finalVoiceUrl =
    (updatedData.voice_url as string | undefined) ??
    (updatedData.voiceUrl as string | undefined) ??
    expectedVoiceUrl;

  return {
    exists: true,
    voiceUrlSet: Boolean(finalVoiceUrl),
    voiceUrl: finalVoiceUrl,
    expectedVoiceUrl,
    updated: finalVoiceUrl === expectedVoiceUrl,
    updateAttempted: true,
    host: application.host,
    sid: (updatedData.sid as string | undefined) ?? twimlAppSid,
  };
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid || !supabaseUrl) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const secretPrefixes = {
      TWILIO_ACCOUNT_SID: prefix(accountSid),
      TWILIO_API_KEY_SID: prefix(apiKeySid),
      TWILIO_API_KEY_SECRET: prefix(apiKeySecret),
      TWILIO_TWIML_APP_SID: prefix(twimlAppSid),
    };

    console.log("Twilio token env prefixes", secretPrefixes);

    const twimlApp = await ensureTwimlAppVoiceUrl({
      accountSid,
      apiKeySid,
      apiKeySecret,
      twimlAppSid,
      supabaseUrl,
    });

    console.log("Twilio TwiML App diagnostic", twimlApp);

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      {
        identity: "peter",
        region: "au1",
        ttl: 3600,
      },
    );

    token.addGrant(voiceGrant);

    const jwt = token.toJwt();
    const decodedPayload = decodeJwtPayload(jwt);
    const loggedPayload = {
      iss: decodedPayload.iss,
      sub: decodedPayload.sub,
      grants: decodedPayload.grants,
      region: decodedPayload.region,
      exp: decodedPayload.exp,
      signingKeySid: apiKeySid,
    };

    console.log("Twilio token decoded JWT payload", loggedPayload);

    return new Response(
      JSON.stringify({
        token: jwt,
        identity: "peter",
        diagnostics: {
          tokenGenerated: true,
          jwtPrefix: jwt.slice(0, 20),
          decodedPayload: loggedPayload,
          signingKeySid: apiKeySid,
          secretPrefixes,
          twimlApp,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("twilio-token error", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown twilio-token error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
