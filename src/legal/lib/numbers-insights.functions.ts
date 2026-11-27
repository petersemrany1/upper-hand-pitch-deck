// Ported from the Legal app (family-law-floater/src/lib/numbers-insights.functions.ts). Re-run the port script to refresh.
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFullPortalAccess } from "./portal-access-middleware";
import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";

export const requireNumbersAdmin = createMiddleware({ type: "function" })
  .middleware([requireFullPortalAccess])
  .server(async ({ context, next }) => {
    const { data, error } = await context.supabase.rpc("is_admin_user");
    if (error || data !== true) throw new Error("Numbers is available to administrators only.");
    return next();
  });
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => addDays(d, 0) === d);
export const getAdMetrics = createServerFn({ method: "POST" })
  .middleware([requireNumbersAdmin])
  .inputValidator(
    z
      .object({ from: day.nullable(), to: day.nullable() })
      .refine(
        (r) => (!r.from || !r.to || r.from <= r.to) && (!r.to || r.to <= sydneyTodayISO()),
        "Choose a valid date range ending no later than today.",
      ),
  )
  .handler(async ({ data }) => {
    const { loadAdMetrics } = await import("./ad-metrics.server");
    return loadAdMetrics(data);
  });

export const getCallHooks = createServerFn({ method: "POST" })
  .middleware([requireNumbersAdmin])
  .inputValidator(
    z.object({
      page: z.number().int().min(0).default(0),
      search: z.string().trim().max(200).default(""),
      outcome: z.enum(["all", "booked", "did_not_proceed", "follow_up"]).default("all"),
      filter: z
        .enum(["insights", "ready", "all", "pending", "unknown", "excluded", "failed"])
        .default("insights"),
    }),
  )
  .handler(async ({ data }) => {
    const { loadCallHooks } = await import("./call-hooks.server");
    return loadCallHooks(data);
  });
export const processCallHooks = createServerFn({ method: "POST" })
  .middleware([requireNumbersAdmin])
  .inputValidator(
    z.object({ callId: z.string().uuid().optional(), regenerate: z.boolean().default(false) }),
  )
  .handler(async ({ data, context }) => {
    const { processNextCallHook } = await import("./call-hooks.server");
    return processNextCallHook(data, context.userId);
  });
export const getHookEvidence = createServerFn({ method: "POST" })
  .middleware([requireNumbersAdmin])
  .inputValidator(z.object({ callId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { loadHookEvidence } = await import("./call-hooks.server");
    return loadHookEvidence(data.callId);
  });
