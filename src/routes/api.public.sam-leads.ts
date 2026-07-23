import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public webhook for Sam's test leads (sales_test_leads table).
//
// POST /api/public/sam-leads
// Headers:
//   Authorization: Bearer <SAM_LEADS_WEBHOOK_TOKEN>
//   Content-Type: application/json
//
// Recognised body fields: first_name, last_name, email, phone,
// company, city, state, message, source. Whole body stored in raw_payload.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const NOTIFY_EMAIL = "petersemrany1@gmail.com";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s.slice(0, 2000) : null;
}

async function notifyAdmin(row: Record<string, unknown>) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.warn("sam-leads: skipping email notification, keys missing");
    return;
  }

  const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
  const company = (row.company as string) || "—";
  const phone = (row.phone as string) || "—";
  const email = (row.email as string) || "—";
  const loc = [row.city, row.state].filter(Boolean).join(", ") || "—";
  const message = (row.message as string) || "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;padding:24px;color:#111">
      <h2 style="margin:0 0 8px;font-size:18px">New Sam lead</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px">A new lead just came in from Sam's Meta ads.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666;width:110px">Name</td><td style="padding:6px 0"><strong>${name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Company</td><td style="padding:6px 0">${company}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${phone}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${email}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Location</td><td style="padding:6px 0">${loc}</td></tr>
        ${message ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top">Message</td><td style="padding:6px 0;white-space:pre-wrap">${message}</td></tr>` : ""}
      </table>
      <p style="margin-top:24px;font-size:13px;color:#666">
        View in dashboard: <a href="https://hairtransplantgroup.lovable.app/sales-test-leads">Sales Test Leads</a>
      </p>
    </div>
  `;

  try {
    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Bold Leads <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        subject: `New Sam lead — ${name}`,
        html,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`sam-leads notify failed [${resp.status}]:`, body);
    }
  } catch (err) {
    console.error("sam-leads notify error:", err);
  }
}

export const Route = createFileRoute("/api/public/sam-leads")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        const expected = process.env.SAM_LEADS_WEBHOOK_TOKEN;
        if (!expected) {
          return jsonResponse({ error: "Webhook token not configured on server" }, 500);
        }
        const auth = request.headers.get("authorization")?.trim() ?? "";
        const provided = auth.toLowerCase().startsWith("bearer ")
          ? auth.slice(7).trim()
          : auth;
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
          company: asString(payload.company ?? payload.clinic_name ?? payload.business_name),
          city: asString(payload.city),
          state: asString(payload.state),
          message: asString(payload.message ?? payload.notes ?? payload.comments),
          source: asString(payload.source) ?? "sam",
          raw_payload: payload,
        };

        // Dedupe on last 9 digits phone OR exact email over last 30 days
        const phoneDigits = row.phone ? row.phone.replace(/\D/g, "") : "";
        const emailLower = row.email ? row.email.toLowerCase() : "";

        if (phoneDigits || emailLower) {
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const orParts: string[] = [];
          if (phoneDigits) orParts.push(`phone.ilike.%${phoneDigits.slice(-9)}%`);
          if (emailLower) orParts.push(`email.ilike.${emailLower}`);

          const { data: existing } = await supabaseAdmin
            .from("sales_test_leads")
            .select("id, phone, email, created_at")
            .gte("created_at", since)
            .or(orParts.join(","))
            .order("created_at", { ascending: false })
            .limit(20);

          const match = (existing ?? []).find((r) => {
            const rPhone = (r.phone ?? "").replace(/\D/g, "");
            const rEmail = (r.email ?? "").toLowerCase();
            return (
              (phoneDigits && rPhone && rPhone.slice(-9) === phoneDigits.slice(-9)) ||
              (emailLower && rEmail && rEmail === emailLower)
            );
          });

          if (match) {
            return jsonResponse({ status: "duplicate", id: match.id }, 200);
          }
        }

        const { data, error } = await supabaseAdmin
          .from("sales_test_leads")
          .insert([row])
          .select("id")
          .single();

        if (error) {
          console.error("sam-leads insert error:", error);
          return jsonResponse({ error: error.message }, 500);
        }

        // Fire-and-forget email notification
        await notifyAdmin(row);

        return jsonResponse({ status: "ok", id: data.id }, 200);
      },
    },
  },
});
