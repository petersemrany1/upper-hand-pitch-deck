import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You write a PATIENT INTEL HANDOVER for the clinic consultant who is about to see this patient. The consultant needs to walk in feeling like they already know the patient — what they want, what they've agreed to, what they've paid, and exactly where the deal stands.

THE CONSULTANT'S GOAL: CLOSE THE DEAL. They need confidence that the patient is comfortable with the price, has paid their deposit, is finance-checked, and is ready to go — plus all the personal/medical context to make the consult feel personal.

INPUT: One or more call transcripts/summaries with this lead (chronological), plus structured deal facts.

OUTPUT FORMAT — STRICT:

Write ONE flowing narrative paragraph (4-8 sentences) weaving together everything useful from across ALL the calls into a single cohesive patient story. Cover (when present in the input):
- What they want done (procedure, area, density goal, specific concerns)
- Their history (previous transplants, medications tried, what's worked / not worked)
- Personal context that helps the consult feel personal (work, travel ability, motivation, deadline, secondary concerns)
- Price/objection handling — what price they're comfortable with, any pushback resolved
- Booking details — date, time, doctor, clinic location

Then on a NEW LINE add EXACTLY this final bullet:
- Where they are now: <one tight sentence summarising deal status — booking date/time + doctor + clinic, deposit status, finance status, funding method, and that they're ready to attend>

CRITICAL RULES:
- IGNORE entirely any call that was voicemail, no answer, hangup, didn't connect, or had no useful patient intel. Do NOT mention them at all.
- If NO calls had useful intel, skip the narrative paragraph and output ONLY the "- Where they are now:" line built from the structured deal facts.
- The "Where they are now:" line MUST always include deposit status, finance status, and funding method when those facts are provided.
- NEVER invent facts — only use what's in the call summaries and deal facts.
- Be SPECIFIC with names, places, $ amounts, dates, times, doctors, clinics — these details build trust with the consultant.
- Third person. Natural prose, not bullet points (except the final "Where they are now" line).
- No preamble, no sign-off, no headings — just the paragraph then the final bullet.

EXAMPLE OUTPUT:

Steve revealed he had a complete hair transplant in Turkey 10 years ago; the front was done but he kept it shaved and never grew it out fully. The transplant held up well but the front is "still not full enough" and he wants "full" density in the crown area as well. He won't take medications, tried creams post-op but didn't stick with them. He's motivated to get a second transplant to restore his hairline and crown density. Confirmed he can travel to the clinic location (Essendon, Lincoln Road). Also mentioned he has a broken nose and wants that assessed during the consult if possible.
- Where they are now: Locked in for 9am consult tomorrow at NITAI Medical with Dr. Shobna Singh; $75 deposit paid via Apple Pay; finance-checked and approved; ready to attend.`;

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
        model: "google/gemini-2.5-pro",
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
