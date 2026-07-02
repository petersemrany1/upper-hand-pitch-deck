import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ServerFnOptions = Parameters<typeof createServerFn>[0];

/**
 * The default way to declare a server function: authentication is opt-OUT,
 * not opt-in. Returns a createServerFn builder with requireSupabaseAuth
 * already attached, so handlers receive `context.supabase` (RLS-scoped
 * client), `context.userId` and `context.claims`.
 *
 * Only public webhook endpoints (which must verify a provider signature)
 * may use bare createServerFn — and those should live in route handlers,
 * not server functions.
 */
export function authedServerFn(options?: ServerFnOptions) {
  return createServerFn(options).middleware([requireSupabaseAuth]);
}
