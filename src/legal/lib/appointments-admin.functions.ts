// Ported from the Legal app (family-law-floater/src/lib/appointments-admin.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

/** Admin-only actions for the Booked Appointments page. */

/** Record that a deposit was refunded outside the portal (Stripe dashboard, bank transfer…). */
export const markRefundedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; reference?: string }) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        reference: z.string().trim().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    if (isAdmin !== true) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { data: appt, error: readErr } = await supabaseAdmin
      .from("firm_appointments")
      .select("id, notes, refund_status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!appt) throw new Error("Appointment not found");
    const stamp = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const line = `[${stamp}] Refund marked done manually${data.reference ? ` — ${data.reference}` : ""} (was: ${appt.refund_status ?? "none"})`;
    const { error } = await supabaseAdmin
      .from("firm_appointments")
      .update({
        refund_status: "refunded",
        refund_processed_at: new Date().toISOString(),
        notes: appt.notes ? `${appt.notes}\n${line}` : line,
      })
      .eq("id", data.appointmentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
