// Ported from the Legal app (family-law-floater/src/lib/booking.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { requireSalesAccess } from "@/legal/lib/portal-access-middleware";
import { z } from "zod";

type BookingPayload = {
  leadId: string;
  firmId: string;
  lawyerId: string | null;
  locationId?: string | null;
  date: string;
  time: string;
  consultMode?: "in_person" | "zoom";
  customTime?: boolean;
};

async function assertLeadAccess(
  supabase: { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> },
  leadId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: isAdmin } = await supabase.rpc("is_admin_user");
  if (isAdmin === true) return;
  const { data: repId } = await supabase.rpc("current_sales_rep_id");
  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select("rep_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!repId || !lead || lead.rep_id !== repId) throw new Error("You cannot act on this lead");
}

export const confirmBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: BookingPayload) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { confirmBookingPrivileged } = await import("./booking.server");
    const { data: rep, error } = await context.supabase
      .from("sales_reps")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return confirmBookingPrivileged({ ...data, bookingRepId: rep?.id ?? null });
  });

export const rescheduleBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(
    (data: { leadId: string; date: string; time: string; customTime?: boolean; locationId?: string | null }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { rescheduleLeadBooking } = await import("./booking.server");
    return rescheduleLeadBooking(data);
  });

export const leadBookingStateFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { getLeadBookingState } = await import("./rebooking.server");
    return getLeadBookingState(data.leadId);
  });

export const rebookAfterNoShowFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(
    z.object({
      leadId: z.string().uuid(),
      previousAppointmentId: z.string().uuid(),
      firmId: z.string().uuid(),
      lawyerId: z.string().uuid().nullable(),
      locationId: z.string().uuid().nullable().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^(?:[01]?\d|2[0-3]):[0-5]\d(?:am|pm)?$/i),
      consultMode: z.enum(["in_person", "zoom"]),
      customTime: z.boolean().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { rebookLeadAfterNoShow } = await import("./rebooking.server");
    return rebookLeadAfterNoShow({ ...data, customTime: Boolean(data.customTime) }, context.userId);
  });

export const previewConfirmationSmsFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { buildConfirmationSms } = await import("./booking.server");
    return buildConfirmationSms(data.leadId);
  });

export const sendConfirmationSmsFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(
    (data: { leadId: string; body?: string; bookingKey?: string | undefined }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { sendBookingConfirmationSms } = await import("./booking.server");
    return sendBookingConfirmationSms(data.leadId, data.body, data.bookingKey);
  });

export const confirmationSmsStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { bookingConfirmationSent } = await import("./booking.server");
    return { sent: await bookingConfirmationSent(data.leadId) };
  });

export const handoverStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { handoverReadiness } = await import("./handover.server");
    return handoverReadiness(data.leadId);
  });

export const previewHandoverFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { handoverPreview } = await import("./handover.server");
    return handoverPreview(data.leadId);
  });

export const generateHandoverIntelFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { generateHandoverIntel } = await import("./handover.server");
    const { handoverIntelResponse } = await import("./handover-stream");
    return handoverIntelResponse(() => generateHandoverIntel(data.leadId));
  });

export const sendHandoverFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(
    (data: { leadId: string; to?: string; cc?: string; notes?: string; funding?: string }) => data,
  )
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { sendHandoverEmail } = await import("./handover.server");
    return sendHandoverEmail(data.leadId, {
      ...(data.to === undefined ? {} : { to: data.to }),
      ...(data.cc === undefined ? {} : { cc: data.cc }),
      ...(data.notes === undefined ? {} : { notes: data.notes }),
      ...(data.funding === undefined ? {} : { funding: data.funding }),
    });
  });

export const resetConfirmationSmsFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { resetBookingConfirmation } = await import("./booking.server");
    await resetBookingConfirmation(data.leadId);
    return { ok: true };
  });

export const consultModeFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { getConsultMode } = await import("./booking.server");
    return { mode: await getConsultMode(data.leadId) };
  });

export const setConsultModeFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string; mode: "in_person" | "zoom"; locationId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);
    const { setConsultMode } = await import("./booking.server");
    return setConsultMode(data.leadId, data.mode, data.locationId);
  });
