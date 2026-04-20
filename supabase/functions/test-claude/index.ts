import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const SYSTEM_PROMPT = `You are analysing a sales call between Peter from Upper Hand Digital and a hair transplant clinic. Based on the transcript, return a JSON object with exactly these fields:
{
  "outcome": one of ["Not Interested", "No Answer", "Left Voicemail", "Gatekeeper", "Call Me Back", "Zoom Set", "Spoke - Interested"],
  "next_action": "what Peter should do next in one short sentence",
  "follow_up_date": "ISO date string if a callback was mentioned, otherwise null",
  "notes": "2-3 sentence plain English summary of what happened on the call",
  "contact_name": "name of person spoken to if mentioned, otherwise null",
  "owner_reached": true or false
}
Return only valid JSON, no preamble.`;

const TRANSCRIPT = `Hey this is Peter from Upper Hand Digital, just calling to see if you guys are interested in more hair transplant patients. The receptionist said the owner wasn't available but to call back Monday morning between 9 and 12.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const keyMeta = {
    length: ANTHROPIC_API_KEY.length,
    prefix: ANTHROPIC_API_KEY.slice(0, 10),
    suffix: ANTHROPIC_API_KEY.slice(-4),
  };

  const start = Date.now();
  let resp: Response;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Transcript:\n\n${TRANSCRIPT}` }],
      }),
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false, stage: "fetch_threw", error: (e as Error).message, keyMeta,
      ms: Date.now() - start,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const ms = Date.now() - start;
  const text = await resp.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* keep raw */ }

  if (!resp.ok) {
    return new Response(JSON.stringify({
      ok: false, status: resp.status, ms, keyMeta, body: json ?? text,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Extract Claude's text content
  const claudeText = (json as any)?.content?.[0]?.text ?? "";
  let parsed: unknown = null;
  let raw = claudeText.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { parsed = JSON.parse(raw); } catch { /* keep raw */ }

  return new Response(JSON.stringify({
    ok: true, status: resp.status, ms, keyMeta,
    raw_claude_text: claudeText,
    parsed,
    usage: (json as any)?.usage,
    model: (json as any)?.model,
  }, null, 2), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
