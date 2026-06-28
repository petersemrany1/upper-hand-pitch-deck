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

interface OwnerResult {
  owner_name: string | null;
  owner_title: string | null;
  linkedin_url: string | null;
  confidence: "high" | "medium" | "low";
  source_url: string | null;
  notes?: string;
}

function extractResult(text: string): OwnerResult | null {
  if (!text) return null;
  let raw = text.trim();
  const m = raw.match(/<result>([\s\S]*?)<\/result>/i);
  if (m) raw = m[1].trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(raw) as OwnerResult;
  } catch {
    // Try to find a JSON object
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]) as OwnerResult; } catch { /* noop */ }
    }
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
    .select("id, clinic_name, city, state, website, phone")
    .eq("id", clinicId)
    .maybeSingle();

  if (loadErr || !clinic) return json({ error: "Clinic not found" }, 404);

  const prompt = `You are researching the OWNER / principal surgeon / practice director of an Australian hair transplant clinic. Find the specific human being who owns or runs it — not the clinic name, an actual person. Use web search (clinic website 'meet the team' / 'about' pages, LinkedIn, news, AHPRA).

Clinic: ${clinic.clinic_name}
City/State: ${clinic.city ?? ""}, ${clinic.state ?? ""}
Website: ${clinic.website ?? ""}

Return ONLY a JSON object wrapped in <result></result> tags, nothing else. Keys:
- owner_name: string or null (the person's full name)
- owner_title: string or null (their role, e.g. 'Founder & Medical Director')
- linkedin_url: string or null (MUST be a real linkedin.com/in/... URL you actually found in search results — never guess or construct one; null if you didn't find a real profile)
- confidence: 'high' | 'medium' | 'low' (high = named on the clinic's own site or LinkedIn; low = inferred)
- source_url: string or null (the page you got the name from)
- notes: string (one short sentence on what you found)

If you genuinely cannot find a named owner, return owner_name: null with confidence 'low'.`;

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
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (e) {
    await admin.from("clinics").update({
      owner_enrichment_status: "error",
      owner_enriched_at: new Date().toISOString(),
      owner_enrichment_raw: { error: String((e as Error).message) },
    }).eq("id", clinicId);
    return json({ error: "Anthropic fetch failed", detail: String((e as Error).message) }, 500);
  }

  const rawText = await apiResp.text();
  let parsed: any = null;
  try { parsed = JSON.parse(rawText); } catch { /* noop */ }

  if (!apiResp.ok) {
    await admin.from("clinics").update({
      owner_enrichment_status: "error",
      owner_enriched_at: new Date().toISOString(),
      owner_enrichment_raw: { status: apiResp.status, body: parsed ?? rawText },
    }).eq("id", clinicId);
    return json({ error: "Anthropic API error", status: apiResp.status, body: parsed ?? rawText }, 502);
  }

  // Join all text blocks
  const blocks: any[] = parsed?.content ?? [];
  const joined = blocks.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("\n");

  const result = extractResult(joined);

  if (!result) {
    await admin.from("clinics").update({
      owner_enrichment_status: "error",
      owner_enriched_at: new Date().toISOString(),
      owner_enrichment_raw: { parse_error: true, joined_text: joined.slice(0, 4000) },
    }).eq("id", clinicId);
    return json({ error: "Failed to parse result", joined: joined.slice(0, 4000) }, 500);
  }

  // Validate LinkedIn URL
  let linkedin = result.linkedin_url;
  if (linkedin && !/linkedin\.com\/in\//i.test(linkedin)) linkedin = null;

  const update: Record<string, unknown> = {
    owner_enriched_at: new Date().toISOString(),
    owner_enrichment_raw: result as unknown as Record<string, unknown>,
  };

  if (!result.owner_name) {
    update.owner_enrichment_status = "not_found";
    update.owner_name_suggested = null;
    update.owner_title_suggested = null;
    update.linkedin_url_suggested = null;
    update.owner_source_url = result.source_url ?? null;
    update.owner_confidence = result.confidence ?? "low";
  } else {
    update.owner_enrichment_status = "suggested";
    update.owner_name_suggested = result.owner_name;
    update.owner_title_suggested = result.owner_title ?? null;
    update.linkedin_url_suggested = linkedin;
    update.owner_source_url = result.source_url ?? null;
    update.owner_confidence = result.confidence ?? "low";
  }

  const { error: updErr } = await admin.from("clinics").update(update).eq("id", clinicId);
  if (updErr) return json({ error: "Update failed", detail: updErr.message }, 500);

  return json({ ok: true, suggestion: { ...result, linkedin_url: linkedin } });
});
