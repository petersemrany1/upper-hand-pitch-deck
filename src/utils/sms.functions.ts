import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getUserSmsSender, ensureSmsConversation } from "./sms-sender.server";
import { createServerFn } from "@tanstack/react-start";

import { createClient } from "@supabase/supabase-js";
import { logError } from "./error-logger.functions";

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

export const sendSms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { to: string; body?: string; mediaUrls?: string[] }) => ({
      to: String(data.to ?? ""),
      body: data.body ?? "",
      mediaUrls: Array.isArray(data.mediaUrls) ? data.mediaUrls.filter(Boolean) : [],
    }),
  )
  .handler(async ({ data, context }) => {
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

    const TWILIO_FROM = await getUserSmsSender(context.supabase, null, data.mediaUrls.length > 0);
    const formattedTo = formatAUPhone(data.to);
    const threadId = await ensureSmsConversation(formattedTo, TWILIO_FROM);
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
    const { error: insertErr } = await sb.from("sms_messages").insert({
      sender_user_id: context.userId,
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
export const markThreadRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string; readThrough?: string }) => ({ threadId: String(data.threadId ?? ""), readThrough: data.readThrough }))
  .handler(async ({ data, context }) => {
    if (!data.threadId) return { success: false as const, error: "threadId required" };
    const { data: thread, error } = await context.supabase.from("sms_threads").update({ unread_count: 0 }).eq("id", data.threadId).select("id").maybeSingle();
    if (!thread && !error) return { success: false as const, error: "Conversation not found" };
    if (error) return { success: false as const, error: error.message };
    // Acknowledge only messages already loaded, so a simultaneous new reply stays unread.
    const readThrough = new Date(Math.min(Date.now(), Date.parse(data.readThrough ?? "") || Date.now())).toISOString();
    const { error: ackError } = await context.supabase.from("notification_acknowledgements").upsert({
      user_id: context.userId, notification_type: "sms_thread", notification_key: data.threadId,
      acknowledged_at: readThrough, metadata: { last_message_at: readThrough },
    }, { onConflict: "user_id,notification_type,notification_key" });
    if (ackError) return { success: false as const, error: ackError.message };
    return { success: true as const };
  });

// Explicitly follow an older text conversation whose historical sender wasn't recorded.
export const followSmsConversation = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((data: { threadId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase.from("sms_threads").select("id").eq("id", data.threadId).maybeSingle();
    if (error || !thread) throw new Error("Conversation not found");
    const { error: followError } = await getAdminClient().from("sms_thread_participants").upsert({
      thread_id: thread.id, user_id: context.userId,
    }, { onConflict: "thread_id,user_id", ignoreDuplicates: true });
    if (followError) throw new Error(followError.message);
    return { success: true as const };
  });
