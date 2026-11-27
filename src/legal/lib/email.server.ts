// Ported from the Legal app (family-law-floater/src/lib/email.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Single Resend sender used by handover + conflict alerts.
export const HANDOVER_FROM =
  legalEnv["HANDOVER_FROM_EMAIL"] ?? "Bold Marketing <bookings@bold-marketing.com.au>";
export const INTERNAL_ALERT_TO = legalEnv["INTERNAL_ALERT_EMAIL"] ?? "peter@gobold.com.au";

export async function sendEmail(input: {
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  redactErrors?: boolean;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = legalEnv["LOVABLE_API_KEY"];
  const resendKey = legalEnv["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) {
    return { ok: false, error: "Email is not configured (missing keys)" };
  }
  const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    ...(input.idempotencyKey ? { signal: AbortSignal.timeout(10000) } : {}),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: input.from ?? HANDOVER_FROM,
      to: input.to,
      ...(input.cc?.length ? { cc: input.cc } : {}),
      subject: input.subject,
      ...(input.html ? { html: input.html } : {}),
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      `[email] send failed [${response.status}]${input.redactErrors ? "" : `: ${errorBody}`}`,
    );
    return {
      ok: false,
      error: `Email send failed [${response.status}]${input.redactErrors ? "" : `: ${errorBody}`}`,
    };
  }
  return { ok: true };
}
