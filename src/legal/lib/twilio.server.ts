// Ported from the Legal app (family-law-floater/src/lib/twilio.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Server-only Twilio helpers: number pool rotation, AU E.164 formatting,
// signature validation and SMS sending. Never import from client code.
import { createHmac, timingSafeEqual } from "node:crypto";
import { canonicalPublicBaseUrl } from "./public-base-url";

const API_BASE = "https://api.twilio.com/2010-04-01";

export function twilioEnv() {
  const accountSid = legalEnv["TWILIO_ACCOUNT_SID"];
  const authToken = legalEnv["TWILIO_AUTH_TOKEN"];
  if (!accountSid || !authToken) throw new Error("Twilio credentials are not configured");
  return { accountSid, authToken };
}

/** Australian E.164. Returns null when the input cannot be parsed — never dial a guess. */
export function toAuE164(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = String(input).replace(/[^\d+]/g, "");
  if (d.startsWith("+")) {
    const rest = d.slice(1).replace(/\D/g, "");
    if (rest.startsWith("61") && rest.length === 11) return `+${rest}`;
    return null;
  }
  d = d.replace(/\D/g, "");
  if (d.startsWith("61") && d.length === 11) return `+${d}`;
  if (d.startsWith("0") && d.length === 10) return `+61${d.slice(1)}`;
  if (d.length === 9) return `+61${d}`;
  return null;
}

export function last9(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(-9);
}

/** Validate an inbound Twilio webhook signature (X-Twilio-Signature). */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const { authToken } = twilioEnv();
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Least-recently-used active number, then bump last_used_at / call_count. */
export async function claimPoolNumber(exclude?: string | null): Promise<string | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("phone_numbers")
    .select("id, number, call_count, last_used_at")
    .eq("status", "active");
  if (exclude) query = query.neq("number", exclude);
  const { data } = await query
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  await supabaseAdmin
    .from("phone_numbers")
    .update({ last_used_at: new Date().toISOString(), call_count: (data.call_count ?? 0) + 1 })
    .eq("id", data.id);
  return data.number;
}

export async function twilioForm(
  path: string,
  body: Record<string, string>,
  redactErrors = false,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const { accountSid, authToken } = twilioEnv();
  const response = await fetch(`${API_BASE}/Accounts/${accountSid}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { raw: text };
  }
  if (!response.ok)
    console.error(`[twilio] ${path} failed [${response.status}]${redactErrors ? "" : `: ${text}`}`);
  return { ok: response.ok, status: response.status, json };
}

export type SendSmsResult = { ok: boolean; sid?: string; error?: string; from?: string };

/** Send an SMS from a rotating pool number and record it on the lead's thread. */
export async function sendSmsToLead(
  leadId: string | null,
  toRaw: string | null,
  body: string,
): Promise<SendSmsResult> {
  const to = toAuE164(toRaw);
  if (!to) return { ok: false, error: "Could not parse that phone number" };

  const from = await claimPoolNumber();
  if (!from) return { ok: false, error: "No active number in the pool" };

  const statusCallback = `${publicBaseUrl()}/api/public/hooks/twilio-sms-status`;
  const result = await twilioForm("/Messages.json", {
    To: to,
    From: from,
    Body: body,
    StatusCallback: statusCallback,
  });
  if (!result.ok)
    return { ok: false, error: String(result.json["message"] ?? "Twilio send failed") };

  const sid = String(result.json["sid"] ?? "");
  await recordOutboundSms(leadId, to, body, sid);
  return { ok: true, sid, from };
}

export async function recordOutboundSms(
  leadId: string | null,
  phone: string,
  body: string,
  sid: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const threadId = await ensureThread(leadId, phone);
  await supabaseAdmin.from("sms_messages").insert({
    thread_id: threadId,
    lead_id: leadId,
    direction: "outbound",
    body,
    twilio_sid: sid,
    delivery_status: "queued",
    phone,
  });
}

export async function ensureThread(leadId: string | null, phone: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const tail = last9(phone);
  const { data: existing } = await supabaseAdmin
    .from("sms_threads")
    .select("id, phone")
    .order("created_at", { ascending: false })
    .limit(500);
  const match = (existing ?? []).find((t) => last9(t.phone) === tail);
  if (match) {
    await supabaseAdmin
      .from("sms_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", match.id);
    return match.id;
  }
  const { data: created } = await supabaseAdmin
    .from("sms_threads")
    .insert({ lead_id: leadId, phone, last_message_at: new Date().toISOString() })
    .select("id")
    .single();
  return created?.id ?? null;
}

export function publicBaseUrl(): string {
  return canonicalPublicBaseUrl(legalEnv["PUBLIC_BASE_URL"]);
}

/**
 * Read a Twilio webhook body and validate its signature. Twilio signs the exact
 * URL it requested, so try the request URL first, then the configured public
 * base URL (proxies rewrite the host on this platform).
 */
export async function readTwilioWebhook(
  request: Request,
  path: string,
): Promise<{ params: Record<string, string>; valid: boolean }> {
  const raw = await request.text();
  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(raw).entries()) params[key] = value;
  const signature = request.headers.get("x-twilio-signature");
  const candidates = [request.url, `${publicBaseUrl()}${path}`, request.url.split("?")[0] ?? ""];
  const valid = candidates.some((url) => url && validateTwilioSignature(url, params, signature));
  return { params, valid };
}

export function twimlResponse(xml: string, status = 200): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    status,
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Find a lead by the last 9 digits of a phone number. */
export async function findLeadByPhone(
  phone: string,
): Promise<{ id: string; rep_id: string | null } | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const tail = last9(phone);
  if (!tail) return null;
  const { data } = await supabaseAdmin
    .from("client_leads")
    .select("id, rep_id, phone")
    .order("created_at", { ascending: false })
    .limit(2000);
  const match = (data ?? []).find((row) => last9(row.phone) === tail);
  return match ? { id: match.id, rep_id: match.rep_id } : null;
}

/** Isolated Bold offer sender. Do not put private workspace links in consumer SMS history. */
export async function sendBoldOfferSms(
  to: string,
  body: string,
  jobId: string,
): Promise<SendSmsResult> {
  const { providerActionsEnabled } = await import("./firm-offers/providers.server");
  if (!providerActionsEnabled() || legalEnv["BOLD_SENDER_APPROVED"] !== "true")
    throw new Error("Bold offer SMS is disabled");
  const from = legalEnv["BOLD_OFFER_SMS_FROM"];
  if (!from) throw new Error("Configure the approved BOLD_OFFER_SMS_FROM");
  if (
    legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
    !(legalEnv["BOLD_TEST_RECIPIENT_MOBILES"] ?? "")
      .split(",")
      .map((v) => v.trim())
      .includes(to)
  )
    throw new Error("SMS test recipient is not allowlisted");
  const origin = legalEnv["BOLD_OFFER_ORIGIN"];
  if (!origin) throw new Error("Configure BOLD_OFFER_ORIGIN");
  const callback = new URL("/api/public/firm-offers/sms-status", origin);
  callback.searchParams.set("job", jobId);
  const result = await twilioForm(
    "/Messages.json",
    { To: to, From: from, Body: body, StatusCallback: callback.href },
    true,
  );
  return { ok: result.ok, ...(result.ok ? { sid: String(result.json["sid"] ?? "") } : {}), from };
}
