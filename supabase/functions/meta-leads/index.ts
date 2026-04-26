// Supabase Edge Function: meta-leads
// Accepts POST from Make.com with a Bearer token, validates against
// META_LEADS_WEBHOOK_TOKEN secret, and inserts a row into public.meta_leads.
//
// Endpoint (once deployed):
//   POST https://<project-ref>.supabase.co/functions/v1/meta-leads
//
// Headers:
//   Authorization: Bearer <META_LEADS_WEBHOOK_TOKEN>
//   Content-Type: application/json
//
// Body (JSON):
// {
//   "full_name": "Jane Doe",
//   "email": "jane@example.com",
//   "phone": "+61400000000",
//   "ad_name": "Spring Promo - Video A",
//   "form_name": "HT Lead Form",
//   "clinic_id": "uuid-or-null"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s.slice(0, 500) : null;
}

function isUuid(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function splitFullName(full: string | null): { first: string | null; last: string | null } {
  if (!full) return { first: null, last: null };
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Validate bearer token
  const expected = Deno.env.get("META_LEADS_WEBHOOK_TOKEN");
  if (!expected) {
    console.error("META_LEADS_WEBHOOK_TOKEN not configured");
    return jsonResponse({ error: "Webhook token not configured on server" }, 500);
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Parse body
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const fullName = asString(payload.full_name ?? payload.fullName ?? payload.name);
  const { first, last } = splitFullName(fullName);

  const clinicIdRaw = payload.clinic_id ?? payload.clinicId;
  const clinicId = isUuid(clinicIdRaw) ? (clinicIdRaw as string) : null;

  const formName = asString(payload.form_name ?? payload.formName);

  const row = {
    first_name: asString(payload.first_name ?? payload.firstName) ?? first,
    last_name: asString(payload.last_name ?? payload.lastName) ?? last,
    email: asString(payload.email),
    phone: asString(payload.phone ?? payload.phone_number),
    ad_name: asString(payload.ad_name ?? payload.adName),
    clinic_id: clinicId,
    raw_payload: { ...payload, form_name: formName },
  };

  // Insert with service role (bypasses RLS)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Supabase env not configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("meta_leads")
    .insert([row])
    .select("id")
    .single();

  if (error) {
    console.error("meta-leads insert error:", error);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ success: true, id: data.id }, 201);
});
