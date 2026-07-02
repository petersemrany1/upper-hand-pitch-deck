import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "@/utils/error-logger.functions";

/**
 * Twilio service: the single place that talks to the Twilio REST API.
 * Server-side only.
 */

export function getTwilioCredentials():
  | { accountSid: string; authToken: string }
  | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return { accountSid, authToken };
}

/** Normalise an Australian phone number to E.164 (+61...). */
export function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

/**
 * Pick the least-recently-used active number from the outbound pool
 * (rotation reduces spam flagging). Falls back to TWILIO_FROM_NUMBER.
 */
export async function pickNextPoolNumber(): Promise<{ number: string }> {
  const fallback = process.env.TWILIO_FROM_NUMBER ?? "+61483938205";
  const { data, error } = await supabaseAdmin
    .from("phone_numbers")
    .select("id, number, call_count")
    .eq("status", "active")
    .eq("mms_enabled", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { number: fallback };

  await supabaseAdmin
    .from("phone_numbers")
    .update({ last_used_at: new Date().toISOString(), call_count: (data.call_count ?? 0) + 1 })
    .eq("id", data.id);

  return { number: data.number };
}

export type TwilioSmsResult =
  | { success: true; sid: string; status: string }
  | { success: false; error: string };

export type TwilioMessageResponse = {
  sid?: string;
  status?: string;
  message?: string;
  error_code?: string | number;
};

/**
 * Send an SMS/MMS through the Twilio REST API. Formats the recipient as an
 * AU number, logs failures to error_logs, never throws.
 */
export async function sendTwilioSms(args: {
  to: string;
  from: string;
  body?: string;
  mediaUrls?: string[];
  /** error_logs function_name for failures */
  logSource?: string;
}): Promise<TwilioSmsResult> {
  const creds = getTwilioCredentials();
  const source = args.logSource ?? "sendTwilioSms";
  if (!creds) {
    const msg = "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured";
    await logError(source, msg, {});
    return { success: false, error: msg };
  }
  if (!args.to.trim()) return { success: false, error: "Recipient phone is required" };
  if (!args.body && !(args.mediaUrls && args.mediaUrls.length)) {
    return { success: false, error: "Message body or media is required" };
  }

  const to = formatAUPhone(args.to);
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", args.from);
  if (args.body) params.set("Body", args.body);
  for (const url of args.mediaUrls ?? []) params.append("MediaUrl", url);

  const basicAuth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const result = (await res.json()) as TwilioMessageResponse;
    if (!res.ok) {
      await logError(source, result.message || "Twilio SMS failed", {
        status: res.status,
        raw: result,
        to,
      });
      return { success: false, error: result.message || `Twilio error ${res.status}` };
    }
    return { success: true, sid: result.sid ?? "", status: result.status ?? "queued" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error contacting Twilio";
    await logError(source, msg, { to });
    return { success: false, error: msg };
  }
}
