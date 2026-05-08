import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const PATIENT_SYSTEM_PROMPT = `You are a patient intake analyst for an Australian hair transplant lead generation business. Your job is to read a sales call transcript and produce a concise patient intel summary that helps the clinic's doctor close the consultation.

This summary will be sent to the clinic BEFORE the patient arrives. The doctor needs to understand who they're meeting, why the patient wants it done, and everything that could help them close the deal.

DO NOT include under any circumstances: how many calls it took, callback scheduling, our marketing process, payment links, deposit amounts or how they paid the deposit, Stripe links, bank transfer details, or anything about our internal sales process. This information is irrelevant to the clinic and must never appear in the output.

DO include everything that helps the clinic close the deal — motivation & urgency, treatment expectations, what they don't want, payment plan needs (NOT deposit details), personal context, hair condition, and a personality read.

OUTPUT FORMAT:
Write in plain flowing paragraphs like a warm handover note from a colleague to the doctor. Do not use bullet points or headers. Be specific with numbers, timeframes and direct quotes where they add colour. Maximum 200 words. No preamble, no sign-off, no mention of our sales process. Just the intel the doctor needs to close the deal.`;

const STRUCTURED_PATIENT_PROMPT = `You are analysing a sales call between a rep and a patient enquiring about a hair transplant. Return a JSON object with exactly these fields:

{
  "no_sale_reasons": ["short 2-4 word themes describing why the person resisted or ended the call — only include if they actually spoke to someone. Do not include 'no answer', 'voicemail', 'not available' or any variation of those. Examples: 'price concern', 'needs more time', 'partner not on board', 'already has clinic', 'bad timing'"],
  "pain_points": ["short 2-4 word themes describing the patient's hair loss frustrations. Examples: 'social confidence', 'avoiding going out', 'affecting relationships', 'work appearance', 'wearing hats daily'"],
  "dream_outcomes": ["short 2-4 word themes for what they want. Examples: 'natural looking result', 'regain confidence', 'full coverage', 'before wedding', 'permanent solution'"],
  "recurring_phrases": ["only meaningful phrases the patient repeated or emphasised — exclude filler words like 'yeah yeah', 'sort of', 'kind of', 'you know'. Only include phrases that reveal something about their mindset or concerns"],
  "engagement_hooks": ["short 2-4 word themes for what kept them talking. Examples: 'before after photos', 'payment plan discussion', 'natural results explanation', 'recovery timeline', 'guarantee mentioned'"],
  "call_outcome": one of ["Booked", "Not Interested", "No Answer", "Needs Follow Up", "Callback Scheduled"]
}

IMPORTANT:
- Use consistent short theme labels so similar ideas group together across calls
- no_sale_reasons must be empty array if the call was not answered or went to voicemail
- Each no_sale_reason must be a generic theme of 2-4 words maximum. Never include specific times, dates, clinic names, dollar amounts, or one-off details. Wrong: 'Cannot commit to next Saturday 10:45am slot'. Right: 'scheduling conflict'. Wrong: 'Previous negative experience with Advanced Hair Clinic spending $6-7k'. Right: 'previous bad experience'.
- Return only valid JSON, no preamble`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TIME_TOKENS = /\b(am|pm|a\.m\.|p\.m\.|o'clock|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|today|tomorrow|yesterday|morning|afternoon|evening|tonight|next|last|this)\b/g;
const NO_SALE_OUTCOME_BLOCK = ["not available", "call back", "no answer", "voicemail", "not reachable", "couldn't talk", "couldnt talk"];

function cleanString(s: string): string {
  let v = String(s || "").toLowerCase().trim();
  v = v.replace(/\([^)]*\)/g, " "); // strip parentheses content
  v = v.replace(/\$[\d,.]+(?:k|m)?/g, " "); // dollar amounts
  v = v.replace(/[\d]+[\d,.\-:]*/g, " "); // any remaining numbers / ranges / times
  v = v.replace(TIME_TOKENS, " ");
  v = v.replace(/[^\w\s'-]/g, " "); // strip punctuation except apostrophes/hyphens
  v = v.replace(/\s+/g, " ").trim();
  const words = v.split(" ").filter(Boolean).slice(0, 4);
  return words.join(" ");
}

function cleanArray(arr: unknown, opts?: { extraBlocklist?: string[] }): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const item of arr) {
    if (typeof item !== "string") continue;
    const cleaned = cleanString(item);
    if (!cleaned) continue;
    if (cleaned.split(" ").length < 2) continue; // drop single-word
    if (opts?.extraBlocklist) {
      const lc = cleaned.toLowerCase();
      const original = item.toLowerCase();
      if (opts.extraBlocklist.some((b) => lc.includes(b) || original.includes(b))) continue;
    }
    out.push(cleaned);
  }
  return out;
}

function cleanStructured(s: Record<string, unknown>): Record<string, unknown> {
  return {
    ...s,
    no_sale_reasons: cleanArray(s.no_sale_reasons, { extraBlocklist: NO_SALE_OUTCOME_BLOCK }),
    pain_points: cleanArray(s.pain_points),
    dream_outcomes: cleanArray(s.dream_outcomes),
    recurring_phrases: cleanArray(s.recurring_phrases),
    engagement_hooks: cleanArray(s.engagement_hooks),
  };
}

async function callClaude(apiKey: string, system: string, userContent: string): Promise<string> {
  // Retry on 429 / 529 with backoff
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (resp.ok) {
      const j = await resp.json();
      let raw: string = j?.content?.[0]?.text || "";
      raw = raw.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      }
      return raw;
    }

    if ((resp.status === 429 || resp.status === 529 || resp.status >= 500) && attempt < maxAttempts) {
      const retryAfter = parseFloat(resp.headers.get("retry-after") || "0");
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 5000 * attempt);
      console.log(`[claude] ${resp.status} attempt ${attempt}, waiting ${waitMs}ms`);
      await sleep(waitMs);
      continue;
    }

    const t = await resp.text();
    throw new Error(`Claude failed (${resp.status}): ${t.slice(0, 300)}`);
  }
  throw new Error("Claude failed: exhausted retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    let body: { max?: number; force?: boolean } = {};
    try { body = await req.json(); } catch { /* no body */ }
    const MAX_PER_RUN = Math.max(1, Math.min(40, body.max ?? 20));
    const FORCE = body.force === true;

    const { data: rows, error } = await supabase
      .from("call_records")
      .select("id, lead_id, call_analysis")
      .is("clinic_id", null)
      .not("lead_id", "is", null)
      .not("recording_url", "is", null);

    if (error) throw new Error(`Lookup failed: ${error.message}`);

    // Rows with a real transcript. When force=true, re-run on every analysed row.
    const candidates = (rows ?? []).filter((r) => {
      const a = r.call_analysis as { transcript?: string; patient_summary?: string } | null;
      const hasTranscript = !!a?.transcript && a.transcript.trim().length > 30;
      if (!hasTranscript) return false;
      if (FORCE) return true;
      const alreadyDone = !!a?.patient_summary && (a.patient_summary as string).trim().length > 0;
      return !alreadyDone;
    });

    const remainingBefore = candidates.length;
    const work = candidates.slice(0, MAX_PER_RUN);

    let processed = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Sequential processing — Anthropic org limit is 50 RPM.
    // Each row = 2 Claude calls. ~1.6s spacing between calls keeps us under the limit.
    for (const row of work) {
      try {
        const analysis = (row.call_analysis ?? {}) as Record<string, unknown>;
        const transcript = (analysis.transcript as string) || "";
        const userContent = `Transcript:\n\n${transcript}`;

        const summaryRaw = await callClaude(ANTHROPIC_API_KEY, PATIENT_SYSTEM_PROMPT, userContent);
        await sleep(1600);
        const structRaw = await callClaude(ANTHROPIC_API_KEY, STRUCTURED_PATIENT_PROMPT, userContent);

        const patientSummary = summaryRaw.trim();
        let structured: Record<string, unknown> = {
          no_sale_reasons: [],
          pain_points: [],
          dream_outcomes: [],
          recurring_phrases: [],
          engagement_hooks: [],
          call_outcome: null,
        };
        try {
          structured = { ...structured, ...JSON.parse(structRaw) };
        } catch (_e) {
          // keep defaults if Claude returned non-JSON
        }

        const newAnalysis = {
          ...analysis,
          transcript,
          patient_summary: patientSummary,
          ...structured,
          analysed_at: new Date().toISOString(),
        };

        const { error: updErr } = await supabase
          .from("call_records")
          .update({ call_analysis: newAnalysis, analysis_stage: "complete" })
          .eq("id", row.id);
        if (updErr) throw new Error(`update call_records: ${updErr.message}`);

        if (row.lead_id) {
          await supabase
            .from("meta_leads")
            .update({ call_notes: patientSummary, updated_at: new Date().toISOString() })
            .eq("id", row.lead_id);
        }

        processed += 1;
      } catch (e) {
        failed += 1;
        const msg = (e as Error).message;
        console.error(`[backfill] row ${row.id} failed:`, msg);
        errors.push({ id: row.id, error: msg });
      }

      // Pace between rows too
      await sleep(1600);
    }

    const remainingAfter = remainingBefore - processed;

    return new Response(
      JSON.stringify({
        ok: true,
        total_remaining_before: remainingBefore,
        total_remaining_after: remainingAfter,
        processed,
        failed,
        done: remainingAfter === 0,
        errors: errors.slice(0, 20),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("backfill-patient-analysis error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
