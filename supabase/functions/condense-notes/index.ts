import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSalesRole } from "../_shared/authorize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are writing PATIENT INTEL BULLETS for a hair-transplant clinic consultant. This is a strict, structured format — NOT a summary essay.

## OUTPUT FORMAT (NON-NEGOTIABLE)

Return ONLY a bullet list. Each bullet starts with "- " on its own line. NO paragraphs. NO headings. NO preamble. NO closing sentence. If you write a paragraph you have failed the task.

Use these labelled bullets in this order (omit a bullet only if the calls have literally nothing on that topic):

- Goal: <what they want done — procedure, area, Norwood stage, graft count if mentioned>
- History: <previous transplants, meds like finasteride/minoxidil/TRT, family history, health notes>
- Question for doctor: <the specific thing they want answered on the consult>
- Price discussed: <EVERY $ figure that came up — competitor quotes, per-graft prices, per-week/per-month payment plan numbers, what our team quoted them, objections about cost. Quote numbers verbatim. Refer to our side as "we" or "our team" — NEVER name the rep (no "Peter", no "Jason", no rep first names).>
- Personal: <work, travel, motivation, deadline, self-consciousness, why now>
- Objections / risks: <any hesitation, shopping around, timing concerns — only if raised>

## HARD RULES

1. NAME: Use PATIENT_FIRST_NAME exactly as supplied in the input. The transcript may have misspelled it (e.g. Marc → Mark, Aleks → Alex). ALWAYS use the CRM spelling. Never re-spell from audio.
2. DO NOT repeat booking date, appointment time, doctor name, clinic name, deposit status, funding tag, or finance eligibility. Those are already displayed to the clinic in a separate Key Facts table below your bullets — repeating them is duplicated noise.
3. PRICE IS MANDATORY when any dollar figure appears in the transcripts. Scan for: "$", "k" after a number, "grand", "per week", "per month", "per graft", "quote", "quoted", "package", "$X/week", "$X/month". If Peter quoted a range (e.g. "$8k–$13k" or "$30–$60 per week"), include it exactly. Missing price info is the #1 failure — treat it as critical.
4. NEVER invent facts. Use only what's in the call summaries.
5. Third person. One sentence per bullet, max. Tight and specific. No filler ("keen to finalise a path forward", "ready for his consultation", "excited to proceed" — all banned).
6. IGNORE voicemail/no-answer/hangup calls entirely.

## EXAMPLE (illustrative — use the ACTUAL facts from the input calls, not these)

- Goal: Norwood 2, wants to address receding hairline at temples plus some crown thinning
- History: On TRT since age 27; dad started receding at 35, now bald at 62
- Question for doctor: Will TRT affect graft survival or accelerate further loss?
- Price discussed: Has a competing quote of $10k for ~3,500 grafts from a South Yarra clinic; we quoted $8k–$13k depending on density, plus a payment plan around $30–$60/week interest-free; balked at other clinic's $750/month for 12 months
- Personal: Self-conscious about scalp visibility due to curly hair; wants to act early because of family history
- Objections: Shopping around, price-sensitive — asked about using super

Remember: BULLETS ONLY. No paragraph. Use the CRM name spelling. Never name our rep — say "we" or "our team".`;



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  // Only authenticated sales staff (admin/rep) may condense/overwrite a lead's notes.
  const denied = await requireSalesRole(req, corsHeaders);
  if (denied) return denied;

  try {
    const { leadId, notes, dealFacts, patientFirstName } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userBlocks: string[] = [];
    const cleanName = typeof patientFirstName === "string" ? patientFirstName.trim() : "";
    if (cleanName) {
      userBlocks.push(`PATIENT_FIRST_NAME: ${cleanName}\n(Use this exact spelling — do not re-spell from the transcript.)`);
    }
    if (typeof notes === "string" && notes.trim()) {
      userBlocks.push(`CALL SUMMARIES (skip any that are too brief / had no useful intel):\n\n${notes.trim()}`);
    } else {
      userBlocks.push(`CALL SUMMARIES: (none — no useful call intel)`);
    }
    if (dealFacts && typeof dealFacts === "object") {
      // Deal facts are CONTEXT ONLY — the clinic sees these in the Key Facts table
      // below the intel, so the model must NOT repeat them in the bullets.
      const factLines: string[] = [];
      const df = dealFacts as Record<string, unknown>;
      if (df.deposit_paid !== undefined) factLines.push(`- Deposit paid: ${df.deposit_paid ? "YES" : "NO"}`);
      if (df.finance_eligible !== undefined && df.finance_eligible !== null) factLines.push(`- Finance checked: ${df.finance_eligible ? "YES" : "NO"}`);
      if (df.funding_preference) factLines.push(`- Funding method: ${String(df.funding_preference).replaceAll("_", " ")}`);
      if (df.booking_date) factLines.push(`- Booking: ${df.booking_date}${df.booking_time ? ` at ${df.booking_time}` : ""}`);
      if (factLines.length > 0) {
        userBlocks.push(`STRUCTURED DEAL FACTS (context only — DO NOT include these in the output bullets, they are already shown in the Key Facts table below):\n\n${factLines.join("\n")}`);
      }
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        max_tokens: 4000,
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

    // Post-process: force the CRM first-name spelling. The transcript often has
    // homophone misspellings (Marc→Mark, Aleks→Alex, Sean→Shawn) that the model
    // parrots even when told not to. Do a case-insensitive whole-word swap.
    let finalText = condensed;
    if (cleanName) {
      // Build a set of likely transcript variants of the CRM name and rewrite
      // any of them back to the CRM spelling as a whole word.
      const variants = new Set<string>([cleanName]);
      const lower = cleanName.toLowerCase();
      const homophones: Record<string, string[]> = {
        marc: ["mark"],
        mark: ["marc"],
        aleks: ["alex"],
        alex: ["aleks"],
        sean: ["shawn", "shaun"],
        shawn: ["sean", "shaun"],
        shaun: ["sean", "shawn"],
        stephen: ["steven"],
        steven: ["stephen"],
        eric: ["erik"],
        erik: ["eric"],
      };
      for (const v of homophones[lower] ?? []) variants.add(v);
      for (const v of variants) {
        if (v.toLowerCase() === cleanName.toLowerCase()) continue;
        const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        finalText = finalText.replace(re, cleanName);
      }
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("meta_leads").update({ call_notes: finalText, updated_at: new Date().toISOString() }).eq("id", leadId);

    return new Response(JSON.stringify({ ok: true, condensed: finalText }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
