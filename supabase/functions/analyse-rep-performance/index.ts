import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const PER_CALL_SYSTEM_PROMPT = `You are a world-class modern sales coach (Chris Voss + Jeremy Miner + Alex Hormozi). You coach by ONE principle: the best objection handling is objection PREVENTION. Reactive objection handling = the rep already lost. Great reps make objections die in the womb.

You will receive ONE call transcript. Do two things.

STEP 1 — CALL TYPE DETECTION: FIRST CALL (first contact, discovery + pitch + booking attempt) or FOLLOW UP (rep references a previous conversation).

STEP 2 — SCORE through the lens of objection PREVENTION.

IF FIRST CALL — score 9 stages (HIT / PARTIAL / MISSED):
1. Warm opener & frame-setting
2. Permission & time-check
3. Deep pain discovery (3+ layers)
4. Dream outcome & cost of inaction
5. Pre-frame the price/offer
6. Pitch + tailored social proof
7. Objection PREVENTION vs handling
8. The close (assumptive / alternate-choice)
9. Urgency without pressure

IF FOLLOW UP — score 5 stages (HIT / PARTIAL / MISSED):
1. Callback + re-frame
2. Diagnose the real stall
3. Requalify pain & dream
4. Cost of inaction + urgency
5. Hard close

HARD LIMITS (to keep JSON valid and compact — exceeding these will break the output):
- Every string field: max 160 chars.
- what_worked: exactly 2 items, each ≤80 chars.
- what_to_fix: exactly 2 items, each ≤80 chars.
- objections_that_surfaced: max 4 items, each ≤30 chars (one-word labels: price, time, partner, trust, pain_level, etc.).
- prevention_misses: max 3 items, each ≤120 chars.
- stages: exactly 9 items for first_call, exactly 5 for follow_up. Each "note" ≤80 chars.

Return ONLY this minified JSON and nothing else. No markdown fences, no commentary:

{
  "call_type": "first_call" | "follow_up",
  "overall_score": number 0-10,
  "call_verdict": "Booked" | "Hot" | "Warm" | "Cold" | "Dead",
  "coach_summary": "≤160 chars",
  "biggest_mistake": "≤120 chars",
  "what_worked": ["≤80 chars", "≤80 chars"],
  "what_to_fix": ["≤80 chars", "≤80 chars"],
  "objections_that_surfaced": ["≤30 chars", "..."],
  "prevention_misses": ["≤120 chars", "..."],
  "stages": [{ "name": "stage name", "result": "HIT|PARTIAL|MISSED", "note": "≤80 chars" }]
}`;

const OVERALL_SYSTEM_PROMPT = `You are a world-class modern sales coach reviewing a rep's performance across many calls. Your philosophy: objection PREVENTION beats objection handling. A rep who repeatedly faces the same objections is failing to set frames, qualify deeply, and pre-empt resistance.

You will receive COMPACT SUMMARIES of every call (not full transcripts) — verdicts, biggest mistakes, objections that surfaced, and prevention misses per call. Synthesise across the whole sample.

Be direct. Use examples from the calls. Don't pad.

Return ONLY this minified JSON:

{
  "overall_score": number 0-10 (weighted average),
  "close_rate": "X out of Y calls where rep actually asked for the booking",
  "headline": "one punchy sentence — biggest strength + biggest prevention gap",
  "strengths": ["string", "string"],
  "development_areas": ["string", "string"],
  "recurring_objections": ["objections that kept showing up across multiple calls"],
  "prevention_playbook": ["2-4 specific scripts/frames/pre-empts to rehearse THIS WEEK"],
  "pattern_of_failure": "What this rep consistently fails to prevent — name the objection AND the earlier stage where prevention should have happened.",
  "pattern_of_success": "What this rep is doing well that they should keep doing.",
  "coach_verdict": "2-3 sentences. If you were this rep's manager, what would you tell them right now? Lead with the #1 prevention habit to install this week."
}`;

const MODEL = "claude-haiku-4-5-20251001";
const TRANSCRIPT_CHAR_LIMIT = 2400;
const BATCH_SIZE = 5; // parallel Claude calls; tuned for Anthropic 8k ITPM/OTPM headroom
const PER_CALL_MAX_TOKENS = 2000;
const OVERALL_MAX_TOKENS = 2000;

async function callClaude(apiKey: string, system: string, userContent: string, maxTokens: number): Promise<any> {
  let attempt = 0;
  // Retry on 429 / 529 with simple backoff
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90s hard timeout per call
    let resp: Response;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: userContent }],
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt > 3) throw new Error(`Anthropic fetch failed after ${attempt} attempts: ${(err as Error).message}`);
      console.log(`Anthropic fetch error, retry ${attempt}: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    clearTimeout(timeoutId);
    const text = await resp.text();
    if (resp.status === 429 || resp.status === 529) {
      if (attempt > 4) throw new Error(`Anthropic ${resp.status} after ${attempt} attempts: ${text.slice(0, 200)}`);
      const wait = 2000 * attempt;
      console.log(`Anthropic ${resp.status}, backing off ${wait}ms (attempt ${attempt})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${text.slice(0, 400)}`);
    const data = JSON.parse(text);
    let raw: string = data?.content?.[0]?.text ?? "";
    raw = raw.trim();
    if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error("Could not parse Claude JSON output");
    }
  }
}

async function processJob(jobId: string, repId: string, dateFrom: string | null, dateTo: string | null) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const update = async (patch: Record<string, unknown>) => {
    await supabase.from("rep_performance_jobs").update(patch).eq("id", jobId);
  };

  try {
    let q = supabase
      .from("call_records")
      .select("id, called_at, duration_seconds, call_analysis")
      .eq("rep_id", repId)
      .gt("duration_seconds", 60)
      .not("call_analysis->>transcript", "is", null)
      .order("called_at", { ascending: false });

    if (dateFrom) q = q.gte("called_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("called_at", end.toISOString());
    }

    const { data: calls, error } = await q;
    if (error) throw error;

    const eligible = (calls ?? []).filter((c: any) => {
      const t = c?.call_analysis?.transcript;
      return typeof t === "string" && t.trim().length > 50;
    });

    if (eligible.length === 0) {
      await update({ status: "failed", error: "No calls with transcripts found for this rep in the selected range." });
      return;
    }

    await update({ status: "running", total_eligible: eligible.length, calls_completed: 0 });
    console.log(`Job ${jobId}: processing ${eligible.length} calls`);

    const summaries: any[] = [];
    let completed = 0;

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (c: any) => {
          try {
            const transcript: string = c.call_analysis.transcript;
            const userContent = [
              `called_at: ${c.called_at}`,
              `duration_seconds: ${c.duration_seconds ?? 0}`,
              "",
              "TRANSCRIPT:",
              transcript.slice(0, TRANSCRIPT_CHAR_LIMIT),
            ].join("\n");
            const r = await callClaude(ANTHROPIC_API_KEY, PER_CALL_SYSTEM_PROMPT, userContent, PER_CALL_MAX_TOKENS);
            const allowed = new Set(["Booked", "Hot", "Warm", "Cold", "Dead"]);
            return {
              call_id: c.id,
              called_at: c.called_at,
              duration_seconds: c.duration_seconds ?? 0,
              call_type: r.call_type === "follow_up" ? "follow_up" : "first_call",
              overall_score: typeof r.overall_score === "number" ? r.overall_score : 0,
              call_verdict: allowed.has(r.call_verdict) ? r.call_verdict : "Cold",
              coach_summary: r.coach_summary ?? "",
              biggest_mistake: r.biggest_mistake ?? "",
              what_worked: Array.isArray(r.what_worked) ? r.what_worked : [],
              what_to_fix: Array.isArray(r.what_to_fix) ? r.what_to_fix : [],
              objections_that_surfaced: Array.isArray(r.objections_that_surfaced) ? r.objections_that_surfaced : [],
              prevention_misses: Array.isArray(r.prevention_misses) ? r.prevention_misses : [],
              stages: Array.isArray(r.stages) ? r.stages : [],
            };
          } catch (err) {
            console.error(`Per-call failed for ${c.id}:`, (err as Error).message);
            return null;
          }
        }),
      );
      for (const r of results) if (r) summaries.push(r);
      completed += batch.length;
      await update({ calls_completed: completed, call_summaries: summaries });
    }

    if (summaries.length === 0) {
      await update({ status: "failed", error: "Every per-call analysis failed." });
      return;
    }

    // Build compact aggregate input for the synthesis pass
    const aggregateInput = summaries.map((s, i) => [
      `CALL ${i + 1} — ${s.called_at} — ${s.call_type} — ${Math.floor(s.duration_seconds / 60)}m${s.duration_seconds % 60}s`,
      `verdict: ${s.call_verdict}  score: ${s.overall_score}/10`,
      `biggest_mistake: ${s.biggest_mistake}`,
      `coach: ${s.coach_summary}`,
      `objections: ${s.objections_that_surfaced.join("; ") || "none"}`,
      `prevention_misses: ${s.prevention_misses.join("; ") || "none"}`,
    ].join("\n")).join("\n\n");

    const firstCalls = summaries.filter((s) => s.call_type === "first_call").length;
    const followUps = summaries.filter((s) => s.call_type === "follow_up").length;
    const callSummariesOut = summaries.map((s) => ({
      called_at: s.called_at,
      call_type: s.call_type,
      duration_seconds: s.duration_seconds,
      overall_score: s.overall_score,
      call_verdict: s.call_verdict,
      biggest_mistake: s.biggest_mistake,
      coach_summary: s.coach_summary,
    }));

    let overall: any = null;
    try {
      overall = await callClaude(
        ANTHROPIC_API_KEY,
        OVERALL_SYSTEM_PROMPT,
        `REP CALL SUMMARIES (${summaries.length} calls):\n\n${aggregateInput}`,
        OVERALL_MAX_TOKENS,
      );
    } catch (err) {
      console.error(`Job ${jobId}: synthesis failed, building fallback:`, (err as Error).message);
    }

    // Always produce a usable report. If synthesis failed, derive a minimal one from per-call data.
    if (!overall) {
      const avg = summaries.reduce((a, s) => a + (s.overall_score || 0), 0) / summaries.length;
      const allObjections = summaries.flatMap((s) => s.objections_that_surfaced || []);
      const counts = new Map<string, number>();
      for (const o of allObjections) {
        const k = String(o).toLowerCase().trim();
        if (k) counts.set(k, (counts.get(k) || 0) + 1);
      }
      const recurring = [...counts.entries()]
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, c]) => `${k} (${c}×)`);
      overall = {
        overall_score: Math.round(avg * 10) / 10,
        close_rate: `${summaries.filter((s) => s.call_verdict === "Booked").length} out of ${summaries.length}`,
        headline: "Per-call analysis complete. Final synthesis was unavailable — review the call-by-call breakdown below.",
        strengths: [],
        development_areas: [],
        recurring_objections: recurring,
        prevention_playbook: [],
        pattern_of_failure: "Synthesis pass timed out. Look at the recurring objections and per-call mistakes for the pattern.",
        pattern_of_success: "See per-call notes below for what's working.",
        coach_verdict: "Synthesis pass was unavailable for this run. Each call was scored individually — review the call-by-call breakdown to identify the rep's biggest leaks.",
      };
    }

    const report = {
      ...overall,
      calls_analysed: summaries.length,
      first_calls: firstCalls,
      follow_ups: followUps,
      call_summaries: callSummariesOut,
    };

    await update({ status: "completed", report, call_summaries: summaries });
    console.log(`Job ${jobId}: completed`);
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);
    await update({ status: "failed", error: (err as Error).message || "Unknown error" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const { repId, dateFrom, dateTo } = await req.json();
    if (!repId) {
      return new Response(JSON.stringify({ error: "repId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: job, error } = await supabase
      .from("rep_performance_jobs")
      .insert({
        rep_id: repId,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        status: "queued",
      })
      .select("id")
      .single();
    if (error) throw error;

    // Fire and forget — the Edge runtime keeps the worker alive
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(processJob(job.id, repId, dateFrom || null, dateTo || null));

    return new Response(JSON.stringify({ jobId: job.id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyse-rep-performance error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
