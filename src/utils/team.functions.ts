import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Helper: ensure the calling user is an admin (matched by email in sales_reps).
async function assertAdmin(supabase: Awaited<ReturnType<typeof requireSupabaseAuth>> extends never ? never : any, userId: string) {
  // We need the email from auth.users — use admin client (server-only).
  const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (uErr || !u?.user?.email) throw new Error("Could not verify caller");
  const email = u.user.email;
  const { data: rep } = await supabaseAdmin
    .from("sales_reps")
    .select("role")
    .ilike("email", email)
    .maybeSingle();
  if (rep?.role !== "admin") throw new Error("Forbidden: admin only");
  return email;
}

// LIST reps with their auth metadata.
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("sales_reps")
      .select("id, name, email, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { reps: data ?? [] };
  });

// INVITE a new rep — sends Supabase invite email + creates sales_reps row.
export const inviteRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().min(1).max(120),
      email: z.string().email(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (invErr) throw new Error(invErr.message);

    // Upsert by email (case-insensitive). If a row exists we just refresh name.
    const { data: existing } = await supabaseAdmin
      .from("sales_reps")
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    if (existing?.id) {
      await supabaseAdmin
        .from("sales_reps")
        .update({ name: data.name, role: "rep" })
        .eq("id", existing.id);
    } else {
      const { error: insErr } = await supabaseAdmin
        .from("sales_reps")
        .insert({ name: data.name, email: data.email, role: "rep" });
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });

// UPDATE a rep's role.
export const updateRepRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      repId: z.string().uuid(),
      role: z.enum(["admin", "rep"]),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("sales_reps")
      .update({ role: data.role })
      .eq("id", data.repId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// REMOVE a rep — deletes the sales_reps row and the matching auth user.
export const removeRep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ repId: z.string().uuid() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const callerEmail = await assertAdmin(context.supabase, context.userId);
    const { data: rep } = await supabaseAdmin
      .from("sales_reps")
      .select("email")
      .eq("id", data.repId)
      .maybeSingle();
    if (!rep) throw new Error("Rep not found");
    if (rep.email && rep.email.toLowerCase() === callerEmail.toLowerCase()) {
      throw new Error("You cannot remove yourself");
    }

    // Delete sales_reps row first.
    const { error: delErr } = await supabaseAdmin
      .from("sales_reps")
      .delete()
      .eq("id", data.repId);
    if (delErr) throw new Error(delErr.message);

    // Delete the matching auth user, if any.
    if (rep.email) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users.find((u) => u.email?.toLowerCase() === rep.email!.toLowerCase());
      if (match) {
        await supabaseAdmin.auth.admin.deleteUser(match.id);
      }
    }
    return { ok: true };
  });
