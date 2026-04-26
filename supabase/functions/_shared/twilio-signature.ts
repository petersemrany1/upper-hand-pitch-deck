// Validates Twilio's X-Twilio-Signature HMAC-SHA1 header so only legitimate
// Twilio requests are accepted by our webhooks.
//
// Algorithm (per https://www.twilio.com/docs/usage/webhooks/webhooks-security):
//   1. Take the full request URL (scheme + host + path + query)
//   2. Append every POST parameter, sorted by key, as `${key}${value}` (no separator)
//   3. HMAC-SHA1 the resulting string with TWILIO_AUTH_TOKEN
//   4. Base64 encode and compare (constant-time) to the X-Twilio-Signature header
//
// IMPORTANT: We need the params re-usable in the handler, so this helper takes
// already-parsed FormData and returns whether it's valid. Pass the *exact* URL
// Twilio called — Supabase edge functions are reached at
// https://<ref>.functions.supabase.co/<name> which is what req.url returns.

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  // base64-encode the raw signature bytes
  let bin = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function validateTwilioSignature(
  req: Request,
  form: FormData,
): Promise<boolean> {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("twilio-signature: TWILIO_AUTH_TOKEN is not configured");
    return false;
  }

  const headerSig = req.headers.get("x-twilio-signature");
  if (!headerSig) {
    console.warn("twilio-signature: missing x-twilio-signature header");
    return false;
  }

  // Twilio signs the URL it called. Honor the standard proxy headers so the
  // signature still validates when Supabase Edge sits behind a proxy.
  const original = new URL(req.url);
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (xfProto) original.protocol = `${xfProto}:`;
  if (xfHost) original.host = xfHost;
  const url = original.toString();

  // Build the signing string: URL + sorted (key + value) for every form field.
  const entries: [string, string][] = [];
  for (const [k, v] of form.entries()) {
    entries.push([k, typeof v === "string" ? v : ""]);
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  let signingString = url;
  for (const [k, v] of entries) signingString += k + v;

  const expected = await hmacSha1Base64(authToken, signingString);
  const ok = timingSafeEqual(expected, headerSig);
  if (!ok) {
    console.warn("twilio-signature: signature mismatch", {
      url,
      gotPrefix: headerSig.slice(0, 8),
    });
  }
  return ok;
}
