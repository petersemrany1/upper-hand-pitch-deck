import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const PER_CALL_SYSTEM_PROMPT = `You are a senior sales coach who has spent 20 years training high-performance phone sales teams. You are direct, no-nonsense, and you call things exactly as you see them. You don't soften feedback. You care about one thing: did this rep give themselves the best possible chance of getting a booking on this call?

Your job is to read this call transcript and determine two things first:

STEP 1 — CALL TYPE DETECTION:
Read the transcript carefully. Determine whether this is a FIRST CALL or a FOLLOW UP call.

A FIRST CALL is where the rep is speaking to this lead for the first time — they are building rapport, uncovering pain, pitching the offer, and trying to book.

A FOLLOW UP call is where the rep has spoken to this lead before — there are references to a previous conversation, phrases like "as we discussed", "just wanted to follow up", "you were going to think about it", or the lead already knows what the offer is.

STEP 2 — SCORE THE CALL based on call type:

IF FIRST CALL — score against these 9 stages (mark each as HIT, PARTIAL, or MISSED):
1. Warm opener — did they build rapport naturally before going into the pitch?
2. Permission to continue — did they confirm the lead is still interested and has time to talk?
3. Pain discovery — did they uncover what's bothering the lead about their hair loss? Did they dig deep or stay surface level?
4. Dream outcome — did they get the lead to articulate what they actually want? Did they make it emotional?
5. The pitch — did they present the offer clearly and connect it back to the lead's pain and dream?
6. Social proof — did they use results, stories, or numbers to build credibility?
7. Objection handling — did any objections come up? How did they handle them? Did they fold or push through?
8. The close — did they actually ASK for the booking? Or did they leave it open and let the lead off the hook?
9. Urgency — did they give the lead a reason to act now rather than think about it?

IF FOLLOW UP — score against these 5 criteria (mark each as HIT, PARTIAL, or MISSED):
1. Callback to last conversation — did they reference what was discussed last time and why the lead was interested?
2. Address the stall — did they directly address why the lead hadn't committed yet, or did they just "check in" passively?
3. Requalify — did they re-confirm the lead's pain and desire, or did they assume it was still there?
4. Urgency and consequence — did they create a reason to move now? Did they highlight what happens if they keep waiting?
5. Hard close — did they ask for a definitive yes or no? Or did they accept another "I'll think about it" and hang up?

THEN OUTPUT exactly this JSON structure and nothing else:

{
  "call_type": "first_call" or "follow_up",
  "overall_score": number out of 10,
  "call_verdict": "Booked" or "Hot" or "Warm" or "Cold" or "Dead",
  "coach_summary": "2-3 sentences written as a blunt coach giving their read on this call. What did the rep actually do? Did they earn a booking or give it away?",
  "what_worked": ["string", "string"],
  "what_to_fix": ["string", "string"],
  "biggest_mistake": "single sentence — the ONE thing that most cost them on this call",
  "stages": [
    { "name": "stage name", "result": "HIT" or "PARTIAL" or "MISSED", "note": "one line on what happened" }
  ]
}`;

const OVERALL_SYSTEM_PROMPT = `You are a senior sales coach reviewing a rep's performance across multiple calls. You have just read the analysis of each individual call. Now write a performance report as if you are sitting down with this rep's manager.

Be direct. Be specific. Use examples from the calls where possible. Don't pad it out.

Output exactly this JSON and nothing else:

{
  "overall_score": number out of 10 (weighted average across all calls),
  "calls_analysed": number,
  "first_calls": number,
  "follow_ups": number,
  "close_rate": "X out of Y calls where rep actually asked for the booking",
  "headline": "one punchy sentence summarising this rep's biggest strength and biggest problem",
  "strengths": ["string", "string"],
  "development_areas": ["string", "string"],
  "pattern_of_failure": "What is this rep consistently doing wrong across multiple calls? Be specific.",
  "pattern_of_success": "What is this rep doing well that they should keep doing?",
  "coach_verdict": "2-3 sentences. If you were this rep's manager, what would you tell them right now? What needs to change immediately?",
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

const MODEL = "claude-sonnet-4-20250514";

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
