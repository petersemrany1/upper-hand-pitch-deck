import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You re-condense an existing patient handover note into an ULTRA-SHORT scannable summary the consultant can read in 5-10 SECONDS.

OUTPUT FORMAT — STRICT:
- Chronological dot-point list. One bullet per call (Call 1, Call 2, …, Latest Call).
- Final bullet starts with "- Where they are now:".
- Each call bullet: MAX 15 words. ONE short sentence.
- "Where they are now:" bullet: MAX 25 words. Use semicolons to pack 2-3 punchy facts.
- Use a hyphen ("- ") at the start of every bullet.

KEEP (in priority): decision condition, deadline/why now, biggest objection, agreed next step, exact $ and timeframes.
CUT: background story, age, history, spelling confirmations, full names, adjectives, polite phrasing.

EXAMPLE:
- Call 1 — At work, asked for callback Thursday arvo.
- Latest Call — Will go ahead under $20k. Wedding in 6 weeks driving urgency.
- Where they are now: Committed; ceiling $20k; wedding 6 weeks; deposit ready — close on price.

Style: third person, telegraphic. NEVER invent facts — only re-phrase what's in the input.

Respond with ONLY the bullet list. No preamble, no sign-off.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const { leadId, notes } = await req.json();
    if (!leadId || !notes || typeof notes !== "string") {
      return new Response(JSON.stringify({ error: "leadId and notes required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Re-condense these notes:\n\n${notes}` },
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
