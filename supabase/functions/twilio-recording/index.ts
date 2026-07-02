import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Streams a Twilio recording. SECURITY: requires a Supabase auth header so
// only signed-in users can fetch recordings. Twilio credentials are pulled
// from environment secrets — never hard-coded.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
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

  // 1. Require Supabase auth — accept either Authorization header OR ?token=
  //    query param (needed for <audio src> / <a download> which can't set headers).
  const url = new URL(req.url);
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  let userJwt = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    userJwt = authHeader.slice(7).trim();
  } else {
    userJwt = (url.searchParams.get("token") || "").trim();
  }
  if (!userJwt) {
    return unauthorized("Missing Authorization");
  }

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
    // Twilio's transcoded .mp3 endpoint does NOT return Content-Length or
    // honor Range reliably, which breaks <audio> seeking (duration shows as
    // a tiny number and the scrubber jumps to the wrong spot).
    // Fix: always download the full file server-side, then serve it with a
    // correct Content-Length and honor Range requests from the buffered bytes.
    const upstream = await fetch(recordingUrl, {
      headers: { "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`) },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Twilio returned ${upstream.status}` }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fullBuffer = new Uint8Array(await upstream.arrayBuffer());
    const totalLength = fullBuffer.byteLength;

    const download = url.searchParams.get("download") === "1";
    const baseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };
    if (download) baseHeaders["Content-Disposition"] = "attachment; filename=recording.mp3";

    const rangeHeader = req.headers.get("Range") || req.headers.get("range");
    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (match) {
        const start = match[1] === "" ? 0 : parseInt(match[1], 10);
        let end = match[2] === "" ? totalLength - 1 : parseInt(match[2], 10);
        if (isNaN(start) || isNaN(end) || start > end || start >= totalLength) {
          return new Response(null, {
            status: 416,
            headers: { ...baseHeaders, "Content-Range": `bytes */${totalLength}` },
          });
        }
        if (end >= totalLength) end = totalLength - 1;
        const slice = fullBuffer.subarray(start, end + 1);
        return new Response(slice, {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${totalLength}`,
            "Content-Length": String(slice.byteLength),
          },
        });
      }
    }

    return new Response(fullBuffer, {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(totalLength) },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
