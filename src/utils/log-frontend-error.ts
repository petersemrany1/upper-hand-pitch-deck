import { supabase } from "@/integrations/supabase/client";
import { scrubPii, scrubMessage, shouldSuppressDuplicate } from "@/utils/scrub-pii";

/**
 * Logs a frontend error to the shared error_logs table so it appears in /logs
 * alongside backend errors.
 *
 * PII (patient names, emails, phone numbers, addresses, tokens) is scrubbed
 * from both the message and the context payload before insert. Identical
 * errors are deduped in-memory over a short window so a spinning render
 * loop can't hammer the table.
 */
export async function logFrontendError(
  functionName: string,
  description: string,
  context: Record<string, unknown> = {}
) {
  const safeMessage = scrubMessage(description);
  const safeContext = scrubPii({
    ...context,
    source: "frontend",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
    loggedAt: new Date().toISOString(),
  });

  // Console for live debugging (scrubbed too — devtools output is often
  // shared in screenshots/screen recordings).
  console.error(`[${functionName}] ${safeMessage}`, safeContext);

  if (shouldSuppressDuplicate(functionName, safeMessage)) return;

  try {
    await supabase.from("error_logs").insert({
      function_name: functionName,
      error_message: safeMessage,
      context: safeContext,
    });
  } catch (e) {
    console.error("Failed to write frontend error to error_logs:", e);
  }
}


/** Extract a Twilio-style error code from any error shape. */
export function extractErrorCode(err: unknown): number | string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: number | string; originalError?: { code?: number | string } };
  return e.code ?? e.originalError?.code ?? null;
}

/** Best-effort plain English message from any error shape. */
export function extractErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "object") {
    const e = err as { message?: string; description?: string; explanation?: string };
    return e.message || e.description || e.explanation || fallback;
  }
  return fallback;
}
