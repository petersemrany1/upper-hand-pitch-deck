// Ported from the Legal app (family-law-floater/src/lib/staff-admin.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PORTAL_PAGE_URLS, type PortalPage } from "./portal-pages";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

const pagesSchema = z
  .array(z.enum(PORTAL_PAGE_URLS as [PortalPage, ...PortalPage[]]))
  .max(PORTAL_PAGE_URLS.length)
  .transform((pages) => [...new Set(pages)]);

async function assertAdmin(supabase: {
  rpc: (fn: "is_admin_user") => Promise<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Admins only");
}

/** Invite an appointment setter (or another admin). Admin only. */
export const inviteStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      email: string;
      role: "setter" | "rep" | "admin";
      pages: PortalPage[];
    }) =>
      z
        .object({
          name: z.string().trim().min(1).max(120),
          email: z.string().trim().email().max(200),
          role: z.enum(["setter", "rep", "admin"]),
          pages: pagesSchema,
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { inviteStaff } = await import("./staff-admin.server");
    return inviteStaff(data.name, data.email, data.role, data.pages);
  });

export const resendStaffInviteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string }) =>
    z.object({ email: z.string().trim().email().max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { resendStaffInvite } = await import("./staff-admin.server");
    return resendStaffInvite(data.email);
  });

/** Deactivate / reactivate a staff login (an inactive rep cannot use the portal). */
export const setStaffActiveFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repId: string; active: boolean }) =>
    z.object({ repId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sales_reps")
      .update({ is_active: data.active })
      .eq("id", data.repId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Rename a staff member. The name is what firms see on cold emails ("Sol Gross <sol@…>"). */
export const renameStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repId: string; name: string }) =>
    z.object({ repId: z.string().uuid(), name: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sales_reps")
      .update({ name: data.name })
      .eq("id", data.repId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Save exactly the selected tabs. The database rechecks admin status and validates page names. */
export const setStaffTabAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repId: string; pages: PortalPage[] }) =>
    z.object({ repId: z.string().uuid(), pages: pagesSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_staff_portal_pages", {
      p_rep_id: data.repId,
      p_pages: data.pages,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
