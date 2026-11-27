// Ported from the Legal app (family-law-floater/src/lib/firm-portal.functions.ts). Re-run the port script to refresh.
import { z } from "zod";
import { APP_TIMEZONE, sydneyTodayISO } from "./timezone";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

import { assertFullPortalAccess, assertPortalPageAccess } from "./portal-access";

type Ctx = {
  supabase: {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  };
};

async function resolveCaller(context: Ctx): Promise<{ isAdmin: boolean; firmId: string | null }> {
  const staff = await context.supabase.rpc("has_sales_role");
  if (staff.error || typeof staff.data !== "boolean")
    throw new Error("Could not verify portal access");
  if (staff.data)
    await assertPortalPageAccess(context.supabase, ["/firm-portal", "/booked-appointments"]);
  else await assertFullPortalAccess(context.supabase);
  const [{ data: isAdmin }, { data: firmId }] = await Promise.all([
    context.supabase.rpc("is_admin_user"),
    context.supabase.rpc("current_firm_id"),
  ]);
  return { isAdmin: isAdmin === true, firmId: typeof firmId === "string" ? firmId : null };
}

/** Who am I? Used by the portal gate and post-login routing. */
export const whoAmIFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isRep } = await context.supabase.rpc("has_sales_role");
    const caller = await resolveCaller(context as unknown as Ctx);
    let firmName: string | null = null;
    if (caller.firmId) {
      const { data: firm } = await context.supabase
        .from("firms")
        .select("firm_name")
        .eq("id", caller.firmId)
        .maybeSingle();
      firmName = firm?.firm_name ?? null;
    }
    return {
      isStaff: isRep === true || caller.isAdmin,
      isAdmin: caller.isAdmin,
      firmId: caller.firmId,
      firmName,
    };
  });

export const processConsultOutcomeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; summary?: string; signed?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { processConsultOutcome } = await import("./firm-portal.server");
    return processConsultOutcome(
      data.appointmentId,
      {
        ...(data.summary === undefined ? {} : { summary: data.summary }),
        signed: data.signed === true,
      },
      caller,
    );
  });

export const markNoShowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; summary?: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { markNoShow } = await import("./firm-portal.server");
    return markNoShow(
      data.appointmentId,
      data.summary === undefined ? {} : { summary: data.summary },
      caller,
    );
  });

export const requestChaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; note?: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { requestChase } = await import("./firm-portal.server");
    return requestChase(data.appointmentId, data.note, caller);
  });

export const resolveChaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      appointmentId: string;
      result: "rebooked" | "not_proceeding" | "no_answer" | "voicemail";
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { resolveChase } = await import("./firm-portal.server");
    return resolveChase(data.appointmentId, data.result, caller);
  });

export const flagConflictFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { flagConflict } = await import("./firm-portal.server");
    return flagConflict(data.appointmentId, data.reason, caller);
  });

export const clearConflictFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { clearConflict } = await import("./firm-portal.server");
    return clearConflict(data.appointmentId, caller);
  });

export const cancelAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { cancelAppointment } = await import("./firm-portal.server");
    return cancelAppointment(data.appointmentId, caller);
  });

export const disqualifyAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { disqualifyAppointment } = await import("./firm-portal.server");
    return disqualifyAppointment(data.appointmentId, data.reason, {
      ...caller,
      userId: context.userId,
    });
  });

export const rescheduleAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; date: string; time: string; locationId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { rescheduleAppointment } = await import("./firm-portal.server");
    return rescheduleAppointment(data.appointmentId, data.date, data.time, caller, false, data.locationId);
  });

export const addAppointmentNoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; body: string; authorName?: string }) => data)
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { addAppointmentNote } = await import("./firm-portal.server");
    return addAppointmentNote(data.appointmentId, data.body, {
      ...caller,
      authorName: data.authorName ?? null,
    });
  });

export const availableSlotsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      firmId: z.string().uuid(),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((d) => {
          const date = new Date(d + "T12:00:00Z");
          return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === d;
        }, "Invalid calendar date"),
      ignoreAppointmentId: z.string().uuid().optional(),
      ignoreLeadId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: firmId }] = await Promise.all([
      context.supabase.rpc("is_admin_user"),
      context.supabase.rpc("current_firm_id"),
    ]);
    if (isAdmin !== true && firmId !== data.firmId) {
      const { data: isRep } = await context.supabase.rpc("has_sales_role");
      if (isRep !== true) throw new Error("Not allowed");
      await assertPortalPageAccess(context.supabase, [
        "/sales-call",
        "/booked-appointments",
        "/firm-portal",
      ]);
    }
    const { loadSlotContext } = await import("./firm-portal.server");
    const { generateSlots } = await import("./slot-generation");
    const [y, m, d] = data.date.split("-").map(Number);
    if (!y || !m || !d) throw new Error("Invalid date");
    const ctx = await loadSlotContext(
      data.firmId,
      data.ignoreAppointmentId === undefined ? undefined : data.ignoreAppointmentId,
      data.ignoreLeadId,
    );
    const slots = generateSlots(
      new Date(y, m - 1, d),
      ctx.tradingHours,
      ctx.blockedSlots,
      ctx.appts,
      ctx.overrides,
      ctx.firmState,
      ctx.bufferMinutes,
      ctx.consultationMinutes,
    );
    const now = new Date();
    const today = sydneyTodayISO(now);
    const clock = now.toLocaleTimeString("en-GB", { timeZone: APP_TIMEZONE, hour12: false });
    return slots.map((slot) => ({
      ...slot,
      available:
        slot.available &&
        (data.date > today || (data.date === today && slot.time > clock.slice(0, 5))),
    }));
  });

/* ================================ ADMIN ONLY ================================ */

async function assertAdminCaller(context: Ctx): Promise<void> {
  const caller = await resolveCaller(context);
  if (!caller.isAdmin) throw new Error("Admins only");
}

export const inviteFirmUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string; email: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { inviteFirmUser } = await import("./firm-admin.server");
    return inviteFirmUser(data.firmId, data.email);
  });

export const listFirmUsersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { listFirmUsers } = await import("./firm-admin.server");
    return listFirmUsers(data.firmId);
  });

export const removeFirmUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { removeFirmUser } = await import("./firm-admin.server");
    return removeFirmUser(data.userId);
  });

export const createTestFirmFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { createTestFirm } = await import("./firm-admin.server");
    return createTestFirm();
  });

export const setPackOnHoldFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { packId: string; onHold: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("firm_packs")
      .update({ on_hold: data.onHold })
      .eq("id", data.packId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================ FIRM PROFILE (ADMIN) ============================ */

export const getFirmProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { getFirmProfile } = await import("./firm-profile.server");
    return getFirmProfile(data.firmId);
  });

export const setUpFirmProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { setUpProfile } = await import("./firm-profile.server");
    return setUpProfile(data.firmId);
  });

export const createProfileSectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string; title: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { createProfileSection } = await import("./firm-profile.server");
    return createProfileSection(data.firmId, data.title);
  });

export const renameProfileSectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sectionId: string; title: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { renameProfileSection } = await import("./firm-profile.server");
    return renameProfileSection(data.sectionId, data.title);
  });

export const deleteProfileSectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sectionId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { deleteProfileSection } = await import("./firm-profile.server");
    return deleteProfileSection(data.sectionId);
  });

export const moveProfileSectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sectionId: string; direction: "up" | "down" }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { moveProfileSection } = await import("./firm-profile.server");
    return moveProfileSection(data.sectionId, data.direction);
  });

export const createProfileItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sectionId: string; body: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { createProfileItem } = await import("./firm-profile.server");
    return createProfileItem(data.sectionId, data.body);
  });

export const updateProfileItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string; body: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { updateProfileItem } = await import("./firm-profile.server");
    return updateProfileItem(data.itemId, data.body);
  });

export const deleteProfileItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { deleteProfileItem } = await import("./firm-profile.server");
    return deleteProfileItem(data.itemId);
  });

export const moveProfileItemFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { itemId: string; direction: "up" | "down" }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { moveProfileItem } = await import("./firm-profile.server");
    return moveProfileItem(data.itemId, data.direction);
  });

export const bulkCreateProfileItemsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sectionId: string; text: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { bulkCreateProfileItems } = await import("./firm-profile.server");
    return bulkCreateProfileItems(data.sectionId, data.text);
  });

export const getHandoverCcFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { getHandoverCc } = await import("./handover-recipients.server");
    return getHandoverCc(data.firmId);
  });

export const saveHandoverCcFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string; cc: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdminCaller(context as unknown as Ctx);
    const { saveHandoverCc } = await import("./handover-recipients.server");
    return saveHandoverCc(data.firmId, data.cc);
  });

export const deleteTestAppointmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.appointmentId)
    ) {
      throw new Error("Invalid appointment");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const caller = await resolveCaller(context as unknown as Ctx);
    const { deleteTestAppointment } = await import("./delete-test-appointment.server");
    return deleteTestAppointment(data.appointmentId, caller);
  });
