import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Streams a Twilio recording. SECURITY: requires a Supabase auth header so
// only signed-in users can fetch recordings. Twilio credentials are pulled
// from environment secrets — never hard-coded.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function unauthorized(msg: string): Response {
  return new Response(
    JSON.stringify({ error: msg }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 1. Require Supabase auth
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return unauthorized("Missing Authorization header");
  }
  const userJwt = authHeader.slice(7).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (supabaseUrl && anonKey) {
    try {
      const sb = createClient(supabaseUrl, anonKey);
      const { data: userData, error: userErr } = await sb.auth.getUser(userJwt);
      if (userErr || !userData?.user) return unauthorized("Invalid or expired session");
    } catch (e) {
      console.error("twilio-recording: auth check failed", e);
      return unauthorized("Auth verification failed");
    }
  } else {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: missing Supabase env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 2. Validate Twilio creds from secrets (no hard-coded values)
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  if (!accountSid || !authToken) {
    return new Response(
      JSON.stringify({ error: "Missing Twilio credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const recordingUrl = url.searchParams.get("url");

  if (!recordingUrl) {
    return new Response(
      JSON.stringify({ error: "Missing url parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!recordingUrl.startsWith("https://api.twilio.com/")) {
    return new Response(
      JSON.stringify({ error: "Invalid URL" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const response = await fetch(recordingUrl, {
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Twilio returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const download = url.searchParams.get("download") === "1";
    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        ...(download ? { "Content-Disposition": "attachment; filename=recording.mp3" } : {}),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
