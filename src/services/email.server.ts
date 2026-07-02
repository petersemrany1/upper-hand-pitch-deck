import { logError } from "@/utils/error-logger.functions";

/**
 * Email service: the single place that talks to the Resend API.
 * Server-side only.
 */

// process.env.RESEND_API_KEY may be set by the Resend *connector* to a
// non-key marker value; only accept real keys (they start with "re_").
function getResendApiKey(): string | null {
  const raw = process.env.RESEND_API_KEY ?? "";
  return raw.startsWith("re_") ? raw : null;
}

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function sendEmail(args: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  logSource?: string;
}): Promise<SendEmailResult> {
  const apiKey = getResendApiKey();
  const source = args.logSource ?? "sendEmail";
  if (!apiKey) {
    const msg = "RESEND_API_KEY is not configured";
    await logError(source, msg, { to: args.to, subject: args.subject });
    return { success: false, error: msg };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    const result = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      const error = result?.message || `Resend error ${response.status}`;
      await logError(source, error, { to: args.to, subject: args.subject, raw: result });
      return { success: false, error };
    }
    return { success: true, id: result.id ?? "" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logError(source, error, { to: args.to, subject: args.subject });
    return { success: false, error };
  }
}
