// Ported from the Legal app (family-law-floater/src/lib/appointment-reminders.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { assertFullPortalAccess } from "./portal-access";

async function requireAdmin(client: SupabaseClient) {
  await assertFullPortalAccess(client);
  const { data, error } = await client.rpc("is_admin_user");
  if (error || data !== true) throw new Error("Admins only");
}

export const getAppointmentRemindersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase);
    const { appointmentReminderDashboard } = await import("./appointment-reminders.server");
    const [dashboard, { data: rep, error }] = await Promise.all([
      appointmentReminderDashboard(),
      context.supabase
        .from("sales_reps")
        .select("id")
        .eq("user_id", context.userId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    return { ...dashboard, repId: rep?.id ?? null };
  });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter real closure dates in YYYY-MM-DD format");

export const saveReminderSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      firm_id: z.string().uuid(),
      mode: z.enum(["off", "texts", "confirmation"]),
      timezone: z
        .string()
        .max(80)
        .refine((v) => {
          try {
            new Intl.DateTimeFormat("en-AU", { timeZone: v });
            return true;
          } catch {
            return false;
          }
        }, "Choose a valid timezone"),
      reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::00)?$/),
      alert_email: z.string().trim().email().max(254),
      staffed_days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      closure_dates: z.array(isoDate).max(366),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as SupabaseClient).rpc("save_firm_reminder_settings", {
      p_firm_id: data.firm_id,
      p_mode: data.mode,
      p_timezone: data.timezone,
      p_time: data.reminder_time,
      p_email: data.alert_email,
      p_days: [...new Set(data.staffed_days)],
      p_closures: [...new Set(data.closure_dates)],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordAttendanceCallFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      appointmentId: z.string().uuid(),
      version: z.string().uuid(),
      outcome: z.enum(["confirmed", "no_answer", "voicemail"]),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as SupabaseClient).rpc("record_appointment_call", {
      p_appointment_id: data.appointmentId,
      p_version: data.version,
      p_outcome: data.outcome,
      p_actor: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
