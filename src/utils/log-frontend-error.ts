import { supabase } from "@/integrations/supabase/client";

/**
 * Logs a frontend error to the shared error_logs table so it appears in /logs
 * alongside backend errors. Safe to call from browser code (table allows
 * anonymous inserts via RLS).
 */
export async function logFrontendError(
  functionName: string,
  description: string,
  context: Record<string, unknown> = {}
) {
  try {
    // Console for live debugging
    console.error(`[${functionName}] ${description}`, context);

    await supabase.from("error_logs").insert({
      function_name: functionName,
      error_message: description,
      context: {
        ...context,
        source: "frontend",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
        loggedAt: new Date().toISOString(),
      },
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
