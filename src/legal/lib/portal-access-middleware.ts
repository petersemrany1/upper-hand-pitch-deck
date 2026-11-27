// Ported from the Legal app (family-law-floater/src/lib/portal-access-middleware.ts). Re-run the port script to refresh.
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { CALL_REVIEW_PAGES } from "./portal-pages";
import { assertFullPortalAccess, assertPortalPageAccess } from "./portal-access";

export const requireFullPortalAccess = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    await assertFullPortalAccess(context.supabase);
    return next();
  });

function requirePages(...pages: string[]) {
  return createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ context, next }) => {
      await assertPortalPageAccess(context.supabase, pages);
      return next();
    });
}

export const requireTrainingAccess = requirePages("/training");
export const requireColdCallingAccess = requirePages("/firm-cold-calling");
export const requireLeaderboardAccess = requirePages("/leaderboard");
export const requireSalesAccess = requirePages(...CALL_REVIEW_PAGES);
export const requireInboxAccess = requirePages("/inbox", "/sales-call", "/booked-appointments");
export const requireVoiceAccess = requirePages(
  "/sales-call",
  "/inbox",
  "/booked-appointments",
  "/firms",
  "/firm-cold-calling",
);
