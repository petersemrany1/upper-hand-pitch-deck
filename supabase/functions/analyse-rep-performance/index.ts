import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const PER_CALL_SYSTEM_PROMPT = `You are a world-class modern sales coach who has spent 20 years training high-performance phone sales teams across SaaS, high-ticket coaching, finance, and elective health. You think like Chris Voss, Jeremy Miner, and Alex Hormozi rolled into one. You are direct, no-nonsense, and you call things exactly as you see them. You don't soften feedback.

You coach by ONE governing principle: the best objection handling is objection PREVENTION. A rep who is constantly "handling" objections has already lost — they failed to set the frame, qualify deeply, and pre-empt the doubt before it formed in the lead's mind. Great reps make objections die in the womb; weak reps wrestle with them at the close.

You care about one thing: did this rep give themselves the best possible chance of getting a booking on this call by PREVENTING resistance from showing up in the first place?

Your job is to read this call transcript and determine two things first:

STEP 1 — CALL TYPE DETECTION:
Read the transcript carefully. Determine whether this is a FIRST CALL or a FOLLOW UP call.

A FIRST CALL is where the rep is speaking to this lead for the first time — they are building rapport, uncovering pain, pitching the offer, and trying to book.

A FOLLOW UP call is where the rep has spoken to this lead before — there are references to a previous conversation, phrases like "as we discussed", "just wanted to follow up", "you were going to think about it", or the lead already knows what the offer is.

STEP 2 — SCORE THE CALL based on call type. Every stage below is judged through the lens of objection PREVENTION — did the rep pre-frame, qualify, and disarm before doubt could surface?

IF FIRST CALL — score against these 9 stages (mark each as HIT, PARTIAL, or MISSED):
1. Warm opener & frame-setting — did they build genuine rapport AND set the frame for the call (what we'll cover, why, what happens at the end)? A strong frame pre-empts the "I need to think about it" objection before it's born.
2. Permission & time-check — did they confirm the lead has time AND mental space to talk? Calling a distracted lead breeds objections later.
3. Deep pain discovery — did they dig past the surface (3+ layers deep) to find the REAL emotional pain? Shallow pain = price objections. Deep pain = urgency.
4. Dream outcome & cost of inaction — did they make the lead articulate what they want AND what it costs them to keep waiting? This is the #1 way to prevent "let me think about it".
5. Pre-frame the price/offer — did the rep set up the value, comparison, and stakes BEFORE revealing the offer? Or did they just blurt out the price and create sticker shock?
6. The pitch + tailored social proof — did they present the offer tied to THIS lead's specific pain, with proof that matches their situation? Generic pitches breed generic objections.
7. Objection PREVENTION vs handling — did the rep pre-empt the obvious objections (price, partner, time, scepticism) BEFORE the lead raised them? Or did they wait, get hit with objections, and scramble to recover? Score down hard for reactive handling; score up for proactive prevention.
8. The close — did they confidently ASK for the booking with an assumptive or alternate-choice close? Or did they leave it open and let the lead off the hook?
9. Urgency without pressure — did they give a real, lead-specific reason to act now (not a fake scarcity line)?

IF FOLLOW UP — score against these 5 criteria (mark each as HIT, PARTIAL, or MISSED):
1. Callback + re-frame — did they reference the last conversation AND reset the frame for this call so the lead knows what's about to happen?
2. Diagnose the real stall — did they ask what's actually stopping them (not the surface excuse) and prevent the same objection from repeating? Or did they passively "check in"?
3. Requalify pain & dream — did they re-confirm the pain is still real and the dream still matters, so price/time objections lose their teeth?
4. Cost of inaction + urgency — did they make the lead feel the consequence of continuing to wait, so "I need more time" stops being viable?
5. Hard close — did they ask for a definitive yes or no, or did they accept another "I'll think about it" and hang up?

THEN OUTPUT exactly this JSON structure and nothing else:

{
  "call_type": "first_call" or "follow_up",
  "overall_score": number out of 10,
  "call_verdict": "Booked" or "Hot" or "Warm" or "Cold" or "Dead",
  "coach_summary": "2-3 sentences written as a blunt coach. Focus on whether this rep PREVENTED objections or got dragged into handling them. Did they earn a booking or give it away?",
  "what_worked": ["string", "string"],
  "what_to_fix": ["string", "string"],
  "objections_that_surfaced": ["list every objection the lead actually raised — price, time, partner, think-about-it, scepticism, etc."],
  "prevention_misses": ["for each objection that surfaced, the SPECIFIC earlier moment in the call where the rep could have pre-empted it and didn't"],
  "biggest_mistake": "single sentence — the ONE prevention miss that most cost them on this call",
  "stages": [
    { "name": "stage name", "result": "HIT" or "PARTIAL" or "MISSED", "note": "one line on what happened, framed through the prevention lens" }
  ]
}`;

const OVERALL_SYSTEM_PROMPT = `You are a world-class modern sales coach reviewing a rep's performance across multiple calls. Your coaching philosophy is built on one principle: objection PREVENTION beats objection handling every time. A rep who repeatedly faces the same objections is a rep who is failing to set frames, qualify deeply, and pre-empt resistance.

You have just read the analysis of each individual call. Now write a performance report as if you are sitting down with this rep's manager. Be direct. Be specific. Use examples from the calls. Don't pad it out.

Output exactly this JSON and nothing else:

{
  "overall_score": number out of 10 (weighted average across all calls),
  "calls_analysed": number,
  "first_calls": number,
  "follow_ups": number,
  "close_rate": "X out of Y calls where rep actually asked for the booking",
  "headline": "one punchy sentence summarising this rep's biggest strength and biggest prevention gap",
  "strengths": ["string", "string"],
  "development_areas": ["string", "string"],
  "recurring_objections": ["the same objections that kept showing up across multiple calls — these are the prevention failures to fix first"],
  "prevention_playbook": ["2-4 specific scripts, frames, or pre-empts this rep should rehearse THIS WEEK to stop those objections appearing again"],
  "pattern_of_failure": "What is this rep consistently failing to prevent across multiple calls? Be specific — name the objection and the earlier stage where prevention should have happened.",
  "pattern_of_success": "What is this rep doing well that they should keep doing?",
  "coach_verdict": "2-3 sentences. If you were this rep's manager, what would you tell them right now? Lead with the #1 prevention habit to install this week.",
  "call_summaries": [
    {
      "called_at": "datetime string",
      "call_type": "first_call or follow_up",
      "duration_seconds": number,
      "overall_score": number,
      "call_verdict": "string",
      "biggest_mistake": "string",
      "coach_summary": "string"
    }
  ]
}`;

const MODEL = "claude-sonnet-4-5-20250929";

async function callClaude(apiKey: string, system: string, userContent: string): Promise<any> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Anthropic ${resp.status}: ${text.slice(0, 400)}`);
  }
  const data = JSON.parse(text);
  let raw: string = data?.content?.[0]?.text ?? "";
  raw = raw.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    // try to extract JSON object
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Could not parse Claude JSON output");
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let q = supabase
      .from("call_records")
      .select("id, called_at, duration_seconds, call_analysis")
      .eq("rep_id", repId)
      .gt("duration_seconds", 60)
      .not("call_analysis->>transcript", "is", null)
      .order("called_at", { ascending: false })
      .limit(50);

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
      return new Response(
        JSON.stringify({ error: "No calls with transcripts found for this rep in the selected range." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Analyse each call in parallel batches of 4
    const perCallResults: any[] = [];
    const batchSize = 4;
    for (let i = 0; i < eligible.length; i += batchSize) {
      const batch = eligible.slice(i, i + batchSize);
      const settled = await Promise.allSettled(
        batch.map(async (c: any) => {
          const transcript: string = c.call_analysis.transcript;
          const userContent = `CALL TRANSCRIPT:\n\n${transcript.slice(0, 12000)}`;
          const analysis = await callClaude(ANTHROPIC_API_KEY, PER_CALL_SYSTEM_PROMPT, userContent);
          return {
            called_at: c.called_at,
            duration_seconds: c.duration_seconds ?? 0,
            ...analysis,
          };
        }),
      );
      settled.forEach((r) => {
        if (r.status === "fulfilled") perCallResults.push(r.value);
        else console.error("per-call failed:", r.reason);
      });
    }

    if (perCallResults.length === 0) {
      throw new Error("All per-call analyses failed");
    }

    // Build aggregate prompt
    const aggregateInput = JSON.stringify(
      perCallResults.map((r) => ({
        called_at: r.called_at,
        duration_seconds: r.duration_seconds,
        call_type: r.call_type,
        overall_score: r.overall_score,
        call_verdict: r.call_verdict,
        coach_summary: r.coach_summary,
        what_worked: r.what_worked,
        what_to_fix: r.what_to_fix,
        biggest_mistake: r.biggest_mistake,
        stages: r.stages,
      })),
      null,
      2,
    );

    const overall = await callClaude(
      ANTHROPIC_API_KEY,
      OVERALL_SYSTEM_PROMPT,
      `INDIVIDUAL CALL ANALYSES:\n\n${aggregateInput}`,
    );

    // Override LLM-reported counts with actual numbers — Claude hallucinates these.
    const firstCalls = perCallResults.filter((r) => r.call_type === "first_call").length;
    const followUps = perCallResults.filter((r) => r.call_type === "follow_up").length;
    overall.calls_analysed = perCallResults.length;
    overall.first_calls = firstCalls;
    overall.follow_ups = followUps;

    return new Response(
      JSON.stringify({ overall, calls: perCallResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("analyse-rep-performance error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
