import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// One-off backfill: re-run Claude on every clinic call_record using the new
// comprehensive-bullet notes prompt, then patch the matching clinic_contacts
// activity timeline entry so the CRM shows the new notes.
//
// Idempotent — marks each processed row with call_analysis.notes_format = "v2"
// and skips rows already at v2. Caller can invoke repeatedly with ?limit=N
// until { remaining: 0 }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const SYSTEM_PROMPT = `You are analysing a sales call between Peter from Bold and a hair transplant clinic. Today's date is ${new Date().toISOString().slice(0, 10)} (UTC). Based on the transcript, return a JSON object with exactly these fields:
{
  "outcome": one of ["Not Interested", "No Answer", "Left Voicemail", "Gatekeeper", "Call Me Back", "Zoom Set", "Spoke - Interested"],
  "next_action": "what Peter should do next in one short sentence — INCLUDE the day, date and time window if a callback or Zoom was agreed",
  "follow_up_date": "ISO date string (YYYY-MM-DD) or null",
  "follow_up_time": "specific time or window in plain English, or null",
  "notes": "Comprehensive but scannable summary of the call. Use short bullet lines separated by newline characters (\\n), prefixed with '• '. Cover EVERYTHING that matters: who Peter spoke to and their role, what was pitched/discussed, the prospect's exact objections or concerns (price, timing, fit, capacity, partner approval, etc.), any numbers mentioned (pricing, volumes, conversion rates, deposits, follicle counts), competitors or other partnerships referenced, the prospect's current situation (busy, on holiday, restructuring, etc.), what was agreed or rejected, and any specific quote that captures their stance. Skip filler and pleasantries. Aim for 4–8 tight bullets — dense enough that Peter doesn't need to re-listen, short enough to skim in 15 seconds.",
  "contact_name": "name of person spoken to if mentioned, otherwise null",
  "owner_reached": true or false
}

Return only valid JSON, no preamble.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 40);

  // Pull next batch of clinic calls that still have the old notes format.
  const { data: rows, error } = await supabase
    .from("call_records")
    .select("id, clinic_id, called_at, duration, call_analysis")
    .not("clinic_id", "is", null)
    .order("called_at", { ascending: false })
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const todo = (rows || []).filter((r) => {
    const a = r.call_analysis as Record<string, unknown> | null;
    if (!a) return false;
    if (typeof a.transcript !== "string" || (a.transcript as string).length < 50) return false;
    return a.notes_format !== "v2";
  });
  const batch = todo.slice(0, limit);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const row of batch) {
    const a = row.call_analysis as Record<string, unknown>;
    const transcript = a.transcript as string;

    try {
      const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Transcript:\n\n${transcript}` }],
        }),
      });
      if (!claudeResp.ok) {
        const t = await claudeResp.text();
        throw new Error(`Claude ${claudeResp.status}: ${t.slice(0, 200)}`);
      }
      const j = await claudeResp.json();
      let raw: string = j?.content?.[0]?.text || "";
      raw = raw.trim();
      if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const crm = JSON.parse(raw) as Record<string, unknown>;

      const newAnalysis = {
        ...a,
        ...crm,
        transcript, // preserve
        notes_format: "v2",
        backfilled_at: new Date().toISOString(),
      };

      await supabase
        .from("call_records")
        .update({ call_analysis: newAnalysis })
        .eq("id", row.id);

      // Find matching clinic_contacts row and update its notes.
      // Match by clinic_id + contact_type=Call, closest created_at to called_at.
      const calledAt = new Date(row.called_at as string);
      const windowStart = new Date(calledAt.getTime() - 6 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(calledAt.getTime() + 6 * 60 * 60 * 1000).toISOString();
      const { data: contacts } = await supabase
        .from("clinic_contacts")
        .select("id, created_at, duration")
        .eq("clinic_id", row.clinic_id)
        .eq("contact_type", "Call")
        .gte("created_at", windowStart)
        .lte("created_at", windowEnd);

      let match: { id: string; created_at: string } | null = null;
      if (contacts && contacts.length > 0) {
        // Prefer one with same duration string, else closest in time.
        const durStr = row.duration != null ? `${row.duration}s` : null;
        const sameDur = durStr ? contacts.find((c) => c.duration === durStr) : null;
        if (sameDur) {
          match = sameDur as { id: string; created_at: string };
        } else {
          contacts.sort((a, b) => {
            const da = Math.abs(new Date(a.created_at).getTime() - calledAt.getTime());
            const db = Math.abs(new Date(b.created_at).getTime() - calledAt.getTime());
            return da - db;
          });
          match = contacts[0] as { id: string; created_at: string };
        }
      }

      if (match && typeof crm.notes === "string") {
        await supabase
          .from("clinic_contacts")
          .update({
            notes: crm.notes as string,
            outcome: (crm.outcome as string) ?? null,
            next_action: (crm.next_action as string) ?? null,
          })
          .eq("id", match.id);
      }

      results.push({ id: row.id, ok: true });
    } catch (e) {
      results.push({ id: row.id, ok: false, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remaining: Math.max(0, todo.length - batch.length),
    results,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
