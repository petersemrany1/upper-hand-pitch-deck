import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

const SYSTEM_PROMPT = `You are analysing a sales call between Peter from Upper Hand Digital and a hair transplant clinic. Today's date is ${new Date().toISOString().slice(0, 10)} (UTC). Based on the transcript, return a JSON object with exactly these fields:
{
  "outcome": one of ["Not Interested", "No Answer", "Left Voicemail", "Gatekeeper", "Call Me Back", "Zoom Set", "Spoke - Interested"],
  "next_action": "what Peter should do next in one short sentence — INCLUDE the day, date and time window if a callback or Zoom was agreed (e.g. 'Call back Mon 22 Apr between 9am–12pm')",
  "follow_up_date": "ISO date string (YYYY-MM-DD) for the Zoom date OR the callback date, otherwise null",
  "follow_up_time": "the specific time or time window agreed, in plain English (e.g. '9am', '10:30am', '9am–12pm', 'Monday morning'). null if no time mentioned",
  "notes": "2-3 sentence plain English summary of what happened on the call",
  "contact_name": "name of person spoken to if mentioned, otherwise null",
  "owner_reached": true or false
}

OUTCOME RULES — read carefully:
- "Zoom Set" → use this whenever a Zoom / video meeting is scheduled, confirmed, OR rescheduled to a specific time. Rescheduling an existing Zoom counts as Zoom Set. If they pick a day/time for a Zoom, it's Zoom Set.
- "Call Me Back" → use ONLY when the prospect asks Peter to phone them back later (a phone callback, not a Zoom). No Zoom was scheduled.
- "Spoke - Interested" → they expressed interest but no concrete next step (no Zoom booked, no callback time agreed).
- "Gatekeeper" → spoke to reception/assistant, owner not reached.
- "Left Voicemail" → went to voicemail and Peter left a message.
- "No Answer" → no one picked up, no voicemail left.
- "Not Interested" → prospect declined.

CALLBACK TIME EXTRACTION — CRITICAL:
- If the prospect says "call me at 9am", "try Monday morning", "call between 9 and 12", "call tomorrow at 2", etc. — extract the day/date AND the time into BOTH follow_up_date and follow_up_time.
- Resolve relative dates ("tomorrow", "Monday", "next week") against today's date above into a concrete YYYY-MM-DD.
- If only a time-of-day is mentioned with no day, assume the next business day.
- Always echo the exact time/window into next_action so it shows in the CRM list.

Return only valid JSON, no preamble.`;

const PATIENT_SYSTEM_PROMPT = `You are a specialist patient intake analyst for Hair Transplant Group, an Australian hair transplant lead generation business. Your job is to read sales call transcripts between a Hair Transplant Group consultant and a potential hair transplant patient, and write a precise, detailed patient handover note for the clinic team (Nitai Medical & Cosmetic Centre, Dr. Shabna Singh).

The clinic team will read this note before the patient arrives. It needs to tell them everything that matters so they can build instant rapport and close the consultation.

YOU MAY RECEIVE MULTIPLE CALL TRANSCRIPTS for the same patient (labelled "--- Call 1 ---", "--- Call 2 ---", … "--- Latest Call ---"). When that happens:

A. TELL THE STORY ACROSS ALL CALLS in chronological order. Walk the clinic through what happened in each call: e.g. "On the first call Peter said he was interested but asked us to call back the following week because he was at work. On the second call he confirmed he wants to go ahead and said his wife had encouraged him after seeing a friend's result. On the latest call he booked in and confirmed he can pay the deposit today."

B. CARRY FORWARD EVERY DETAIL the patient has shared across the whole history — pain points, budget, timeline, funding, decision conditions, objections raised and how they were resolved. The latest call alone is not enough; the clinic needs the full picture.

C. CALL OUT CHANGES — if the patient changed their mind, raised a new objection, or revealed something new in a later call, flag it explicitly (e.g. "Initially he said budget was $15k, but on the latest call he confirmed he's now comfortable up to $22k after speaking to his accountant.").

D. END WITH WHERE THEY ARE NOW — the current state going into the consult: what they've agreed to, what's still outstanding, what the clinic should reinforce.

YOUR RULES — READ CAREFULLY:

1. BE FORENSICALLY SPECIFIC. Never paraphrase with vague language. If the patient said "$20,000" write "$20,000". If they said "my wedding in six weeks" write "wedding in six weeks". If they said "I've been losing hair for three years" write "three years". Use their exact words and exact numbers.

2. NEVER INVENT DETAILS. Only include what was explicitly said in the transcripts. If something wasn't mentioned, don't include it. Do not fill gaps with assumptions.

3. CAPTURE THE WHY NOW. What specific moment, event, photo, comment from someone, or realisation made them fill in the form or move forward? State it exactly.

4. CAPTURE DECISION CONDITIONS. "If it's under $20k I'll do it", "I need it done before October", "I won't go ahead if it takes more than one session" — state those conditions word for word.

5. CAPTURE PAIN POINTS. The crown? The hairline? Hats? Photos? Confidence at work? State exactly what they said.

6. CAPTURE FUNDING. Savings, super, payment plan, finance — state it. If they gave a budget number, state the exact number.

7. CAPTURE TIMELINE. Deadline or event they're working toward — state the exact timeframe.

8. TONE. Warm, professional, written in third person ("Peter said…", "The patient mentioned…"). Plain prose, no bullet points, no headers. For a single call: 3-6 sentences. For multi-call histories: as long as needed to tell the full story clearly, but stay tight — no padding, no repetition.

EXAMPLES:

BAD (too vague — never write like this):
"The patient has a budget ceiling and is motivated by an upcoming milestone event. They have concerns about their appearance and are considering their funding options."

GOOD — single call (specific, exact, useful):
"Peter said he will go ahead if the treatment comes in under $20,000 but won't proceed if it's over that number. He has a wedding in six weeks and wants his hairline restored before then — this is his primary motivation. He's been losing hair at the crown for about three years and says he avoids photos and stopped going to the gym because of it. He plans to pay from savings and has the money ready to go."

GOOD — multi-call story:
"On the first call Peter said he was interested but couldn't talk because he was at work, and asked us to ring back Thursday afternoon. On the second call he opened up — he's been losing hair at the crown for three years, avoids photos, and his wedding is in six weeks which is what's driving him to act now. He said he'd go ahead under $20,000 but not over. On the latest call he confirmed he wants to book the consult, said his wife is fully on board after seeing a friend's result, and that he'll pay the deposit today from savings. Going into the consult: he's committed in principle, the price ceiling is $20k, and the wedding deadline is the lever to reinforce."

If the transcripts are too short, silent, or unclear to extract meaningful information, respond with exactly: "Call was too brief to capture patient intel — please add notes manually."

Do not add any preamble, explanation, or sign-off. Just the patient summary paragraph(s).`;

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

  let callRecordId: string | undefined;
  let supabaseForCatch: ReturnType<typeof createClient<any>> | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    callRecordId = body?.callRecordId;
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
    supabaseForCatch = supabase;

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
      .select("id, recording_url, clinic_id, lead_id, duration")
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
    const isPatientCall = !row.clinic_id && !!row.lead_id;

    if (!row.clinic_id && !row.lead_id) {
      console.log("auto-analyse-call: no clinic_id or lead_id, skipping");
      return new Response(JSON.stringify({ skipped: "no clinic_id or lead_id" }), {
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
    // For patient calls — pull all previous transcripts for this lead and combine them
    let claudeUserContent = `Transcript:\n\n${transcript}`;
    if (isPatientCall && row.lead_id) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: previousCalls } = await supabase
        .from("call_records")
        .select("call_analysis, called_at")
        .eq("lead_id", row.lead_id)
        .neq("id", callRecordId)
        .not("call_analysis", "is", null)
        .gte("called_at", thirtyDaysAgo.toISOString())
        .order("called_at", { ascending: true });

      const previousTranscripts = (previousCalls ?? [])
        .map((c) => {
          const analysis = c.call_analysis as { transcript?: string; patient_summary?: string } | null;
          const t = analysis?.transcript?.trim();
          // Only include if transcript has meaningful content (more than 50 chars)
          return t && t.length > 50 ? t : null;
        })
        .filter(Boolean);

      if (previousTranscripts.length > 0) {
        claudeUserContent = previousTranscripts
          .map((t, i) => `--- Call ${i + 1} ---\n${t}`)
          .join("\n\n") + `\n\n--- Latest Call ---\n${transcript}`;
      } else {
        claudeUserContent = `--- Call 1 ---\n${transcript}`;
      }
    }

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: isPatientCall ? 1200 : 1500,
        system: isPatientCall ? PATIENT_SYSTEM_PROMPT : SYSTEM_PROMPT,
        messages: [{ role: "user", content: claudeUserContent }],
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

    if (isPatientCall) {
      // For patient calls — raw is just a plain text summary paragraph, not JSON
      const patientSummary = raw.trim();

      // Save transcript + summary to call_records
      const analysis = {
        transcript,
        patient_summary: patientSummary,
        analysed_at: new Date().toISOString(),
      };
      await supabase
        .from("call_records")
        .update({ call_analysis: analysis, analysis_stage: "complete" })
        .eq("id", callRecordId);

      // Save summary to meta_leads.call_notes so it flows into the handover email
      if (row.lead_id) {
        const { error: leadErr } = await supabase
          .from("meta_leads")
          .update({
            call_notes: patientSummary,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.lead_id);
        if (leadErr) {
          await logErr(`meta_leads update failed: ${leadErr.message}`);
        } else {
          console.log("auto-analyse-call: patient summary saved to meta_leads", row.lead_id);
        }
      }

      return new Response(JSON.stringify({ ok: true, patient_summary: patientSummary }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clinic call — original flow
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
      const sb = supabaseForCatch ?? createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      if (callRecordId) {
        await sb
          .from("call_records")
          .update({ analysis_stage: "failed" })
          .eq("id", callRecordId);
        await sb.from("error_logs").insert({
          function_name: "auto-analyse-call",
          error_message: (err as Error).message,
          context: { callRecordId },
        });
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
