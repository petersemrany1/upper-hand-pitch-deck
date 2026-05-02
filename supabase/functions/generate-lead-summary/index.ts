import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generates a one-sentence (≤15 words) sales summary of where things are
// at with a lead, based on recent call_records + meta_leads context.
// Persists the result back into the most recent call_records row's
// call_analysis.summary field so it can be read cheaply later.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

const SYSTEM_PROMPT = `You are a sales assistant. Based on the call history and current status of this lead, write exactly ONE sentence (maximum 15 words) summarising where things are at with this person. Be specific and practical. Examples: 'Called twice, was at the shops — asked for a callback this afternoon.' or 'Had a 4 min convo, interested but wants to think about it.' or 'Booked for May 8 with Dr Singh, deposit paid.' Never mention technical details like call IDs or durations.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json().catch(() => ({ leadId: null }));
    if (!leadId || typeof leadId !== "string") {
      return new Response(JSON.stringify({ error: "leadId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: lead }, { data: calls }] = await Promise.all([
      supabase
        .from("meta_leads")
        .select(
          "first_name, last_name, status, call_notes, booking_date, booking_time, callback_scheduled_at, funding_preference",
        )
        .eq("id", leadId)
        .maybeSingle(),
      supabase
        .from("call_records")
        .select("id, called_at, direction, status, duration, outcome, call_analysis")
        .eq("lead_id", leadId)
        .order("called_at", { ascending: false })
        .limit(5),
    ]);

    if (!lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callList = (calls ?? []).map((c) => {
      const ca = (c.call_analysis ?? null) as
        | { summary?: string; notes?: string; patient_summary?: string }
        | null;
      return {
        when: c.called_at,
        direction: c.direction,
        status: c.status,
        duration_seconds: c.duration,
        outcome: c.outcome,
        notes: ca?.notes ?? ca?.patient_summary ?? null,
      };
    });

    const userPayload = {
      lead: {
        name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown",
        status: lead.status,
        funding_preference: lead.funding_preference,
        call_notes: lead.call_notes,
        booking_date: lead.booking_date,
        booking_time: lead.booking_time,
        callback_scheduled_at: lead.callback_scheduled_at,
      },
      recent_calls: callList,
    };

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Lead context:\n${JSON.stringify(userPayload, null, 2)}\n\nWrite the one-sentence summary now.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Anthropic error", aiRes.status, text);
      return new Response(
        JSON.stringify({ error: `Anthropic ${aiRes.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = (await aiRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const summary =
      (aiJson.content ?? [])
        .map((b) => (b.type === "text" ? b.text ?? "" : ""))
        .join(" ")
        .trim()
        .replace(/\s+/g, " ") || "";

    if (!summary) {
      return new Response(JSON.stringify({ summary: "", warning: "empty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist back into the most recent call_records row, if any
    const latest = (calls ?? [])[0];
    if (latest) {
      const merged = {
        ...((latest.call_analysis ?? {}) as Record<string, unknown>),
        summary,
      };
      await supabase
        .from("call_records")
        .update({ call_analysis: merged })
        .eq("id", latest.id);
    }

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lead-summary error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
