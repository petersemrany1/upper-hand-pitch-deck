import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public webhook endpoint for Meta (Facebook/Instagram) leads coming in via Make.com.
// Authentication: Bearer token in the Authorization header, validated against
// the META_LEADS_WEBHOOK_TOKEN secret.
//
// POST /api/public/meta-leads
// Headers:
//   Authorization: Bearer <META_LEADS_WEBHOOK_TOKEN>
//   Content-Type: application/json
//
// Body (all fields optional, but at least one of email/phone is recommended):
// {
//   "first_name": "Jane",
//   "last_name": "Doe",
//   "email": "jane@example.com",
//   "phone": "+61400000000",
//   "funding_preference": "Self-funded",
//   "ad_name": "Spring Promo - Video A",
//   "ad_set_name": "AU - 25-45 - Interest: Skincare",
//   "campaign_name": "Lead Gen - April",
//   "creative_time": "2026-04-25T10:30:00Z"
// }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

function cleanName(v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  const cleaned = s
    .replace(/[\s,]+$/g, "")
    .replace(/^[\s,]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function asTimestamp(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export const Route = createFileRoute("/api/public/meta-leads")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        // Auth check
        const expected = process.env.META_LEADS_WEBHOOK_TOKEN;
        if (!expected) {
          return jsonResponse(
            { error: "Webhook token not configured on server" },
            500
          );
        }
        const auth = request.headers.get("authorization") || "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token || token !== expected) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        // Parse body
        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const row = {
          first_name: asString(payload.first_name ?? payload.firstName),
          last_name: asString(payload.last_name ?? payload.lastName),
          email: asString(payload.email),
          phone: asString(payload.phone ?? payload.phone_number),
          funding_preference: asString(
            payload.funding_preference ??
              payload.fundingPreference ??
              payload.funding
          ),
          ad_name: asString(payload.ad_name ?? payload.adName ?? payload.ad),
          ad_set_name: asString(
            payload.ad_set_name ?? payload.adSetName ?? payload.adset
          ),
          campaign_name: asString(
            payload.campaign_name ?? payload.campaignName ?? payload.campaign
          ),
          creative_time: asTimestamp(
            payload.creative_time ?? payload.creativeTime
          ),
          raw_payload: payload,
        };

        const { data, error } = await supabaseAdmin
          .from("meta_leads")
          .insert([row])
          .select("id")
          .single();

        if (error) {
          console.error("meta-leads insert error:", error);
          return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ success: true, id: data.id }, 201);
      },
    },
  },
});
