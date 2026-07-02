import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "@/utils/error-logger.functions";
import { formatAUPhone, sendTwilioSms } from "./twilio.server";

/**
 * SMS service: sending messages AND recording them on the right
 * sms_threads / sms_messages rows so the inbox stays consistent.
 * Server-side only.
 */

/** Find or create the sms_threads row for a phone number. Returns thread id. */
export async function ensureSmsThread(phone: string): Promise<string | null> {
  const formatted = formatAUPhone(phone);
  const { data: existing } = await supabaseAdmin
    .from("sms_threads")
    .select("id")
    .eq("phone", formatted)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("sms_threads")
    .insert({ phone: formatted })
    .select("id")
    .single();
  if (error || !created) {
    await logError("ensureSmsThread", "Failed to create thread row", {
      raw: error,
    });
    return null;
  }
  return created.id;
}

export type SendAndRecordResult =
  | { success: true; sid: string; threadId: string | null; warning?: string }
  | { success: false; error: string };

/**
 * Send an SMS via Twilio and persist it to the inbox (thread + message rows).
 * The standard path for every outbound SMS that should appear in the inbox.
 */
export async function sendAndRecordSms(args: {
  to: string;
  from: string;
  body?: string;
  mediaUrls?: string[];
  logSource?: string;
}): Promise<SendAndRecordResult> {
  const sent = await sendTwilioSms(args);
  if (!sent.success) return sent;

  const to = formatAUPhone(args.to);
  const threadId = await ensureSmsThread(to);
  if (!threadId) {
    return { success: true, sid: sent.sid, threadId: null, warning: "Sent but DB thread create failed" };
  }

  const { error } = await supabaseAdmin.from("sms_messages").insert({
    thread_id: threadId,
    direction: "outbound",
    body: args.body || null,
    media_urls: args.mediaUrls ?? [],
    twilio_message_sid: sent.sid || null,
    status: sent.status,
    from_number: args.from,
    to_number: to,
  });
  if (error) {
    await logError(args.logSource ?? "sendAndRecordSms", "Failed to insert message row", { raw: error });
  }

  return { success: true, sid: sent.sid, threadId };
}
