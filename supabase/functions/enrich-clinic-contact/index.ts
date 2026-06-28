import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { requireAuth } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ContactResult {
  linkedin_url: string | null;
  email: string | null;
  confidence: "high" | "medium" | "low";
  source_url: string | null;
  notes?: string;
}

function extractResult(text: string): ContactResult | null {
  if (!text) return null;
  let raw = text.trim();
  const m = raw.match(/<result>([\s\S]*?)<\/result>/i);
  if (m) raw = m[1].trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(raw) as ContactResult; } catch {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]) as ContactResult; } catch { /* noop */ } }
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const authFail = await requireAuth(req, corsHeaders);
  if (authFail) return authFail;

  let body: { clinic_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const clinicId = body.clinic_id;
  if (!clinicId) return json({ error: "clinic_id required" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: clinic, error: loadErr } = await admin
    .from("clinics")
    .select("id, clinic_name, city, state, website, owner_name, owner_title")
    .eq("id", clinicId)
    .maybeSingle();

  if (loadErr || !clinic) return json({ error: "Clinic not found" }, 404);
  if (!clinic.owner_name) return json({ error: "Clinic has no confirmed owner yet" }, 400);

  const prompt = `You are researching DIRECT contact details for a specific person at an Australian hair transplant clinic.

Person: ${clinic.owner_name}${clinic.owner_title ? ` (${clinic.owner_title})` : ""}
Clinic: ${clinic.clinic_name}
City/State: ${clinic.city ?? ""}, ${clinic.state ?? ""}
Website: ${clinic.website ?? ""}

Use web search to find:
1. Their LinkedIn profile URL (linkedin.com/in/...). Search for the name + clinic + "LinkedIn". Only return a URL you actually found in search results — never guess.
2. Their direct work email. Check the clinic website (About, Team, Contact pages), any press releases, conference bios, or AHPRA listings. Only return an email you actually saw on a real page — never guess or pattern-construct (e.g. don't fabricate first.last@domain).

Return ONLY a JSON object wrapped in <result></result> tags. Keys:
- linkedin_url: string or null
- email: string or null
- confidence: 'high' | 'medium' | 'low' (high = found on clinic's own site or verified LinkedIn; low = inferred)
- source_url: string or null (where you found the email; if only LinkedIn, use the LinkedIn URL)
- notes: string (one short sentence on what you found / didn't find)

If you can't find either, return both null with confidence 'low'.`;

  let apiResp: Response;
  try {
    apiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    await admin.from("clinics").update({
      contact_enrichment_status: "error",
      contact_enriched_at: new Date().toISOString(),
      contact_enrichment_raw: { error: String((e as Error).message) },
    }).eq("id", clinicId);
    return json({ error: "Anthropic fetch failed", detail: String((e as Error).message) }, 500);
  }

  const rawText = await apiResp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(rawText); } catch { /* noop */ }

  if (!apiResp.ok) {
    await admin.from("clinics").update({
      contact_enrichment_status: "error",
      contact_enriched_at: new Date().toISOString(),
      contact_enrichment_raw: { status: apiResp.status, body: parsed ?? rawText },
    }).eq("id", clinicId);
    return json({ error: "Anthropic API error", status: apiResp.status, body: parsed ?? rawText }, 502);
  }

  const blocks: any[] = parsed?.content ?? [];
  const joined = blocks.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("\n");
  const result = extractResult(joined);

  if (!result) {
    await admin.from("clinics").update({
      contact_enrichment_status: "error",
      contact_enriched_at: new Date().toISOString(),
      contact_enrichment_raw: { parse_error: true, joined_text: joined.slice(0, 4000) },
    }).eq("id", clinicId);
    return json({ error: "Failed to parse result", joined: joined.slice(0, 4000) }, 500);
  }

  let linkedin = result.linkedin_url;
  if (linkedin && !/linkedin\.com\/in\//i.test(linkedin)) linkedin = null;
  let email = result.email;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;

  const update: Record<string, unknown> = {
    contact_enriched_at: new Date().toISOString(),
    contact_enrichment_raw: result as unknown as Record<string, unknown>,
    contact_source_url: result.source_url ?? null,
    contact_confidence: result.confidence ?? "low",
  };

  if (!linkedin && !email) {
    update.contact_enrichment_status = "not_found";
    update.owner_linkedin_suggested = null;
    update.owner_email_suggested = null;
  } else {
    update.contact_enrichment_status = "suggested";
    update.owner_linkedin_suggested = linkedin;
    update.owner_email_suggested = email;
  }

  const { error: updErr } = await admin.from("clinics").update(update).eq("id", clinicId);
  if (updErr) return json({ error: "Update failed", detail: updErr.message }, 500);

  return json({ ok: true, suggestion: { ...result, linkedin_url: linkedin, email } });
});
