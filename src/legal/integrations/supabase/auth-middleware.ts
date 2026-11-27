// Legal server functions use this: the portal's own sign-in check, with the
// caller's database connection translated to the legal_ tables.
import { createMiddleware } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth as requirePortalAuth } from "@/integrations/supabase/auth-middleware";
import { legalScopedClient } from "@/legal/runtime/prefix";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" })
  .middleware([requirePortalAuth])
  .server(async ({ context, next }) =>
    next({ context: { supabase: legalScopedClient(context.supabase) as unknown as SupabaseClient<Database> } }),
  );
