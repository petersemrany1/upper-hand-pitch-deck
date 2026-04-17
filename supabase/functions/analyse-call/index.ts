import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const SYSTEM_PROMPT = `You are an expert sales coach specialising in high-ticket medical and aesthetic procedures. Analyse this sales call transcript and return a JSON object with exactly these fields:
{
  "score": number out of 10,
  "summary": "2 sentence overview of the call",
  "went_well": ["array of things done well"],
  "missed_opportunities": ["array of opportunities missed"],
  "objections_unhandled": ["array of objections that weren't handled well"],
  "suggested_responses": ["for each unhandled objection, the ideal response to use next time"],
  "next_action": "single recommended next step for this clinic",
  "call_verdict": "Hot / Warm / Cold / Dead"
}
Return only valid JSON, no preamble.`;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const TWILIO_API_KEY_SID = Deno.env.get("TWILIO_API_KEY_SID") || "";
const TWILIO_API_KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET") || "";

function twilioAuthHeader(): string {
  // Prefer API Key (works for both REST and recordings); fall back to Auth Token if present.
  if (TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET) {
    return "Basic " + btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`);
  }
  return "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { recordingUrl, recordSid } = await req.json();
    if (!recordingUrl) {
      return new Response(JSON.stringify({ error: "recordingUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    // 1. Download audio from Twilio (auth required)
    console.log("Fetching recording:", recordingUrl);
    const audioResp = await fetch(recordingUrl, {
      headers: { Authorization: twilioAuthHeader() },
    });
    if (!audioResp.ok) {
      const t = await audioResp.text();
      throw new Error(`Failed to download recording (${audioResp.status}): ${t.slice(0, 200)}`);
    }
    const audioBlob = await audioResp.blob();
    console.log("Audio downloaded, size:", audioBlob.size);

    // 2. Transcribe with OpenAI Whisper
    const fd = new FormData();
    fd.append("file", audioBlob, "call.mp3");
    fd.append("model", "whisper-1");
    fd.append("response_format", "text");

    const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: fd,
    });
    if (!whisperResp.ok) {
      const t = await whisperResp.text();
      throw new Error(`Whisper failed (${whisperResp.status}): ${t.slice(0, 300)}`);
    }
    const transcript = (await whisperResp.text()).trim();
    console.log("Transcript length:", transcript.length);

    if (!transcript) {
      throw new Error("Transcript was empty — call may have had no audio.");
    }

    // 3. Send transcript to Anthropic Claude
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Transcript:\n\n${transcript}` },
        ],
      }),
    });
    if (!claudeResp.ok) {
      const t = await claudeResp.text();
      throw new Error(`Claude failed (${claudeResp.status}): ${t.slice(0, 300)}`);
    }
    const claudeJson = await claudeResp.json();
    const rawText: string = claudeJson?.content?.[0]?.text || "";

    // Extract JSON (strip code fences if present)
    let jsonText = rawText.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude returned non-JSON: ${rawText.slice(0, 300)}`);
    }

    // 4. Persist to call_records
    if (recordSid) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error } = await supabase
        .from("call_records")
        .update({ call_analysis: analysis })
        .eq("id", recordSid);
      if (error) console.error("DB save error:", error);
    }

    return new Response(JSON.stringify({ analysis, transcript }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyse-call error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
