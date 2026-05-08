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

const STRUCTURED_PATIENT_PROMPT = `You are analysing a sales call between a rep and a patient enquiring about a hair transplant. Return a JSON object with exactly these fields. For every field you must ONLY use items from the fixed lists provided below. Do not invent your own wording. Pick the closest matching items from the list. Return only valid JSON, no preamble.

{
  "no_sale_reasons": pick any that apply from this list only — if the call was not answered or lasted under 30 seconds return an empty array:
  ["price too high", "didn't expect the cost", "needs payment plan", "payment plan terms don't work", "wants to save up first", "spent money on other treatments", "partner controls finances", "financial difficulty", "recent big expense", "comparing prices with other clinics", "cheaper overseas", "called at bad time", "too busy with work", "going on holiday soon", "big event coming up", "wants to lose weight first", "waiting for life event", "not ready mentally", "needs more time to think", "needs more research", "wasn't expecting a call", "needs to discuss with partner", "partner doesn't know they enquired", "partner is against it", "partner wants to attend consultation", "family thinks it's unnecessary", "worried what others will think", "doesn't want anyone to know", "booked with another clinic", "had consultation elsewhere", "going overseas for it", "knows someone with a clinic", "already on a waiting list", "considering second procedure elsewhere", "doesn't know who we are", "wants more before and after photos", "wants to read more reviews", "had bad experience at another clinic", "worried results won't look natural", "doesn't trust recommended clinic", "wants to speak to someone who has had it done", "seen bad results on someone they know", "worried about scams", "wants to verify surgeon credentials", "not sure if they're a candidate", "not enough donor hair", "health condition may prevent it", "on medication affecting eligibility", "worried about pain", "worried about scarring", "concerned about recovery period", "can't take time off work to recover", "worried it will be obvious", "anxious about medical procedures", "wants doctor consultation first", "bad reaction to anaesthetic before", "health condition affecting healing", "clinic too far away", "can't drive after procedure", "no one to take them", "can't get time off work", "public facing job", "works outdoors", "has young kids", "recovery clashes with event", "can't make appointment times", "lives interstate", "doesn't understand how it works", "confused about technique", "worried about graft count", "doesn't believe it's permanent", "thinks it will look fake", "seen bad transplants on others", "thinks too young or too old", "wants to try medication first", "doesn't want to shave head", "worried about shock loss"],

  "pain_points": pick any that apply from this list only:
  ["too embarrassed to go out", "avoiding social events", "won't go swimming or to beach", "avoids photos and camera", "doesn't want to be in videos", "affecting romantic relationships", "struggling with dating", "lost confidence at work", "feels older than their age", "feels like a different person", "depressed or anxious about hair loss", "obsessing over it daily", "comparing themselves to others", "avoiding mirrors", "crown thinning", "hairline receding at temples", "overall thinning on top", "bald spot visible from behind", "hair loss getting worse every year", "hiding it with styling but can't anymore", "wearing hats every day", "previous transplant has faded", "lost hair after illness or medication", "patchy or uneven hair loss", "scalp visible in sunlight", "used rogaine no results", "tried finasteride stopped due to side effects", "had prp minimal improvement", "tried hair fibres and concealers", "spent thousands on failed treatments", "dealing with it for over 5 years", "started losing hair very young", "family history of severe baldness", "bad results from overseas treatment"],

  "dream_outcomes": pick any that apply from this list only:
  ["natural looking result", "undetectable result", "full coverage on top", "hairline restored", "temples filled in", "crown covered", "dense enough to style freely", "can get haircut without anyone noticing", "looks good wet and dry", "regain confidence socially", "go to beach without a hat", "be in photos without anxiety", "feel comfortable dating again", "stop thinking about hair loss", "feel like themselves again", "look younger", "go to barber without embarrassment", "permanent solution", "quick recovery", "no one notices during recovery", "done in one day", "minimal scarring", "good graft survival", "before a specific event", "while still young", "partner is supportive", "payment plan fits budget"],

  "engagement_hooks": pick any that apply from this list only:
  ["before after photos", "natural looking results on similar hair type", "surgeon credentials", "graft count explanation", "graft survival rate", "done in one day", "recovery shorter than expected", "quick return to work", "no full shave required", "free consultation", "guarantee mentioned", "fue vs dhi explanation", "relatable success story", "rep acknowledged their struggle", "validated how it affects their life", "partner got involved", "patient asked detailed questions", "patient mentioned specific event", "patient compared us to overseas", "been thinking about it for years", "trusts the process after explanation", "excited about free consultation", "responded well to pay per show explanation"],

  "recurring_phrases": pick any that apply from this list only — only include if the patient clearly repeated or emphasised this topic:
  ["natural looking", "payment plan", "crown area", "confidence", "hat every day", "overseas option", "too expensive", "needs to think", "partner approval", "recovery time", "looks fake", "been years", "want it permanent", "not sure if candidate", "wants proof", "before after photos", "free consultation", "one day procedure"],

  "call_outcome": pick exactly one: "Booked" | "Not Interested" | "No Answer" | "Needs Follow Up" | "Callback Scheduled"
}

IMPORTANT RULES:
- You MUST only use the exact wording from the lists above. No paraphrasing. No new items.
- If the call was not answered or lasted under 30 seconds, no_sale_reasons must be an empty array.
- Pick as many items as genuinely apply. Do not force items that were not mentioned.
- Return only valid JSON. No preamble.`;

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

async function callClaude(
  apiKey: string,
  system: string,
  userContent: string,
  opts: { deadlineMs?: number } = {},
): Promise<string> {
  // Retry on 429 / 529 with backoff
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs - 15000) {
      throw new Error("Backfill time budget reached; retry next batch.");
    }
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
      const baseWaitMs = retryAfter > 0 ? retryAfter * 1000 : 5000 * attempt;
      const deadlineWaitMs = opts.deadlineMs ? Math.max(0, opts.deadlineMs - Date.now() - 15000) : 15000;
      const waitMs = Math.min(baseWaitMs, 15000, deadlineWaitMs);
      if (waitMs < 1000) throw new Error("Backfill time budget reached; retry next batch.");
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

        structured = cleanStructured(structured);

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
