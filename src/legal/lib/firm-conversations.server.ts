// Ported from the Legal app (family-law-floater/src/lib/firm-conversations.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { publicBaseUrl, toAuE164, twilioEnv, twilioForm, xmlEscape } from "./twilio.server";
import { smsOptIn, smsOptOut } from "./firm-conversations";

const db = supabaseAdmin as SupabaseClient;

/** Acknowledge only history already loaded by the reader, including older pages.
 * A reply arriving during this write must stay unread. */
export async function markFirmConversationRead(input: {
  applicationId: string;
  messageThrough: string | null;
  callThrough: string | null;
}) {
  const reviewedAt = new Date().toISOString();
  for (const [table, through] of [
    ["firm_application_messages", input.messageThrough],
    ["firm_application_calls", input.callThrough],
  ] as const) {
    if (!through) continue;
    const { error } = await db
      .from(table)
      .update({ reviewed_at: reviewedAt })
      .eq("application_id", input.applicationId)
      .eq("direction", "inbound")
      .lte("created_at", through)
      .is("reviewed_at", null);
    if (error) throw new Error(error.message);
  }
  return { reviewedAt };
}

export function firmSender() {
  const number = toAuE164(legalEnv["FIRM_COMMS_FROM"] || legalEnv["FIRM_BOOKING_SMS_FROM"]);
  if (!number?.startsWith("+614"))
    throw new Error("Configure a two-way Bold mobile number before calling or texting.");
  return number;
}
let verified: { key: string; until: number } | undefined;
export class FirmSenderConnectionError extends Error {}

export async function verifyFirmSender(options: { repair?: boolean; fresh?: boolean } = {}) {
  const from = firmSender();
  const { accountSid, authToken } = twilioEnv();
  const base = publicBaseUrl();
  const key = `${accountSid}:${from}:${base}`;
  if (!options.repair && !options.fresh && verified?.key === key && verified.until > Date.now())
    return from;
  verified = undefined;
  const query = new URLSearchParams({ PhoneNumber: from, PageSize: "1" });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?${query}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) throw new Error("Could not verify the Bold number. Please try again.");
  const data = await response.json();
  const number = data.incoming_phone_numbers?.find(
    (n: { phone_number: string }) => n.phone_number === from,
  );
  if (!number)
    throw new Error(
      "Your Bold number was not found in the connected Twilio account. Check the configured number and account.",
    );
  const missing = [
    !number.capabilities?.sms && "SMS",
    !number.capabilities?.voice && "voice",
  ].filter(Boolean);
  if (missing.length)
    throw new Error(
      `Your Bold number does not support ${missing.join(" and ")}. Configure an Australian mobile number that supports both texts and calls.`,
    );
  // Application and trunk routing take precedence over the number's webhook URLs.
  if (number.sms_application_sid || number.voice_application_sid || number.trunk_sid)
    throw new Error(
      "Your Bold number is routed through a Twilio application or SIP trunk. Switch its incoming message and call routing to webhooks in Twilio, then reconnect here.",
    );
  if (
    number.sms_url !== `${base}/api/public/legal/hooks/twilio-sms-inbound` ||
    number.sms_method !== "POST" ||
    number.voice_url !== `${base}/api/public/legal/hooks/twilio-voice-inbound` ||
    number.voice_method !== "POST"
  ) {
    if (!options.repair)
      throw new FirmSenderConnectionError(
        "Replies and callbacks are not connected to this app. Reconnect your Bold number to enable texting.",
      );
    if (!/^PN[0-9a-f]{32}$/i.test(number.sid || ""))
      throw new Error("Twilio did not return a valid number reference. Please try again.");
    const updated = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${number.sid}.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          SmsUrl: `${base}/api/public/legal/hooks/twilio-sms-inbound`,
          SmsMethod: "POST",
          VoiceUrl: `${base}/api/public/legal/hooks/twilio-voice-inbound`,
          VoiceMethod: "POST",
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!updated.ok)
      throw new Error(
        `Could not reconnect your Bold number (Twilio ${updated.status}). Check account permissions and try again.`,
      );
    // A successful write alone is not proof that the routing is now correct.
    return verifyFirmSender({ fresh: true });
  }
  verified = { key, until: Date.now() + 60_000 };
  return from;
}
export async function matchFirmPhone(phone: string) {
  const normal = toAuE164(phone);
  if (!normal) return null;
  const { data, error } = await db.rpc("match_firm_application", { p_phone: normal });
  if (error) throw new Error(error.message);
  return data as string | null;
}
export async function firmTextBlocked(phone: string) {
  // Include previous applications and booking-sequence replies, not just this profile.
  const { data, error } = await db
    .from("sms_messages")
    .select("body,created_at")
    .eq("direction", "inbound")
    .like("phone", `%${phone.slice(-9)}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  for (const message of data ?? []) {
    if (smsOptIn(message.body)) return false;
    if (smsOptOut(message.body)) return true;
  }
  return false;
}
export async function sendFirmText(input: {
  applicationId: string;
  id: string;
  body: string;
  userId: string;
}) {
  const { data: existing, error: readError } = await db
    .from("firm_application_messages")
    .select("*")
    .eq("id", input.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing) {
    if (
      existing.application_id !== input.applicationId ||
      existing.created_by !== input.userId ||
      existing.body !== input.body
    )
      throw new Error("This send reference is already in use.");
    return existing; // A lost response never causes a second SMS.
  }
  let phone: string | null = null;
  let from: string;
  try {
    const { data: app, error } = await db
      .from("firm_applications")
      .select("phone")
      .eq("id", input.applicationId)
      .single();
    if (error) throw new Error(error.message);
    phone = toAuE164(app.phone);
    if (!phone?.startsWith("+614"))
      throw new Error("Add a valid Australian mobile number to send a text.");
    if ((await matchFirmPhone(phone)) !== input.applicationId)
      throw new Error(
        "Multiple firm applications share this number. Resolve the duplicate before texting.",
      );
    if (await firmTextBlocked(phone)) throw new Error("This number has opted out of texts.");
    from = await verifyFirmSender();
  } catch (error) {
    return {
      status: "rejected",
      rejectionReason: error instanceof Error ? error.message : "Could not prepare this text.",
    };
  }
  const { data: message, error: insertError } = await db
    .from("firm_application_messages")
    .insert({
      id: input.id,
      application_id: input.applicationId,
      phone,
      local_number: from,
      direction: "outbound",
      body: input.body,
      status: "sending",
      created_by: input.userId,
    })
    .select("*")
    .single();
  if (insertError) {
    if (insertError.code === "23505") {
      const { data: duplicate, error: duplicateError } = await db
        .from("firm_application_messages")
        .select("*")
        .eq("id", input.id)
        .single();
      if (
        !duplicateError &&
        duplicate.application_id === input.applicationId &&
        duplicate.created_by === input.userId &&
        duplicate.body === input.body
      )
        return duplicate;
    }
    throw new Error(insertError.message);
  }
  const callback = new URL("/api/public/legal/hooks/twilio-sms-status", publicBaseUrl());
  callback.searchParams.set("firmMessageId", input.id);
  try {
    const result = await twilioForm(
      "/Messages.json",
      { To: phone!, From: from, Body: input.body, StatusCallback: callback.href },
      true,
    );
    const sid = typeof result.json["sid"] === "string" ? result.json["sid"] : "";
    if (result.ok && /^SM[0-9a-f]{32}$/i.test(sid)) {
      const { error: statusError } = await db.rpc("update_firm_sms_status", {
        p_id: input.id,
        p_sid: sid,
        p_status: String(result.json["status"] || "queued"),
        p_error: null,
      });
      if (statusError) throw statusError;
      return { ...message, status: String(result.json["status"] || "queued"), twilio_sid: sid };
    }
    // A 5xx/ambiguous response may already have delivered: never retry automatically.
    const status = result.status >= 500 || result.ok ? "unknown" : "failed";
    const { error: updateError } = await db
      .from("firm_application_messages")
      .update({ status, error_code: String(result.json["code"] || result.status) })
      .eq("id", input.id)
      .eq("status", "sending");
    if (updateError) throw updateError;
    return { ...message, status };
  } catch {
    await db
      .from("firm_application_messages")
      .update({ status: "unknown" })
      .eq("id", input.id)
      .eq("status", "sending");
    return { ...message, status: "unknown" };
  }
}
export async function receiveFirmCallback(params: Record<string, string>) {
  const from = toAuE164(params["From"]);
  const to = toAuE164(params["To"]);
  const sid = params["CallSid"];
  if (!from || !to || !/^CA[0-9a-f]{32}$/i.test(sid || "")) return null;
  const applicationId = await matchFirmPhone(from);
  if (!applicationId) return null;
  // Also recognise callbacks to older pool numbers used by this specific firm.
  let known = false;
  try {
    known = to === firmSender();
  } catch {
    /* legacy pool check below */
  }
  if (!known) {
    const { data, error } = await db
      .from("firm_application_calls")
      .select("id")
      .eq("application_id", applicationId)
      .eq("local_number", to)
      .limit(1);
    if (error) throw new Error(error.message);
    known = !!data?.length;
  }
  if (!known) return null;
  const { error } = await db.from("firm_application_calls").upsert(
    {
      application_id: applicationId,
      phone: from,
      local_number: to,
      direction: "inbound",
      twilio_call_sid: sid,
      status: "missed",
    },
    { onConflict: "twilio_call_sid", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  const { ringFirmCallback } = await import("./firm-callbacks.server");
  return ringFirmCallback(applicationId, sid!, from);
}
