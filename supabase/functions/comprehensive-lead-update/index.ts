import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generates a comprehensive recap of everything that's happened with a lead —
// every call, every SMS, notes, status, booking, callback. Designed to be read
// quickly when picking the lead back up after a gap (e.g. calling them back tomorrow).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const SYSTEM_PROMPT = `You are a sales assistant helping a sales rep get back up to speed on a lead before they call them again.

Write a comprehensive but scannable recap of everything that's happened with this lead so far. Use this exact structure with markdown headings:

## Where we're at
One or two sentences — current status, what the next move is.

## Key facts
Bullet points: name, funding situation, booking details, callback time, anything practical the rep needs to remember.

## What's been discussed
Bullet points covering the actual conversations — concerns raised, objections, things they said they'd think about, personal context (kids, work, holidays, etc), anything emotionally relevant. Group by theme, not by call. Be specific — quote phrases when useful.

## Communication history
Brief chronological summary: "Called X times, sent Y SMS. First contact [date], last contact [date]." Mention if they're hard to reach, prefer SMS, etc.

## Suggested next step
One sentence — what should the rep do or say next time they speak.

Be concrete. Avoid filler. If a section has nothing useful, write "Nothing notable yet." Never invent details.`;

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

    const [{ data: lead }, { data: calls }, { data: sms }] = await Promise.all([
      supabase
        .from("meta_leads")
        .select(
          "first_name, last_name, status, call_notes, booking_date, booking_time, callback_scheduled_at, funding_preference, finance_eligible, finance_form_answers, created_at, phone, email, ad_name, campaign_name",
        )
        .eq("id", leadId)
        .maybeSingle(),
      supabase
        .from("call_records")
        .select("id, called_at, direction, status, duration, outcome, call_analysis")
        .eq("lead_id", leadId)
        .order("called_at", { ascending: true }),
      supabase
        .from("sms_messages")
        .select("created_at, direction, body, status")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true }),
    ]);

    if (!lead) {
      return new Response(JSON.stringify({ error: "lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callList = (calls ?? []).map((c) => {
      const ca = (c.call_analysis ?? null) as
        | { summary?: string; notes?: string; patient_summary?: string; transcript?: string }
        | null;
      const transcript = (ca?.transcript ?? "").trim();
      return {
        when: c.called_at,
        direction: c.direction,
        outcome: c.outcome,
        duration_seconds: c.duration,
        summary: ca?.summary ?? ca?.patient_summary ?? null,
        notes: ca?.notes ?? null,
        transcript: transcript || null,
      };
    });

    const smsList = (sms ?? []).map((m) => ({
      when: m.created_at,
      direction: m.direction,
      body: m.body,
    }));

    const userPayload = {
      lead: {
        name: [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown",
        status: lead.status,
        funding_preference: lead.funding_preference,
        finance_eligible: lead.finance_eligible,
        finance_form_answers: lead.finance_form_answers,
        booking_date: lead.booking_date,
        booking_time: lead.booking_time,
        callback_scheduled_at: lead.callback_scheduled_at,
        rep_notes: lead.call_notes,
        first_seen: lead.created_at,
        ad: lead.ad_name,
        campaign: lead.campaign_name,
      },
      calls: callList,
      sms: smsList,
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Lead context:\n${JSON.stringify(userPayload, null, 2)}\n\nWrite the comprehensive update now.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return new Response(
        JSON.stringify({ error: `AI ${aiRes.status}`, detail: text }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = (aiJson.choices?.[0]?.message?.content ?? "").trim();

    if (!summary) {
      return new Response(JSON.stringify({ summary: "", warning: "empty" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("comprehensive-lead-update error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
