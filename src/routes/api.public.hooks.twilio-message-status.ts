import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
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
  const candidates = new Set<string>([CANONICAL_CALLBACK_URL, url.toString()]);
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

function verifyTwilioSignature(request: Request, params: URLSearchParams, token: string): boolean {
  const signature = request.headers.get("x-twilio-signature") || "";
  if (!signature) return false;
  return candidateUrls(request).some((url) => safeEqualHexOrBase64(twilioSignatureFor(url, params, token), signature));
}


export const Route = createFileRoute("/api/public/hooks/twilio-message-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
          console.error("twilio-message-status: TWILIO_AUTH_TOKEN missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);
        if (!verifyTwilioSignature(request, params, authToken)) {
          console.warn("twilio-message-status: invalid signature");
          return new Response("Forbidden", { status: 403 });
        }

        const messageSid = params.get("MessageSid") || params.get("SmsSid") || "";
        const status = params.get("MessageStatus") || params.get("SmsStatus") || "";
        const errorCode = params.get("ErrorCode") || null;
        const errorMessage = params.get("ErrorMessage") || null;

        if (!messageSid || !status) {
          return new Response("OK", { status: 200 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          console.error("twilio-message-status: backend env missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const finalStatus = errorCode ? `${status} (${errorCode}${errorMessage ? `: ${errorMessage}` : ""})` : status;
        const { error } = await supabase
          .from("sms_messages")
          .update({ status: finalStatus })
          .eq("twilio_message_sid", messageSid);

        if (error) {
          console.error("twilio-message-status: update failed", { messageSid, status, error });
          return new Response("DB update failed", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});