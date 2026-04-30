import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You write an ULTRA-SHORT patient handover note for the consultant. They read it in 5-10 SECONDS before walking in.

THE CONSULTANT'S GOAL: close the deal. They need to know the patient is comfortable with the price, has paid the deposit, is finance-checked and ready to go — plus anything from the calls that helps them close.

OUTPUT FORMAT — STRICT:
- Chronological dot-point list. One bullet per USEFUL call only (Call 1, Call 2, …, Latest Call).
- Final bullet ALWAYS starts with "- Where they are now:" and summarises the deal status.
- Each call bullet: MAX 15 words. ONE short sentence.
- "Where they are now:" bullet: MAX 30 words. Use semicolons to pack 3-4 punchy facts (price comfort, deposit, finance, urgency, next step).
- Use a hyphen ("- ") at the start of every bullet.

CRITICAL RULES:
- SKIP entirely any call that was too brief, didn't connect, voicemail, hangup, or had no useful intel. Do NOT mention them at all — not even to say they were brief.
- If NO calls had useful intel, output ONLY the "Where they are now:" bullet built from the structured deal facts.
- Re-number the kept calls sequentially (Call 1, Call 2, Latest Call) so there are no gaps.
- The "Where they are now" bullet MUST always include deposit status, finance status, and funding method when provided.
- NEVER invent facts. Only use what's in the input (call summaries + deal facts).

KEEP (in priority): deposit paid, finance approved, funding method, biggest objection handled, agreed next step, exact $ and timeframes.
CUT: background story, age, history, spelling confirmations, full names, adjectives, polite phrasing, "too brief" filler.

EXAMPLE (calls had real intel):
- Call 1 — At work, asked for callback Thursday arvo.
- Latest Call — Comfortable at $20k under finance. Wedding in 6 weeks driving urgency.
- Where they are now: Deposit paid; finance approved ($38/week plan); ceiling $20k; ready to close.

EXAMPLE (calls too brief — only deal facts):
- Where they are now: Deposit paid; finance approved; on $38/week payment plan; booked and ready to close.

Style: third person, telegraphic. Respond with ONLY the bullet list. No preamble, no sign-off.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const { leadId, notes, dealFacts } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userBlocks: string[] = [];
    if (typeof notes === "string" && notes.trim()) {
      userBlocks.push(`CALL SUMMARIES (skip any that are too brief / had no useful intel):\n\n${notes.trim()}`);
    } else {
      userBlocks.push(`CALL SUMMARIES: (none — no useful call intel)`);
    }
    if (dealFacts && typeof dealFacts === "object") {
      const factLines: string[] = [];
      const df = dealFacts as Record<string, unknown>;
      if (df.deposit_paid !== undefined) factLines.push(`- Deposit paid: ${df.deposit_paid ? "YES" : "NO"}`);
      if (df.finance_eligible !== undefined && df.finance_eligible !== null) factLines.push(`- Finance approved: ${df.finance_eligible ? "YES" : "NO"}`);
      if (df.funding_preference) factLines.push(`- Funding method: ${String(df.funding_preference).replaceAll("_", " ")}`);
      if (df.booking_date) factLines.push(`- Booking: ${df.booking_date}${df.booking_time ? ` at ${df.booking_time}` : ""}`);
      if (df.status) factLines.push(`- Lead status: ${String(df.status).replaceAll("_", " ")}`);
      if (factLines.length > 0) {
        userBlocks.push(`STRUCTURED DEAL FACTS (always reflect these in the "Where they are now" bullet):\n\n${factLines.join("\n")}`);
      }
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userBlocks.join("\n\n") },
        ],
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway failed (${aiResp.status}): ${t.slice(0, 200)}`);
    }
    const aiJson = await aiResp.json();
    const condensed: string = (aiJson?.choices?.[0]?.message?.content || "").trim();
    if (!condensed) throw new Error("Empty AI response");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("meta_leads").update({ call_notes: condensed, updated_at: new Date().toISOString() }).eq("id", leadId);

    return new Response(JSON.stringify({ ok: true, condensed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
