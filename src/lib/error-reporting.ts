import { supabase } from "@/integrations/supabase/client";
import { scrubPii, scrubString } from "@/lib/pii";

/**
 * Central client-side error reporting. Every frontend error path (window
 * handlers, router error boundary, manual logFrontendError calls) funnels
 * through here so that:
 *  - PII is scrubbed before anything is written to error_logs
 *  - repeated identical errors are deduped instead of flooding the table
 *  - a hard per-minute cap protects us from error loops
 */

const DEDUPE_WINDOW_MS = 60_000;
const MAX_REPORTS_PER_MINUTE = 20;

const recentReports = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

function shouldReport(key: string, now: number): boolean {
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= MAX_REPORTS_PER_MINUTE) return false;

  const last = recentReports.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;

  recentReports.set(key, now);
  if (recentReports.size > 200) {
    for (const [k, t] of recentReports) {
      if (now - t > DEDUPE_WINDOW_MS) recentReports.delete(k);
    }
  }
  windowCount++;
  return true;
}

export async function reportError(
  source: string,
  message: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  try {
    console.error(`[${source}] ${message}`, context);

    const now = Date.now();
    if (!shouldReport(`${source}:${message}`, now)) return;

    await supabase.from("error_logs").insert({
      function_name: source,
      error_message: scrubString(message),
      context: {
        ...scrubPii(context),
        source: "frontend",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        url: typeof window !== "undefined" ? scrubString(window.location.href) : "unknown",
        loggedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("Failed to write error report to error_logs:", e);
  }
}
