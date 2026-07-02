import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scrubPii, scrubString } from "@/lib/pii";

// These helpers run inside server functions. Read config from the environment
// rather than hard-coding project URL / keys. `process` may be undefined in a
// client bundle, so access it defensively.
function env(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

const SUPABASE_URL = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL") ?? "";
// error_logs writes require an authenticated/service context; prefer the
// service-role key server-side, falling back to the publishable/anon key.
const SUPABASE_ANON_KEY =
  env("SUPABASE_SERVICE_ROLE_KEY") ??
  env("SUPABASE_PUBLISHABLE_KEY") ??
  env("VITE_SUPABASE_PUBLISHABLE_KEY") ??
  "";

export async function logError(
  functionName: string,
  errorMessage: string,
  context: Record<string, unknown> = {}
) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/error_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        function_name: functionName,
        error_message: scrubString(errorMessage),
        context: scrubPii(context),
      }),
    });
  } catch (e) {
    console.error("Failed to log error:", e);
  }
}

export const getErrorLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    return res.json();
  });

export const resolveErrorLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?id=eq.${data.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ resolved: true }),
      }
    );
    return { success: true };
  });

export const getUnresolvedCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/error_logs?resolved=eq.false&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: "count=exact",
        },
      }
    );
    const count = res.headers.get("content-range")?.split("/")[1] || "0";
    return { count: parseInt(count) };
  });
