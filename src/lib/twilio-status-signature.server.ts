import { createHmac, timingSafeEqual } from "crypto";

function safeEqualHexOrBase64(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function twilioSignatureFor(url: string, params: URLSearchParams, token: string): string {
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  const payload = entries.reduce((acc, [key, value]) => acc + key + value, url);
  return createHmac("sha1", token).update(payload).digest("base64");
}

// The StatusCallback URL we register with Twilio (see src/utils/sms.functions.ts).
// Twilio signs THIS exact URL, so it must always be in the candidate list —
// regardless of what host/proto the Worker sees on the incoming request.
const CANONICAL_CALLBACK_URL =
  "https://hairtransplantgroup.lovable.app/api/public/hooks/twilio-message-status";

function candidateUrls(request: Request): string[] {
  const url = new URL(request.url);
  const canonical = new URL(CANONICAL_CALLBACK_URL);
  canonical.search = url.search;
  const candidates = new Set<string>([canonical.toString(), url.toString()]);
  const xfProto = request.headers.get("x-forwarded-proto");
  const xfHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (xfProto || xfHost) {
    const forwarded = new URL(url.toString());
    if (xfProto) forwarded.protocol = `${xfProto}:`;
    if (xfHost) forwarded.host = xfHost;
    candidates.add(forwarded.toString());
  }
  const origin = request.headers.get("origin");
  if (origin) candidates.add(new URL(url.pathname + url.search, origin).toString());
  // Also try https variant of the raw request URL (Workers may report http internally).
  if (url.protocol !== "https:") {
    const httpsUrl = new URL(url.toString());
    httpsUrl.protocol = "https:";
    candidates.add(httpsUrl.toString());
  }
  return Array.from(candidates);
}

export function verifyTwilioSignature(request: Request, params: URLSearchParams, token: string): boolean {
  const signature = request.headers.get("x-twilio-signature") || "";
  if (!signature) return false;
  return candidateUrls(request).some((url) => safeEqualHexOrBase64(twilioSignatureFor(url, params, token), signature));
}
