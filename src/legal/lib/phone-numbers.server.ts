// Ported from the Legal app (family-law-floater/src/lib/phone-numbers.server.ts). Re-run the port script to refresh.
// Server-only Twilio number-pool provisioning: buy AU mobile numbers (regulatory
// bundle + address), release them, and log every failure to error_logs.
import { publicBaseUrl, twilioEnv } from "./twilio.server";

const API_BASE = "https://api.twilio.com/2010-04-01";
const NUMBERS_BASE = "https://numbers.twilio.com/v2";

type TwilioResult = { ok: boolean; status: number; json: Record<string, unknown>; raw: string };

function basicAuth(): string {
  const { accountSid, authToken } = twilioEnv();
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function twilioRequest(
  url: string,
  init?: { method?: string; body?: Record<string, string> },
): Promise<TwilioResult> {
  const method = init?.method ?? "GET";
  const headers: Record<string, string> = { Authorization: basicAuth() };
  let body: string | undefined;
  if (init?.body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.body).toString();
  }
  const response = await fetch(url, { method, headers, ...(body ? { body } : {}) });
  const raw = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    json = { raw };
  }
  return { ok: response.ok, status: response.status, json, raw };
}

export async function logTwilioError(
  source: string,
  message: string,
  detail: Record<string, unknown>,
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    await supabaseAdmin.from("error_logs").insert({ source, message, detail: detail as never });
  } catch (error) {
    console.error("[phone-numbers] failed to write error_logs", error);
  }
}

/** A failure that already carries a user-facing message. */
class PoolError extends Error {}

async function fail(message: string, detail: Record<string, unknown>): Promise<never> {
  await logTwilioError("buy_phone_number", message, detail);
  throw new PoolError(message);
}

/** Turn a failed Twilio response into a message that names the real problem. */
function twilioMessage(step: string, result: TwilioResult): string {
  const code = result.json["code"];
  const message = String(result.json["message"] ?? result.raw.slice(0, 300) ?? "no response body");
  if (result.status === 401 || code === 20003) {
    return `Twilio rejected our credentials (HTTP 401, code 20003) on the ${step} step. The TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN saved here are not valid for this account — update them in project secrets, then try again.`;
  }
  if (result.status === 403 || result.status === 402) {
    return `Twilio refused the ${step} step (HTTP ${result.status}${code ? `, code ${String(code)}` : ""}): ${message}`;
  }
  return `Twilio ${step} failed (HTTP ${result.status}${code ? `, code ${String(code)}` : ""}): ${message}`;
}

type AvailableNumber = {
  phone_number?: string;
  friendly_name?: string;
  capabilities?: Record<string, boolean>;
};

export async function buyAuMobileNumber(): Promise<{ number: string; sid: string; friendlyName: string }> {
  const { accountSid } = twilioEnv();

  // 1. Search AU mobile inventory with all capabilities.
  const searchUrl =
    `${API_BASE}/Accounts/${accountSid}/AvailablePhoneNumbers/AU/Mobile.json` +
    `?SmsEnabled=true&VoiceEnabled=true&MmsEnabled=true&Limit=5`;
  const search = await twilioRequest(searchUrl);
  if (!search.ok) {
    await fail(twilioMessage("number search", search), {
      step: "search",
      status: search.status,
      twilio: search.json,
      raw: search.raw,
    });
  }
  const candidates = (search.json["available_phone_numbers"] as AvailableNumber[] | undefined) ?? [];
  const picked = candidates.find((c) => c.capabilities?.["MMS"] === true || c.capabilities?.["mms"] === true);
  if (!picked?.phone_number) {
    await fail("No MMS-capable AU mobile numbers available right now — try again later.", {
      step: "search",
      status: search.status,
      twilio: search.json,
    });
  }
  const phoneNumber = picked!.phone_number!;

  // 2. AU mobiles need an approved regulatory bundle.
  const bundlesUrl =
    `${NUMBERS_BASE}/RegulatoryCompliance/Bundles` +
    `?IsoCountry=AU&NumberType=mobile&Status=twilio-approved&PageSize=20`;
  const bundles = await twilioRequest(bundlesUrl);
  const bundleList =
    (bundles.json["results"] as Array<Record<string, unknown>> | undefined) ??
    (bundles.json["bundles"] as Array<Record<string, unknown>> | undefined) ??
    [];
  const bundle = bundleList.find((b) => String(b["status"]) === "twilio-approved");
  const bundleSid = bundle ? String(bundle["sid"]) : null;
  if (!bundles.ok) {
    await fail(twilioMessage("regulatory bundle lookup", bundles), {
      step: "bundles",
      status: bundles.status,
      twilio: bundles.json,
      raw: bundles.raw,
    });
  }
  if (!bundleSid) {
    await fail("No approved AU mobile regulatory bundle found in Twilio.", {
      step: "bundles",
      status: bundles.status,
      twilio: bundles.json,
    });
  }

  // 3. The purchase must use the address attached to that bundle.
  const assignments = await twilioRequest(
    `${NUMBERS_BASE}/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments?PageSize=50`,
  );
  const items = (assignments.json["results"] as Array<Record<string, unknown>> | undefined) ?? [];
  const documentSids = items
    .map((item) => String(item["object_sid"] ?? ""))
    .filter((sid) => sid.startsWith("RD"));

  let addressSid: string | null = null;
  const documentDetail: Array<Record<string, unknown>> = [];
  for (const documentSid of documentSids) {
    const document = await twilioRequest(
      `${NUMBERS_BASE}/RegulatoryCompliance/SupportingDocuments/${documentSid}`,
    );
    documentDetail.push({ documentSid, status: document.status, body: document.json });
    const attributes = document.json["attributes"] as Record<string, unknown> | undefined;
    const addressSids = attributes?.["address_sids"];
    if (Array.isArray(addressSids) && addressSids.length > 0) {
      addressSid = String(addressSids[0]);
      break;
    }
  }
  if (!assignments.ok) {
    await fail(twilioMessage("bundle item assignments", assignments), {
      step: "assignments",
      bundleSid,
      status: assignments.status,
      twilio: assignments.json,
      raw: assignments.raw,
    });
  }
  if (!addressSid) {
    await fail("Approved AU bundle has no linked address — add an address to the bundle in Twilio, then try again.", {
      step: "address",
      bundleSid,
      assignments: assignments.json,
      documents: documentDetail,
    });
  }

  // 4. Purchase, wired to this project's inbound webhooks.
  const base = publicBaseUrl();
  const friendlyName = `LegalGroup-Pool-${Date.now()}`;
  const purchase = await twilioRequest(`${API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
    method: "POST",
    body: {
      PhoneNumber: phoneNumber,
      BundleSid: bundleSid!,
      AddressSid: addressSid!,
      FriendlyName: friendlyName,
      VoiceUrl: `${base}/api/public/hooks/twilio-voice-inbound`,
      VoiceMethod: "POST",
      SmsUrl: `${base}/api/public/hooks/twilio-sms-inbound`,
      SmsMethod: "POST",
    },
  });
  if (!purchase.ok) {
    const message = String(purchase.json["message"] ?? "Twilio refused the purchase");
    await fail(`Could not buy ${phoneNumber}: ${message}`, {
      step: "purchase",
      status: purchase.status,
      phoneNumber,
      bundleSid,
      addressSid,
      twilio: purchase.json,
    });
  }

  return {
    number: String(purchase.json["phone_number"] ?? phoneNumber),
    sid: String(purchase.json["sid"] ?? ""),
    friendlyName,
  };
}

/** Release a number from the Twilio account. Returns true when Twilio no longer owns it. */
export async function releaseTwilioNumber(number: string): Promise<{ ok: boolean; error?: string }> {
  const { accountSid } = twilioEnv();
  const lookup = await twilioRequest(
    `${API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(number)}`,
  );
  if (!lookup.ok) {
    await logTwilioError("release_phone_number", `Lookup failed for ${number}`, {
      status: lookup.status,
      twilio: lookup.json,
    });
    return { ok: false, error: String(lookup.json["message"] ?? "Could not reach Twilio") };
  }
  const owned = (lookup.json["incoming_phone_numbers"] as Array<Record<string, unknown>> | undefined) ?? [];
  const sid = owned[0] ? String(owned[0]["sid"]) : null;
  // Already gone from Twilio — the row can still be cleaned up.
  if (!sid) return { ok: true };

  const deleted = await twilioRequest(`${API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`, {
    method: "DELETE",
  });
  if (!deleted.ok) {
    await logTwilioError("release_phone_number", `Release failed for ${number}`, {
      status: deleted.status,
      sid,
      twilio: deleted.json,
    });
    return { ok: false, error: String(deleted.json["message"] ?? "Twilio refused the release") };
  }
  return { ok: true };
}


/**
 * Run the purchase flow's read-only steps (search -> bundle -> address) without buying.
 * Returns one entry per step so the UI can show exactly where Twilio says no.
 */
export async function dryRunPurchaseSteps(): Promise<
  Array<{ step: string; ok: boolean; status: number; detail: string }>
> {
  const { accountSid } = twilioEnv();
  const steps: Array<{ step: string; ok: boolean; status: number; detail: string }> = [];

  const search = await twilioRequest(
    `${API_BASE}/Accounts/${accountSid}/AvailablePhoneNumbers/AU/Mobile.json` +
      `?SmsEnabled=true&VoiceEnabled=true&MmsEnabled=true&Limit=5`,
  );
  const candidates = (search.json["available_phone_numbers"] as AvailableNumber[] | undefined) ?? [];
  steps.push({
    step: "search",
    ok: search.ok,
    status: search.status,
    detail: search.ok
      ? `${candidates.length} AU mobile candidate(s)`
      : twilioMessage("number search", search),
  });
  if (!search.ok) return steps;

  const bundles = await twilioRequest(
    `${NUMBERS_BASE}/RegulatoryCompliance/Bundles?IsoCountry=AU&NumberType=mobile&Status=twilio-approved&PageSize=20`,
  );
  const bundleList = (bundles.json["results"] as Array<Record<string, unknown>> | undefined) ?? [];
  const bundleSid = bundleList[0] ? String(bundleList[0]["sid"]) : null;
  steps.push({
    step: "bundle",
    ok: bundles.ok && Boolean(bundleSid),
    status: bundles.status,
    detail: !bundles.ok
      ? twilioMessage("regulatory bundle lookup", bundles)
      : bundleSid
        ? `approved bundle ${bundleSid}`
        : "No approved AU mobile regulatory bundle on the account",
  });
  if (!bundles.ok || !bundleSid) return steps;

  const assignments = await twilioRequest(
    `${NUMBERS_BASE}/RegulatoryCompliance/Bundles/${bundleSid}/ItemAssignments?PageSize=50`,
  );
  const items = (assignments.json["results"] as Array<Record<string, unknown>> | undefined) ?? [];
  let addressSid: string | null = null;
  for (const item of items) {
    const documentSid = String(item["object_sid"] ?? "");
    if (!documentSid.startsWith("RD")) continue;
    const document = await twilioRequest(
      `${NUMBERS_BASE}/RegulatoryCompliance/SupportingDocuments/${documentSid}`,
    );
    const attributes = document.json["attributes"] as Record<string, unknown> | undefined;
    const addressSids = attributes?.["address_sids"];
    if (Array.isArray(addressSids) && addressSids.length > 0) {
      addressSid = String(addressSids[0]);
      break;
    }
  }
  steps.push({
    step: "address",
    ok: Boolean(addressSid),
    status: assignments.status,
    detail: addressSid ? `address ${addressSid}` : "Bundle has no linked address",
  });
  return steps;
}

/** Numbers on the Twilio account whose FriendlyName marks them as ours. */
export async function listPoolNumbersOnTwilio(): Promise<
  | { ok: true; numbers: Array<{ sid: string; number: string; friendlyName: string; voiceUrl: string; smsUrl: string }> }
  | { ok: false; error: string }
> {
  const { accountSid } = twilioEnv();
  const result = await twilioRequest(
    `${API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=100`,
  );
  if (!result.ok) return { ok: false, error: twilioMessage("owned number lookup", result) };
  const owned = (result.json["incoming_phone_numbers"] as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    ok: true,
    numbers: owned
      .filter((n) => String(n["friendly_name"] ?? "").startsWith("LegalGroup-Pool"))
      .map((n) => ({
        sid: String(n["sid"] ?? ""),
        number: String(n["phone_number"] ?? ""),
        friendlyName: String(n["friendly_name"] ?? ""),
        voiceUrl: String(n["voice_url"] ?? ""),
        smsUrl: String(n["sms_url"] ?? ""),
      })),
  };
}

/** Point an owned number's inbound webhooks at this project's live routes. */
export async function repairInboundUrls(sid: string): Promise<boolean> {
  const { accountSid } = twilioEnv();
  const base = publicBaseUrl();
  const updated = await twilioRequest(`${API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${sid}.json`, {
    method: "POST",
    body: {
      VoiceUrl: `${base}/api/public/hooks/twilio-voice-inbound`,
      VoiceMethod: "POST",
      SmsUrl: `${base}/api/public/hooks/twilio-sms-inbound`,
      SmsMethod: "POST",
    },
  });
  return updated.ok;
}
