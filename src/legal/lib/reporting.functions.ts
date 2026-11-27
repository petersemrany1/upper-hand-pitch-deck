// Ported from the Legal app (family-law-floater/src/lib/reporting.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { assertPortalPageAccess } from "./portal-access";
import { sydneyTodayISO } from "./timezone";
const input = z.object({
  period: z.enum(["day", "yesterday", "week", "month", "30d", "60d", "year", "all", "custom"]),
  start: z.string().optional(),
  end: z.string().optional(),
  repId: z.string().optional(),
  city: z.string().optional(),
});
export const getBookingPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input)
  .handler(async ({ data, context }) => {
    await assertPortalPageAccess(context.supabase, ["/dashboard"]);
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin_user");
    if (error) throw new Error("Could not verify reporting access");
    const { data: rep, error: repError } = await context.supabase
      .from("sales_reps")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (repError || (!isAdmin && !rep)) throw new Error("Staff account required");
    const { loadReportingData } = await import("./reporting-data.server");
    const { makeDashboardReport } = await import("./reporting");
    const report = makeDashboardReport(await loadReportingData(), data, {
      isAdmin: isAdmin === true,
      repId: rep?.id ?? null,
    });
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { data: targets, error: targetError } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", `booking_targets:${sydneyTodayISO(new Date(report.asOf)).slice(0, 7)}`)
      .maybeSingle();
    if (targetError) throw new Error("Could not load booking targets");
    const values = (targets?.value ?? {}) as Record<string, number>;
    return {
      ...report,
      target: Object.entries(values)
        .filter(([id]) => isAdmin || id === rep?.id)
        .reduce((sum, [, v]) => sum + (Number(v) || 0), 0),
    };
  });
export type BookingPerformanceReport = Awaited<ReturnType<typeof getBookingPerformance>>;
export const saveBookingTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      repId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      target: z.number().int().min(0).max(100000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("is_admin_user");
    if (!admin) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const rpc = supabaseAdmin as unknown as {
      rpc: (
        name: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
    const { error } = await rpc.rpc("set_legal_booking_target", {
      p_rep: data.repId,
      p_month: data.month,
      p_target: data.target,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
