import { reportError } from "@/lib/error-reporting";

/**
 * Logs a frontend error to the shared error_logs table so it appears in /logs
 * alongside backend errors. Delegates to the central reporter, which scrubs
 * PII and dedupes repeats before writing.
 */
export async function logFrontendError(
  functionName: string,
  description: string,
  context: Record<string, unknown> = {}
) {
  await reportError(functionName, description, context);
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
