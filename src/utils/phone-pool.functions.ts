import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "./error-logger.functions";

// Twilio outbound number pool. Rotates across numbers in `phone_numbers` so
// outbound traffic isn't concentrated on one DID (helps reduce spam flagging).

export const provisionNumber = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!accountSid || !authToken) {
      return { success: false as const, error: "Twilio credentials not configured" };
    }

  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  // Step 1: search for an available AU mobile number
  const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/AU/Mobile.json?SmsEnabled=true&VoiceEnabled=true&Limit=1`;
  const searchRes = await fetch(searchUrl, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const searchData = await searchRes.json();
  if (!searchRes.ok) {
    await logError("provisionNumber", searchData.message || "Twilio search failed", { rawResponse: searchData });
    return { success: false as const, error: searchData.message || "Failed to search for numbers" };
  }
  const available = searchData.available_phone_numbers ?? [];
  if (available.length === 0) {
    return { success: false as const, error: "No AU mobile numbers available in Twilio inventory" };
  }
  const phoneNumber: string = available[0].phone_number;

  // AU mobile numbers require a regulatory address on purchase. Use the first
  // validated AU address already present on the Twilio account.
  const addressesUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Addresses.json?IsoCountry=AU&PageSize=20`;
  const addressesRes = await fetch(addressesUrl, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const addressesData = await addressesRes.json();
  if (!addressesRes.ok) {
    await logError("provisionNumber", addressesData.message || "Twilio address lookup failed", { rawResponse: addressesData });
    return { success: false as const, error: addressesData.message || "Failed to find AU regulatory address" };
  }
  const addressSid: string | undefined = (addressesData.addresses ?? []).find(
    (address: { sid?: string; iso_country?: string; validated?: boolean }) =>
      address.sid && address.iso_country === "AU" && address.validated !== false
  )?.sid;
  if (!addressSid) {
    return { success: false as const, error: "No validated AU regulatory address found in Twilio" };
  }

  // Step 2: purchase it
  const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
  const purchaseRes = await fetch(purchaseUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      PhoneNumber: phoneNumber,
      AddressSid: addressSid,
      FriendlyName: `UpperHand-Pool-${Date.now()}`,
      VoiceUrl: `${supabaseUrl}/functions/v1/voice-inbound`,
      VoiceMethod: "POST",
      SmsUrl: `${supabaseUrl}/functions/v1/sms-inbound`,
      SmsMethod: "POST",
    }),
  });
  const result = await purchaseRes.json();
  if (!purchaseRes.ok) {
    await logError("provisionNumber", result.message || "Twilio purchase failed", { rawResponse: result });
    return { success: false as const, error: result.message || "Failed to provision number" };
  }

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logError("provisionNumber", `Unhandled: ${msg}`, {});
    return { success: false as const, error: msg || "Failed to provision number" };
  }
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
