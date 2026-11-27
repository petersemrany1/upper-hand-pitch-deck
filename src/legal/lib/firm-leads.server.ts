// Ported from the Legal app (family-law-floater/src/lib/firm-leads.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Server-only ingestion logic for the public firm-application webhook.
// Rule #1: never reject a request. Always store the raw body, map what we can.

type AnyRecord = Record<string, unknown>;

function flatten(input: unknown, out: AnyRecord = {}, depth = 0): AnyRecord {
  if (!input || typeof input !== "object" || depth > 4) return out;
  if (Array.isArray(input)) {
    for (const item of input) flatten(item, out, depth + 1);
    return out;
  }
  for (const [key, value] of Object.entries(input as AnyRecord)) {
    const k = key.toLowerCase().replace(/[\s-]+/g, "_");
    if (value && typeof value === "object") {
      // Facebook-style { field_data: [{ name, values: [...] }] }
      const v = value as AnyRecord;
      if (typeof v['name'] === "string" && Array.isArray(v['values'])) {
        const name = String(v['name']).toLowerCase().replace(/[\s-]+/g, "_");
        if (!(name in out)) out[name] = (v['values'] as unknown[])[0];
      }
      flatten(value, out, depth + 1);
    } else if (!(k in out) || out[k] === undefined || out[k] === null || out[k] === "") {
      out[k] = value;
    }
  }
  return out;
}

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value)
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/[,;]+$/g, "")
    .trim();
  return s.length ? s : null;
}

function pick(flat: AnyRecord, keys: string[]): string | null {
  for (const key of keys) {
    const v = clean(flat[key]);
    if (v) return v;
  }
  return null;
}

function digits(value: string | null): string {
  return value ? value.replace(/\D/g, "") : "";
}

export type MappedLead = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  firm_name: string | null;
  city: string | null;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  lead_id: string | null;
};

export function mapLead(body: unknown): MappedLead {
  const flat = flatten(body);

  let first = pick(flat, ["first_name", "firstname", "fname", "given_name"]);
  let last = pick(flat, ["last_name", "lastname", "lname", "surname", "family_name"]);
  const full = pick(flat, ["full_name", "fullname", "name", "contact_name", "your_name"]);

  if (!first && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    first = parts[0] ?? null;
    if (!last && parts.length > 1) last = parts.slice(1).join(" ");
  }

  return {
    first_name: first,
    last_name: last,
    email: pick(flat, ["email", "email_address", "e_mail", "work_email", "emailaddress"])?.toLowerCase() ?? null,
    phone: pick(flat, ["phone", "phone_number", "phonenumber", "mobile", "mobile_number", "telephone", "tel", "contact_number"]),
    firm_name: pick(flat, ["firm_name", "firm", "company", "company_name", "business_name", "practice_name", "law_firm", "organisation", "organization"]),
    city: pick(flat, ["city", "town", "suburb", "location", "region"]),
    ad_name: pick(flat, ["ad_name", "adname", "ad", "ad_title"]),
    adset_name: pick(flat, ["adset_name", "adsetname", "adset", "ad_set_name", "ad_group_name"]),
    campaign_name: pick(flat, ["campaign_name", "campaignname", "campaign", "utm_campaign"]),
    lead_id: pick(flat, ["lead_id", "leadid", "leadgen_id", "id", "external_id", "submission_id"]),
  };
}

export async function ingestFirmLead(body: unknown): Promise<{ status: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const mapped = mapLead(body);
  const raw = (body && typeof body === "object" ? body : { value: body }) as AnyRecord;

  if (mapped.lead_id) {
    const { data } = await supabaseAdmin
      .from("firm_applications")
      .select("id")
      .eq("lead_id", mapped.lead_id)
      .maybeSingle();
    if (data) return { status: "duplicate_lead_id" };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const tail = digits(mapped.phone).slice(-9);

  if (tail.length === 9 || mapped.email) {
    const { data: recent } = await supabaseAdmin
      .from("firm_applications")
      .select("id, phone, email")
      .gte("created_at", since)
      .limit(2000);
    const dup = (recent ?? []).some((row) => {
      if (mapped.email && row.email && row.email.toLowerCase() === mapped.email) return true;
      if (tail.length === 9 && digits(row.phone).slice(-9) === tail) return true;
      return false;
    });
    if (dup) return { status: "duplicate_contact" };
  }

  const { data: created, error } = await supabaseAdmin
    .from("firm_applications")
    .insert({
      ...mapped,
      stage: "new",
      raw_payload: raw as never,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[firm-leads] insert failed", error.message);
    return { status: "error_logged" };
  }

  // A firm that applied is never cold called: pull it off the calling list now.
  await withdrawFromColdCalling({ id: created?.id ?? "", ...mapped });

  // Email alert — must never block or fail the lead save.
  await sendNewApplicationEmail(mapped);

  return { status: "created" };
}

async function withdrawFromColdCalling(app: {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  firm_name: string | null;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { withdrawProspectsForApplication } =
      await import("@/legal/lib/cold-calling/applicants.server");
    const n = await withdrawProspectsForApplication(supabaseAdmin as never, app);
    if (n > 0) console.log(`[firm-leads] withdrew ${n} prospect(s) from cold calling`);
  } catch (error) {
    console.error("[firm-leads] cold calling withdrawal threw", error);
  }
}

const ALERT_TO = "peter@gobold.com.au";
const ALERT_FROM = "Bold Alerts <alerts@bold-patients.com>";

function dash(value: string | null): string {
  return value && value.trim().length ? value.trim() : "-";
}

async function sendNewApplicationEmail(lead: MappedLead): Promise<void> {
  try {
    const lovableKey = legalEnv['LOVABLE_API_KEY'];
    const resendKey = legalEnv['RESEND_API_KEY'];
    if (!lovableKey || !resendKey) {
      console.error("[firm-leads] email skipped: missing LOVABLE_API_KEY or RESEND_API_KEY");
      return;
    }

    const name = dash([lead.first_name, lead.last_name].filter(Boolean).join(" ") || null);
    const text = [
      "🎉 New Legal Firm Application 🎉",
      "",
      `Name: ${name}`,
      `Company: ${dash(lead.firm_name)}`,
      `Phone: ${dash(lead.phone)}`,
      `Email: ${dash(lead.email)}`,
      `Campaign: ${dash(lead.campaign_name)}`,
    ].join("\n");

    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject: "🎉 New Legal Firm Application 🎉",
        text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[firm-leads] email send failed [${response.status}]: ${errorBody}`);
      return;
    }
    console.log("[firm-leads] email alert sent to", ALERT_TO);
  } catch (error) {
    console.error("[firm-leads] email send threw", error);
  }
}


export async function handleFirmLeadRequest(request: Request): Promise<Response> {
  const { authenticatedLeadTrigger, enqueueFirmBookingFollowUps } =
    await import("./firm-booking-follow-up.server");
  const automatedDelivery = authenticatedLeadTrigger(request);
  if (request.headers.has("x-firm-booking-secret") && !automatedDelivery) {
    return new Response("Unauthorized", { status: 401 });
  }
  let body: unknown = null;
  try {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // Accept form-encoded or plain-text bodies too.
        try {
          body = Object.fromEntries(new URLSearchParams(text));
        } catch {
          body = { body: text };
        }
      }
    }
  } catch (error) {
    console.error("[firm-leads] body read failed", error);
  }

  let status = "ignored";
  let bookingFollowUp: Awaited<ReturnType<typeof enqueueFirmBookingFollowUps>> | undefined;
  try {
    if (body !== null) status = (await ingestFirmLead(body)).status;
    if (automatedDelivery && body !== null) {
      if (status === "error_logged") throw new Error("Lead could not be saved");
      bookingFollowUp = await enqueueFirmBookingFollowUps(mapLead(body).lead_id);
    }
  } catch (error) {
    console.error("[firm-leads] ingest failed", error);
    status = "error_logged";
    // The trusted integration must retry failed enrollment; legacy receivers
    // retain their existing acknowledgement behavior.
    if (automatedDelivery) return Response.json({ ok: false, status }, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, status, booking_follow_up: bookingFollowUp }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
