import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { logError } from "./error-logger.functions";

const TWILIO_FROM = "+61468031075";
const MMS_STATUS_CALLBACK_PATH = "/api/public/hooks/twilio-message-status";

function formatAUPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("61")) return "+" + cleaned;
  return "+61" + cleaned;
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or PUBLISHABLE_KEY).",
    );
  }
  return createClient(url, key);
}

// Always use the stable published domain so Twilio's status webhook can
// reach us regardless of which host (preview/prod) initiated the send.
const PUBLIC_STATUS_CALLBACK_BASE = "https://hairtransplantgroup.lovable.app";
function getMessageStatusCallbackUrl(): string | null {
  try {
    return new URL(MMS_STATUS_CALLBACK_PATH, PUBLIC_STATUS_CALLBACK_BASE).toString();
  } catch {
    return null;
  }
}

export const sendSms = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { to: string; body?: string; mediaUrls?: string[] }) => ({
      to: String(data.to ?? ""),
      body: data.body ?? "",
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls.filter(Boolean) : [],
    }),
  )
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return { success: false as const, error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured" };
    }
    if (!data.to.trim()) {
      return { success: false as const, error: "Recipient phone is required" };
    }
    if (!data.body && data.mediaUrls.length === 0) {
      return { success: false as const, error: "Message body or media is required" };
    }

    const formattedTo = formatAUPhone(data.to);
    const params = new URLSearchParams();
    params.set("To", formattedTo);
    params.set("From", TWILIO_FROM);
    if (data.body) params.set("Body", data.body);
    for (const url of data.mediaUrls) params.append("MediaUrl", url);
    const statusCallback = getMessageStatusCallbackUrl();
    if (statusCallback) params.set("StatusCallback", statusCallback);

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    let twilioResult: { sid?: string; error_code?: string | number; message?: string; status?: string } = {};
    try {
      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      twilioResult = await res.json();
      if (!res.ok) {
        await logError("sendSms", twilioResult.message || "Twilio SMS failed", {
          status: res.status, raw: twilioResult, to: formattedTo,
          stepsToReproduce: `Sent SMS to ${formattedTo} via Twilio REST API`,
        });
        return { success: false as const, error: twilioResult.message || `Twilio error ${res.status}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error contacting Twilio";
      await logError("sendSms", msg, { to: formattedTo });
      return { success: false as const, error: msg };
    }

    // Persist to DB
    const sb = getAdminClient();
    let threadId: string | null = null;
    const { data: existing } = await sb
      .from("sms_threads")
      .select("id")
      .eq("phone", formattedTo)
      .maybeSingle();
    if (existing?.id) {
      threadId = existing.id;
    } else {
      const { data: created, error: cErr } = await sb
        .from("sms_threads")
        .insert({ phone: formattedTo })
        .select("id")
        .single();
      if (cErr || !created) {
        await logError("sendSms", "Failed to create thread row", { phone: formattedTo, raw: cErr });
        return { success: true as const, sid: twilioResult.sid, warning: "Sent but DB thread create failed" };
      }
      threadId = created.id;
    }

    const { error: insertErr } = await sb.from("sms_messages").insert({
      thread_id: threadId,
      direction: "outbound",
      body: data.body || null,
      media_urls: data.mediaUrls,
      twilio_message_sid: twilioResult.sid ?? null,
      status: twilioResult.status ?? "queued",
      from_number: TWILIO_FROM,
      to_number: formattedTo,
    });
    if (insertErr) {
      await logError("sendSms", "Failed to insert message row", { raw: insertErr });
    }

    return { success: true as const, sid: twilioResult.sid, threadId };
  });

// Reset unread count when user opens a thread
export const markThreadRead = createServerFn({ method: "POST" })
  .inputValidator((data: { threadId: string }) => ({ threadId: String(data.threadId ?? "") }))
  .handler(async ({ data }) => {
    if (!data.threadId) return { success: false as const, error: "threadId required" };
    const sb = getAdminClient();
    const { error } = await sb.from("sms_threads").update({ unread_count: 0 }).eq("id", data.threadId);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });
