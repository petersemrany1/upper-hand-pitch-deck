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

  // AU mobile numbers require an approved regulatory bundle on purchase.
  const bundlesUrl = "https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles?" + new URLSearchParams({
    IsoCountry: "AU",
    NumberType: "mobile",
    Status: "twilio-approved",
    PageSize: "20",
  }).toString();
  const bundlesRes = await fetch(bundlesUrl, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const bundlesData = await bundlesRes.json();
  if (!bundlesRes.ok) {
    await logError("provisionNumber", bundlesData.message || "Twilio bundle lookup failed", { rawResponse: bundlesData });
    return { success: false as const, error: bundlesData.message || "Failed to find AU mobile regulatory bundle" };
  }
  const bundleSid: string | undefined = (bundlesData.results ?? []).find(
    (bundle: { sid?: string; status?: string }) => bundle.sid && bundle.status === "twilio-approved"
  )?.sid;
  if (!bundleSid) {
    return { success: false as const, error: "No approved AU mobile regulatory bundle found in Twilio" };
  }

  // Twilio requires the purchase AddressSid to be the exact address attached to
  // the approved bundle. Pull it from the bundle's supporting document instead
  // of guessing from the account-wide address list.
  const assignmentsUrl = `https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments?PageSize=50`;
  const assignmentsRes = await fetch(assignmentsUrl, {
    method: "GET",
    headers: { Authorization: authHeader },
  });
  const assignmentsData = await assignmentsRes.json();
  if (!assignmentsRes.ok) {
    await logError("provisionNumber", assignmentsData.message || "Twilio bundle item lookup failed", { rawResponse: assignmentsData, bundleSid });
    return { success: false as const, error: assignmentsData.message || "Failed to inspect AU mobile regulatory bundle" };
  }

  let addressSid: string | undefined;
  const supportingDocumentSids = (assignmentsData.results ?? [])
    .map((assignment: { object_sid?: string }) => assignment.object_sid)
    .filter((objectSid: string | undefined): objectSid is string => Boolean(objectSid?.startsWith("RD")));

  for (const supportingDocumentSid of supportingDocumentSids) {
    const documentRes = await fetch(`https://numbers.twilio.com/v2/RegulatoryCompliance/SupportingDocuments/${supportingDocumentSid}`, {
      method: "GET",
      headers: { Authorization: authHeader },
    });
    const documentData = await documentRes.json();
    if (!documentRes.ok) {
      await logError("provisionNumber", documentData.message || "Twilio supporting document lookup failed", { rawResponse: documentData, bundleSid, supportingDocumentSid });
      continue;
    }
    const addressSids = documentData.attributes?.address_sids;
    if (Array.isArray(addressSids) && typeof addressSids[0] === "string") {
      addressSid = addressSids[0];
      break;
    }
  }

  if (!addressSid) {
    return { success: false as const, error: "Approved AU mobile bundle has no linked address. Add an address to the approved Twilio bundle, then try again." };
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
      BundleSid: bundleSid,
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
  .inputValidator((data: { id: string; release?: boolean }) => data)
  .handler(async ({ data }) => {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("phone_numbers")
      .select("id, twilio_sid")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr || !row) {
      return { success: false as const, error: fetchErr?.message || "Number not found" };
    }

    // Release from Twilio (stops billing) when requested.
    if (data.release && row.twilio_sid) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) {
        return { success: false as const, error: "Twilio credentials not configured" };
      }
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const releaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${row.twilio_sid}.json`;
      const res = await fetch(releaseUrl, { method: "DELETE", headers: { Authorization: authHeader } });
      if (!res.ok && res.status !== 404) {
        const body = await res.text();
        await logError("retireNumber", `Twilio release failed: ${res.status}`, { body });
        return { success: false as const, error: `Failed to release from Twilio: ${body}` };
      }
      // Remove the row entirely once released.
      const { error: delErr } = await supabaseAdmin.from("phone_numbers").delete().eq("id", data.id);
      if (delErr) return { success: false as const, error: delErr.message };
      return { success: true as const, released: true };
    }

    // Soft retire: keep the number in Twilio, just stop using it in rotation.
    const { error } = await supabaseAdmin
      .from("phone_numbers")
      .update({ status: "retired" })
      .eq("id", data.id);
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, released: false };
  });
