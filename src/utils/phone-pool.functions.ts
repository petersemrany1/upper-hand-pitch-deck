import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "./error-logger.functions";

// Twilio outbound number pool. Rotates across numbers in `phone_numbers` so
// outbound traffic isn't concentrated on one DID (helps reduce spam flagging).

export const provisionNumber = createServerFn({ method: "POST" }).handler(async () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!accountSid || !authToken) {
    return { success: false as const, error: "Twilio credentials not configured" };
  }

  const voiceUrl = `${supabaseUrl}/functions/v1/voice-inbound`;
  const smsUrl = `${supabaseUrl}/functions/v1/sms-inbound`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      AreaCode: "02",
      VoiceUrl: voiceUrl,
      VoiceMethod: "POST",
      SmsUrl: smsUrl,
      SmsMethod: "POST",
    }),
  });
  const result = await response.json();
  if (!response.ok) {
    await logError("provisionNumber", result.message || "Twilio provisioning failed", { rawResponse: result });
    return { success: false as const, error: result.message || "Failed to provision number" };
  }

  const phoneNumber: string = result.phone_number;
  const sid: string = result.sid;
  const friendly: string | null = result.friendly_name ?? null;

  const { error } = await supabaseAdmin.from("phone_numbers").insert({
    number: phoneNumber,
    twilio_sid: sid,
    friendly_name: friendly,
    status: "active",
  });
  if (error) {
    await logError("provisionNumber", error.message, { phoneNumber, sid });
    return { success: false as const, error: error.message };
  }
  return { success: true as const, number: phoneNumber };
});

export const getNextNumber = createServerFn({ method: "POST" }).handler(async () => {
  const fallback = process.env.TWILIO_FROM_NUMBER ?? "+61483938205";
  const { data, error } = await supabaseAdmin
    .from("phone_numbers")
    .select("id, number, call_count")
    .eq("status", "active")
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { number: fallback };
  }

  await supabaseAdmin
    .from("phone_numbers")
    .update({ last_used_at: new Date().toISOString(), call_count: (data.call_count ?? 0) + 1 })
    .eq("id", data.id);

  return { number: data.number };
});

export const listPhoneNumbers = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("phone_numbers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { success: false as const, error: error.message, numbers: [] };
  return { success: true as const, numbers: data ?? [] };
});

export const retireNumber = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("phone_numbers")
      .update({ status: "retired" })
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const };
  });
