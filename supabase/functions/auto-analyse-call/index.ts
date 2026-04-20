import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Auto CRM call logger.
// Triggered by twilio-status after a recording is saved. Uses the SERVICE
// ROLE — no end-user auth required, but only callable internally (the URL
// is only invoked server-side by twilio-status with the service role key).
//
// Pipeline:
//   1. Look up call_records row by id (passed as `callRecordId`).
//   2. Download recording from Twilio (Basic Auth via env).
//   3. Whisper transcription.
//   4. Claude analysis → structured CRM JSON.
//   5. Persist to call_records.call_analysis with `pending_review = true`
//      and flip needs_review = true so the frontend popup can pick it up.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function twilioAuthHeader(): string {
  const sid = Deno.env.get("TWILIO_API_KEY_SID") || "";
  const secret = Deno.env.get("TWILIO_API_KEY_SECRET") || "";
  if (sid && secret) return "Basic " + btoa(`${sid}:${secret}`);
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const token = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  return "Basic " + btoa(`${accountSid}:${token}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { callRecordId } = await req.json();
    if (!callRecordId) {
      return new Response(JSON.stringify({ error: "callRecordId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const logErr = async (msg: string, ctx: Record<string, unknown> = {}) => {
      try {
        await supabase.from("error_logs").insert({
          function_name: "auto-analyse-call",
          error_message: msg,
          context: { callRecordId, ...ctx },
        });
      } catch (e) {
        console.error("error_logs insert failed", e);
      }
    };
    const setStage = async (stage: string) => {
      await supabase.from("call_records").update({ analysis_stage: stage }).eq("id", callRecordId);
    };

    const { data: row, error: rowErr } = await supabase
      .from("call_records")
      .select("id, recording_url, clinic_id, duration")
      .eq("id", callRecordId)
      .maybeSingle();

    if (rowErr || !row) {
      await logErr(`call_records lookup failed: ${rowErr?.message || "not found"}`);
      throw new Error(`call_records lookup failed: ${rowErr?.message || "not found"}`);
    }
    if (!row.recording_url) {
      await logErr("No recording_url on call record");
      throw new Error("No recording_url on call record");
    }
    if (!row.clinic_id) {
      console.log("auto-analyse-call: no clinic_id, skipping CRM auto-fill");
      return new Response(JSON.stringify({ skipped: "no clinic_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await setStage("transcribing");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!OPENAI_API_KEY) {
      await logErr("OPENAI_API_KEY not configured");
      throw new Error("OPENAI_API_KEY not configured");
    }
    if (!ANTHROPIC_API_KEY) {
      await logErr("ANTHROPIC_API_KEY not configured");
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // 1. Download audio from Twilio
    console.log("auto-analyse-call: fetching recording", row.recording_url);
    const audioResp = await fetch(row.recording_url, {
      headers: { Authorization: twilioAuthHeader() },
    });
    if (!audioResp.ok) {
      const t = await audioResp.text();
      throw new Error(`Recording download failed (${audioResp.status}): ${t.slice(0, 200)}`);
    }
    const audioBlob = await audioResp.blob();

    // 2. Whisper
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
    if (!transcript) {
      await logErr("Empty transcript from Whisper");
      throw new Error("Empty transcript");
    }

    await setStage("analysing");

    // 3. Claude
    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
      }),
    });
    if (!claudeResp.ok) {
      const t = await claudeResp.text();
      throw new Error(`Claude failed (${claudeResp.status}): ${t.slice(0, 300)}`);
    }
    const claudeJson = await claudeResp.json();
    let raw: string = claudeJson?.content?.[0]?.text || "";
    raw = raw.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    }
    let crm: Record<string, unknown>;
    try {
      crm = JSON.parse(raw);
    } catch {
      throw new Error(`Claude returned non-JSON: ${raw.slice(0, 200)}`);
    }

    // 4. Persist with pending_review flag
    const analysis = {
      ...crm,
      transcript,
      pending_review: true,
      analysed_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("call_records")
      .update({
        call_analysis: analysis,
        needs_review: true,
        analysis_stage: "complete",
      })
      .eq("id", callRecordId);

    if (updErr) {
      await logErr(`DB update failed: ${updErr.message}`);
      throw new Error(`DB update failed: ${updErr.message}`);
    }

    return new Response(JSON.stringify({ ok: true, analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auto-analyse-call error:", err);
    // Best-effort: mark the row as failed so the UI can react.
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const body = await req.clone().json().catch(() => ({}));
      if (body?.callRecordId) {
        await sb
          .from("call_records")
          .update({ analysis_stage: "failed" })
          .eq("id", body.callRecordId);
      }
    } catch {
      /* noop */
    }
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
