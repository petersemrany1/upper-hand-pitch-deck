// Generate a 1-line "where they're at" summary for a lead.
// Pulls the lead's call_notes + recent call_records (transcript + analysis),
// walks back through calls until it finds enough real conversation,
// then asks Lovable AI for a single human one-liner like:
// "Said he'll call back tomorrow after speaking with his wife"
//
// POST { lead_id: string, force?: boolean }
// Returns { summary: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NO_DATA = "No data yet";

// Heuristic: did this call actually contain a conversation?
function hasUsefulContent(transcript: string, analysisSummary: string): boolean {
  const t = (transcript || "").trim();
  const s = (analysisSummary || "").trim();
  if (!t && !s) return false;
  // Need either a non-trivial transcript or a non-boilerplate analysis line.
  if (t.length >= 200) return true;
  const noise = /(too brief|please add notes manually|no answer|voicemail|voice mail|hung up|disconnected|provide (a |the )?(real |full )?call transcript)/i;
  if (s && s.length >= 40 && !noise.test(s)) return true;
  if (t && t.length >= 80 && !noise.test(t)) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id, force } = await req.json().catch(() => ({}));
    if (!lead_id) {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: lead } = await supabase
      .from("meta_leads")
      .select("id, first_name, call_notes, callback_scheduled_at, pipeline_summary, pipeline_summary_updated_at, updated_at")
      .eq("id", lead_id)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip regen if cached summary is newer than the lead's last update.
    if (!force && lead.pipeline_summary && lead.pipeline_summary_updated_at) {
      const cachedAt = new Date(lead.pipeline_summary_updated_at).getTime();
      const updatedAt = new Date(lead.updated_at).getTime();
      if (cachedAt >= updatedAt) {
        return new Response(JSON.stringify({ summary: lead.pipeline_summary, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Pull recent calls newest-first.
    const { data: calls } = await supabase
      .from("call_records")
      .select("id, called_at, duration_seconds, outcome, call_analysis")
      .eq("lead_id", lead_id)
      .order("called_at", { ascending: false })
      .limit(8);

    // Walk newest → oldest, pick the first call with real content.
    type Picked = { transcript: string; analysisSummary: string; when: string; outcome: string | null };
    let picked: Picked | null = null;
    const allOutcomes: string[] = [];
    for (const c of calls ?? []) {
      const a = (c.call_analysis ?? {}) as { transcript?: string; patient_summary?: string; summary?: string };
      const transcript = (a.transcript ?? "").trim();
      const analysisSummary = (a.patient_summary ?? a.summary ?? "").trim();
      if (c.outcome) allOutcomes.push(c.outcome);
      if (!picked && hasUsefulContent(transcript, analysisSummary)) {
        picked = { transcript, analysisSummary, when: c.called_at, outcome: c.outcome ?? null };
      }
    }

    const noteText = (lead.call_notes ?? "").trim();
    const cb = lead.callback_scheduled_at ? new Date(lead.callback_scheduled_at) : null;
    const cbStr = cb ? cb.toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "";

    // If there's truly nothing — no calls with content AND no notes AND no callback — return NO_DATA.
    if (!picked && !noteText && !cb) {
      await supabase.from("meta_leads").update({
        pipeline_summary: NO_DATA,
        pipeline_summary_updated_at: new Date().toISOString(),
      }).eq("id", lead_id);
      return new Response(JSON.stringify({ summary: NO_DATA }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a context block for the AI.
    const ctxParts: string[] = [];
    if (picked) {
      ctxParts.push(`Most recent useful call (${picked.when}):`);
      if (picked.transcript) ctxParts.push(`Transcript:\n${picked.transcript.slice(0, 6000)}`);
      if (picked.analysisSummary) ctxParts.push(`Analysis: ${picked.analysisSummary.slice(0, 1500)}`);
      if (picked.outcome) ctxParts.push(`Outcome tag: ${picked.outcome}`);
    }
    if (noteText) ctxParts.push(`Rep's call notes:\n${noteText.slice(0, 4000)}`);
    if (cbStr) ctxParts.push(`Scheduled callback: ${cbStr}`);
    if (allOutcomes.length) ctxParts.push(`Recent call outcome tags (newest first): ${allOutcomes.slice(0, 5).join(", ")}`);

    const userMsg = ctxParts.join("\n\n");

    const systemPrompt = `You write ONE short sentence (max 110 chars) telling a sales rep WHERE THINGS STAND with this lead and WHAT THE NEXT MOVE IS. Write it from the rep's point of view (third person about the lead) — never quote the lead directly, never use first person.

GOOD examples:
- "Busy right now, asked us to call back shortly — hasn't considered the offer yet"
- "Away at a work conference, wants a callback tomorrow once back in Melbourne"
- "Committed to Mon 4pm consult, waiting on $75 deposit screenshot"
- "Wife handles finances, call back Thu 6pm to speak with both"
- "Said he'll think it over the weekend, leaning towards payment plan"
- "Not interested — doesn't want surgery, do not chase"
- "Left voicemail, no callback scheduled yet"

BAD examples (do NOT do these):
- A direct quote like "I'm still busy, I'll call you shortly"  ❌ (rewrite as "Busy, asked us to call back shortly")
- Vague labels like "warm lead", "interested", "engaged prospect", "personal context"  ❌
- Just "follow up" or "call back" with no reason  ❌

REQUIRED structure: STATE/REASON + NEXT MOVE. Always include why we're at this point AND what to do next when both exist.

If only a callback is scheduled with no other context: "Callback ${cbStr || "scheduled"} — no notes from last call".
If genuinely no useful data anywhere, output exactly: "No data yet".

Output ONLY the sentence. No quotes around it, no prefix, no markdown.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg || "No data available." },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    let summary: string = (aiJson?.choices?.[0]?.message?.content ?? "").toString().trim();
    // Strip wrapping quotes / trailing punctuation, collapse whitespace.
    summary = summary.replace(/^["'`\s]+|["'`\s]+$/g, "").replace(/\s+/g, " ").trim();
    if (summary.length > 110) summary = summary.slice(0, 107).trimEnd() + "…";
    if (!summary) summary = NO_DATA;

    await supabase.from("meta_leads").update({
      pipeline_summary: summary,
      pipeline_summary_updated_at: new Date().toISOString(),
    }).eq("id", lead_id);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-pipeline-summary error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
