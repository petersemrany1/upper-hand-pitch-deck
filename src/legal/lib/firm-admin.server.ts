// Ported from the Legal app (family-law-floater/src/lib/firm-admin.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Admin-only server helpers: firm portal logins and the seeded test firm.
import { sendEmail, HANDOVER_FROM } from "./email.server";
import { publicBaseUrl } from "./twilio.server";

const FROM = legalEnv["FIRM_PORTAL_FROM_EMAIL"] ?? HANDOVER_FROM;

async function admin() {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return supabaseAdmin;
}

function inviteEmail(firmName: string, link: string): { subject: string; html: string } {
  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
    );
  const safeFirmName = escapeHtml(firmName);
  const safeLink = escapeHtml(link);
  const font = `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif`;
  return {
    subject: `Your ${firmName} partner portal login`,
    html: `<!doctype html><html><body style="margin:0;background:#f5f6ff;padding:32px 16px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;border:1px solid #e6e8fb;overflow:hidden">
  <div style="background:#2c3af5;padding:28px 32px;font:800 22px/1.3 ${font};color:#fff">Bold</div>
  <div style="padding:32px;font:400 15px/1.7 ${font};color:#141a3d">
    <p style="margin:0 0 16px">Your partner portal for <strong>${safeFirmName}</strong> is ready.</p>
    <p style="margin:0 0 24px">Set your password to see your appointments, manage your availability and check your pack credit.</p>
    <a href="${safeLink}" style="display:inline-block;background:#2c3af5;color:#fff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600">Set your password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#6b72a6">If the button doesn't work, paste this link into your browser:<br>${safeLink}</p>
  </div>
</div></body></html>`,
  };
}

export async function inviteFirmUser(
  firmId: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await admin();
  const cleanEmail = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
    return { ok: false, error: "Enter a valid email address" };

  const { data: firm } = await db.from("firms").select("firm_name").eq("id", firmId).maybeSingle();
  if (!firm) return { ok: false, error: "Firm not found" };

  let userId: string | null = null;
  let createdNow = false;

  const created = await db.auth.admin.createUser({ email: cleanEmail, email_confirm: true });
  if (created.data?.user) {
    userId = created.data.user.id;
    createdNow = true;
  } else {
    // Already exists — reuse the account.
    for (let page = 1; page <= 100; page++) {
      const existing = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (existing.error)
        return { ok: false, error: "Could not verify the existing login. Please try again." };
      const users = existing.data?.users ?? [];
      userId = users.find((u) => (u.email ?? "").toLowerCase() === cleanEmail)?.id ?? null;
      if (userId || users.length < 1000) break;
    }
    if (!userId)
      return { ok: false, error: created.error?.message ?? "Could not create the login" };
  }

  const rollback = async () => {
    if (createdNow && userId) await db.auth.admin.deleteUser(userId);
  };

  // Never transfer another firm's login, or turn a staff account into a firm login.
  const [membership, roles, rep] = await Promise.all([
    db.from("firm_portal_users").select("firm_id").eq("id", userId).maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin"),
    db.from("sales_reps").select("id").eq("user_id", userId).eq("is_active", true),
  ]);
  if (membership.error || roles.error || rep.error) {
    await rollback();
    return { ok: false, error: "Could not verify portal access. Please try again." };
  }
  if (membership.data && membership.data.firm_id !== firmId) {
    return {
      ok: false,
      error: "This email already has access to another firm. Use a separate email address.",
    };
  }
  if ((roles.data?.length ?? 0) > 0 || (rep.data?.length ?? 0) > 0) {
    return { ok: false, error: "This is a staff login. Use the firm's own email address." };
  }
  if (!membership.data) {
    // Insert, not upsert: concurrent invitations must not overwrite membership.
    const { error: linkRowError } = await db
      .from("firm_portal_users")
      .insert({ id: userId, firm_id: firmId, email: cleanEmail });
    if (linkRowError) {
      await rollback();
      return { ok: false, error: linkRowError.message };
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

  const { subject, html } = inviteEmail(firm.firm_name, actionLink);
  const sent = await sendEmail({ to: [cleanEmail], subject, html, from: FROM });
  if (!sent.ok) {
    await rollback();
    return { ok: false, error: sent.error ?? "Invite email failed" };
  }
  return { ok: true };
}

export async function removeFirmUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const db = await admin();
  const { error } = await db.from("firm_portal_users").delete().eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type FirmPortalUser = { id: string; email: string | null; created_at: string };

export async function listFirmUsers(firmId: string): Promise<FirmPortalUser[]> {
  const db = await admin();
  const { data, error } = await db
    .from("firm_portal_users")
    .select("id, email, created_at")
    .eq("firm_id", firmId)
    .order("created_at");
  if (error) throw new Error("Could not load portal access. Please try again.");
  return (data ?? []) as FirmPortalUser[];
}

const TEST_FIRM_NAME = "Test Family Law Firm";

/** Idempotent: a second click adds nothing. */
export async function createTestFirm(): Promise<{ ok: boolean; firmId: string; created: boolean }> {
  const db = await admin();
  const { data: existing } = await db
    .from("firms")
    .select("id")
    .eq("firm_name", TEST_FIRM_NAME)
    .maybeSingle();

  let firmId = existing?.id ?? null;
  let created = false;

  if (!firmId) {
    const { data: firm, error } = await db
      .from("firms")
      .insert({
        firm_name: TEST_FIRM_NAME,
        city: "Sydney",
        state: "NSW",
        address: "1 Test Street, Sydney NSW 2000",
        normal_consult_price: 350,
        is_active: true,
        notes: "Seeded test firm for portal testing.",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    firmId = firm.id;
    created = true;
  }

  // Mon–Fri 9–5 trading hours (0 = Sunday).
  const { data: hours } = await db
    .from("firm_trading_hours")
    .select("day_of_week")
    .eq("firm_id", firmId);
  const have = new Set((hours ?? []).map((h) => h.day_of_week));
  const missing = [1, 2, 3, 4, 5]
    .filter((d) => !have.has(d))
    .map((d) => ({
      firm_id: firmId,
      day_of_week: d,
      open_time: "09:00",
      close_time: "17:00",
      is_open: true,
      consult_duration_mins: 30,
    }));
  if (missing.length) await db.from("firm_trading_hours").insert(missing);

  const { data: pack } = await db
    .from("firm_packs")
    .select("id")
    .eq("firm_id", firmId)
    .eq("status", "active")
    .maybeSingle();
  if (!pack) {
    await db.from("firm_packs").insert({
      firm_id: firmId,
      pack_size: 10,
      price_per_show: 0,
      status: "active",
    });
  }

  return { ok: true, firmId: firmId!, created };
}
