// Ported from the Legal app (family-law-floater/src/lib/staff-admin.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Admin-only: invite appointment setters / staff to the portal (auth user +
// sales_reps row + set-password email). Mirrors the firm-user invite flow.
import { sendEmail, HANDOVER_FROM } from "./email.server";
import { publicBaseUrl } from "./twilio.server";
import { type PortalPage } from "./portal-pages";

async function admin() {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return supabaseAdmin;
}

function staffInviteEmail(name: string, link: string): { subject: string; html: string } {
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
  return {
    subject: "Your Legal Group portal login",
    html: `<!doctype html><html><body style="margin:0;background:#f5f6ff;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;border:1px solid #e6e8fb;overflow:hidden">
  <div style="background:#2c3af5;padding:28px 32px;font:800 22px/1.3 ${font};color:#fff">Legal Group</div>
  <div style="padding:32px;font:400 15px/1.7 ${font};color:#141a3d">
    <p style="margin:0 0 16px">Hi ${name},</p>
    <p style="margin:0 0 24px">Your portal login is ready. Set your password, then sign in and start work.</p>
    <a href="${link}" style="display:inline-block;background:#2c3af5;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600">Set your password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b72a6">If the button doesn't work, paste this link into your browser:<br>${link}</p>
  </div>
</div></body></html>`,
  };
}

/** Create (or reuse) the login, add the sales_reps row, email the set-password link. */
export async function inviteStaff(
  name: string,
  email: string,
  role: "setter" | "rep" | "admin",
  pages: PortalPage[],
): Promise<{ ok: boolean; error?: string }> {
  const db = await admin();
  const cleanEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const cleanName = String(name ?? "").trim();
  if (!cleanEmail.includes("@")) return { ok: false, error: "Enter a valid email address" };
  if (!cleanName) return { ok: false, error: "Enter their name" };

  let userId: string | null = null;
  let createdNow = false;
  const created = await db.auth.admin.createUser({ email: cleanEmail, email_confirm: true });
  if (created.data?.user) {
    userId = created.data.user.id;
    createdNow = true;
  } else {
    const existing = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId =
      existing.data?.users.find((u) => (u.email ?? "").toLowerCase() === cleanEmail)?.id ?? null;
    if (!userId)
      return { ok: false, error: created.error?.message ?? "Could not create the login" };
  }
  const rollback = async () => {
    if (createdNow && userId) await db.auth.admin.deleteUser(userId);
  };

  // The role controls admin powers; portal_pages independently controls visible tabs.
  // Setter membership remains in cold-calling settings for labels and the preferred home.
  const dbRole: "rep" | "admin" = role === "admin" ? "admin" : "rep";
  const { data: existingRep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  const { error: repError } = existingRep
    ? await db
        .from("sales_reps")
        .update({
          name: cleanName,
          email: cleanEmail,
          role: dbRole,
          is_active: true,
          portal_pages: role === "admin" ? null : pages,
        })
        .eq("id", existingRep.id)
    : await db.from("sales_reps").insert({
        user_id: userId,
        name: cleanName,
        email: cleanEmail,
        role: dbRole,
        is_active: true,
        portal_pages: role === "admin" ? null : pages,
      });
  if (repError) {
    await rollback();
    return { ok: false, error: repError.message };
  }
  {
    const { data: row } = await db
      .from("app_settings")
      .select("value")
      .eq("key", "cold_calling")
      .maybeSingle();
    const value = ((row?.value as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
    const ids = new Set(
      (Array.isArray(value["setter_user_ids"]) ? (value["setter_user_ids"] as unknown[]) : []).map(
        String,
      ),
    );
    if (role === "setter") ids.add(userId!);
    else ids.delete(userId!);
    const { error: settingsError } = await db
      .from("app_settings")
      .upsert(
        { key: "cold_calling", value: { ...value, setter_user_ids: [...ids] } as never },
        { onConflict: "key" },
      );
    if (settingsError) {
      await rollback();
      return { ok: false, error: settingsError.message };
    }
  }

  const link = await db.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo: `${publicBaseUrl()}/set-password` },
  });
  const actionLink = link.data?.properties?.action_link;
  if (link.error || !actionLink) {
    await rollback();
    return { ok: false, error: link.error?.message ?? "Could not create the password link" };
  }
  const { subject, html } = staffInviteEmail(cleanName.split(" ")[0] ?? cleanName, actionLink);
  const sent = await sendEmail({
    to: [cleanEmail],
    subject,
    html,
    from: legalEnv["FIRM_PORTAL_FROM_EMAIL"] ?? HANDOVER_FROM,
  });
  if (!sent.ok) {
    await rollback();
    return { ok: false, error: sent.error ?? "Invite email failed" };
  }
  return { ok: true };
}

/** Send a fresh set-password link to an existing staff member. */
export async function resendStaffInvite(email: string): Promise<{ ok: boolean; error?: string }> {
  const db = await admin();
  const cleanEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  const link = await db.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
    options: { redirectTo: `${publicBaseUrl()}/set-password` },
  });
  const actionLink = link.data?.properties?.action_link;
  if (link.error || !actionLink)
    return { ok: false, error: link.error?.message ?? "Could not create the password link" };
  const { data: rep } = await db
    .from("sales_reps")
    .select("name")
    .eq("email", cleanEmail)
    .maybeSingle();
  const { subject, html } = staffInviteEmail(
    (rep?.name ?? "").split(" ")[0] || "there",
    actionLink,
  );
  return sendEmail({
    to: [cleanEmail],
    subject,
    html,
    from: legalEnv["FIRM_PORTAL_FROM_EMAIL"] ?? HANDOVER_FROM,
  });
}
