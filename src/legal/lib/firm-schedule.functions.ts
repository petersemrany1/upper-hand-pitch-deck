// Ported from the Legal app (family-law-floater/src/lib/firm-schedule.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import type { FirmSchedule, ScheduleCommand } from "./firm-schedule";
import type { CalendarHistoryPage } from "./calendar-history";
type Rpc = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
export const getFirmSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ firmId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as unknown as Rpc).rpc(
      "get_firm_schedule",
      { p_firm: data.firmId },
    );
    if (error) throw new Error(error.message);
    if (!result) throw new Error("Could not load availability");
    return result as FirmSchedule;
  });
export const saveFirmSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      firmId: z.string().uuid(),
      version: z.string().min(1),
      command: z.custom<ScheduleCommand>((v) => !!v && typeof v === "object" && "action" in v),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as unknown as Rpc).rpc(
      "save_firm_schedule",
      { p_firm: data.firmId, p_version: data.version, p_command: data.command },
    );
    if (error) throw new Error(error.message);
    return result as FirmSchedule;
  });
export const getFirmCalendarHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      firmId: z.string().uuid(),
      before: z.string().regex(/^\d+$/).optional(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await (context.supabase as unknown as Rpc).rpc(
      "get_firm_calendar_history",
      {
        p_firm: data.firmId,
        p_before: data.before ?? null,
        p_date: data.date ?? null,
        p_limit: 50,
      },
    );
    if (error) throw new Error(error.message);
    return result as CalendarHistoryPage;
  });
