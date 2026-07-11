import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSalesRole } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You write PATIENT INTEL BULLETS for the clinic consultant about to see this patient. The consultant already has a "Key Facts" table below the intel showing booking date/time, doctor, deposit, funding method and finance status — so DO NOT repeat any of that. Your job is the patient story only.

INPUT: One or more call transcripts/summaries with this lead (chronological), structured deal facts (for context only), and PATIENT_FIRST_NAME (the correct spelling from the CRM).

OUTPUT FORMAT — STRICT:

Return 4–7 short bullet points, each starting with "- " on its own line. No paragraphs, no headings, no preamble, no sign-off. Cover ONLY these categories, in this order, and only include a bullet if the calls actually contain that info:

- Goal — what they want done (procedure, area, Norwood stage, density goal)
- History / medical — previous transplants, meds (finasteride, minoxidil, TRT, etc.), family history, anything the doctor needs to know
- Key concern or question for the doctor — the one thing they specifically want answered on the consult
- Price discussed — EVERY dollar figure, quote, competitor quote, payment-plan number, per-graft price, or objection about cost that came up on the call. If Peter quoted them a price, INCLUDE THAT PRICE. This bullet is mandatory whenever any $ figure was mentioned on the call.
- Personal context — work, travel, timing, motivation, deadline (only if relevant)

CRITICAL RULES:
- Use PATIENT_FIRST_NAME exactly as supplied. Do NOT re-spell the name from the transcript (e.g. if PATIENT_FIRST_NAME is "Marc", never write "Mark").
- DO NOT include a bullet about booking date, doctor, clinic location, deposit status, funding method, or finance eligibility. Those live in the Key Facts table.
- NEVER invent facts — only use what's in the call summaries. If a category has no info, omit that bullet entirely.
- Scan the transcripts hard for MONEY talk — any number followed by "k", "grand", "dollars", "$", "per month", "per graft", "quote", "deposit", "package" — and put it in the Price bullet verbatim. Missing price info is the #1 failure mode.
- IGNORE calls that were voicemail, no answer, hangup, or had no useful intel.
- Third person. Tight, scannable, no filler words like "keen to finalise a path forward".
- Each bullet one sentence max. Be specific with names, places, $ amounts.

EXAMPLE OUTPUT (illustrative — use the real facts from the calls):

- Goal: Norwood 3, wants density restored to hairline and temples, ~2,500 grafts
- History: On finasteride 2 years, also on TRT — wants to know if TRT affects graft survival
- Question for doctor: Will TRT impact transplant longevity?
- Price discussed: Quoted $10k for 3,500 grafts by a South Yarra clinic, said their $750/month plan felt too high; Peter quoted him $8,500 all-in
- Personal: Dad started receding at 35, wants to act early; travels for work so needs a Friday appointment`;


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  // Only authenticated sales staff (admin/rep) may condense/overwrite a lead's notes.
  const denied = await requireSalesRole(req, corsHeaders);
  if (denied) return denied;

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
      if (df.finance_eligible !== undefined && df.finance_eligible !== null) factLines.push(`- Finance checked: ${df.finance_eligible ? "YES" : "NO"}`);
      if (df.funding_preference) factLines.push(`- Funding method (CRM tag only — do NOT claim the patient confirmed this on the call unless the transcripts say so): ${String(df.funding_preference).replaceAll("_", " ")}`);
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

    // Reject AI refusals / non-answers — never overwrite real notes with junk like
    // "I can't process this transcript" or "Please provide a transcript".
    const refusalPatterns = [
      /\bi (?:can'?t|cannot|am unable to|won'?t be able to|don'?t have)\b/i,
      /\b(?:no|without|missing|provide|paste|share)\b.*\btranscript\b/i,
      /\btranscript\b.*\b(?:to analyze|to process|wasn'?t provided|not provided|isn'?t (?:included|provided))\b/i,
      /\bplaceholder text\b/i,
      /\bcorrupted audio\b/i,
      /\bvoicemail notification\b/i,
      /\bdoesn'?t contain (?:intelligible|a sales call|patient information|any (?:dialogue|conversation))\b/i,
    ];
    const isRefusal = refusalPatterns.some((re) => re.test(condensed));
    if (isRefusal) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "AI returned a refusal — keeping existing call_notes" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("meta_leads").update({ call_notes: condensed, updated_at: new Date().toISOString() }).eq("id", leadId);

    return new Response(JSON.stringify({ ok: true, condensed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
