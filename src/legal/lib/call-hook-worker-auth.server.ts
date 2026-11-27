// Ported from the Legal app (family-law-floater/src/lib/call-hook-worker-auth.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
export async function callHookWorkerAuthorized(given: string | null) {
  if (!given) return false;
  const matches = (expected: string | undefined) => {
    if (!expected) return false;
    const a = Buffer.from(given),
      b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  if (matches(legalEnv["INTERNAL_FUNCTION_SECRET"])) return true;
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "cron_token")
    .maybeSingle();
  if (error) return false;
  return matches((data?.value as { token?: string } | null)?.token);
}
