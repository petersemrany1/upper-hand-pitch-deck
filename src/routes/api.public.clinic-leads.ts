import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public webhook for B2B CLINIC leads (separate from patient meta_leads).
//
// POST /api/public/clinic-leads
// Headers:
//   x-webhook-secret: <CLINIC_WEBHOOK_SECRET>
//   Content-Type: application/json
//
// Body: any JSON. Recognised fields: first_name, last_name, email, phone,
// clinic_name, city, state, source. Whole body is stored in raw_payload.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
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

export const Route = createFileRoute("/api/public/clinic-leads")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const expected = process.env.CLINIC_WEBHOOK_SECRET;
        if (!expected) {
          return jsonResponse(
            { error: "Webhook secret not configured on server" },
            500
          );
        }
        const provided = request.headers.get("x-webhook-secret")?.trim() ?? "";
        if (!provided || provided !== expected) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

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
          clinic_name: asString(payload.clinic_name ?? payload.clinicName),
          city: asString(payload.city),
          state: asString(payload.state),
          source: asString(payload.source) ?? "partner",
          raw_payload: payload,
        };

        // Dedupe against clinic_leads inserted in the last 30 days
        // by last-9-digits of phone OR exact (lowercased) email.
        const phoneDigits = row.phone ? row.phone.replace(/\D/g, "") : "";
        const emailLower = row.email ? row.email.toLowerCase() : "";

        if (phoneDigits || emailLower) {
          const since = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString();
          const orParts: string[] = [];
          if (phoneDigits) orParts.push(`phone.ilike.%${phoneDigits.slice(-9)}%`);
          if (emailLower) orParts.push(`email.ilike.${emailLower}`);

          const { data: existing } = await supabaseAdmin
            .from("clinic_leads")
            .select("id, phone, email, created_at")
            .gte("created_at", since)
            .or(orParts.join(","))
            .order("created_at", { ascending: false })
            .limit(20);

          const match = (existing ?? []).find((r) => {
            const rPhone = (r.phone ?? "").replace(/\D/g, "");
            const rEmail = (r.email ?? "").toLowerCase();
            return (
              (phoneDigits &&
                rPhone &&
                rPhone.slice(-9) === phoneDigits.slice(-9)) ||
              (emailLower && rEmail && rEmail === emailLower)
            );
          });

          if (match) {
            return jsonResponse({ status: "duplicate", id: match.id }, 200);
          }
        }

        const { data, error } = await supabaseAdmin
          .from("clinic_leads")
          .insert([row])
          .select("id")
          .single();

        if (error) {
          console.error("clinic-leads insert error:", error);
          return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ status: "ok", id: data.id }, 200);
      },
    },
  },
});
