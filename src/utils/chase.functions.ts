import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

const RESEND_CONNECTION_KEY = process.env.RESEND_API_KEY ?? "";
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY ?? "";
const CHASE_INBOX = "peter@gobold.com.au";
const APP_BASE_URL = "https://hairtransplantgroup.lovable.app";

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

function esc(s: string | null | undefined) {
  return (s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}

async function sendChaseEmail(subject: string, html: string) {
  if (!RESEND_CONNECTION_KEY || !LOVABLE_API_KEY) {
    return { success: false, error: "Email gateway not configured" };
  }
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + LOVABLE_API_KEY,
        "X-Connection-Api-Key": RESEND_CONNECTION_KEY,
      },
      body: JSON.stringify({
        from: "Bold Patients <admin@bold-patients.com>",
        reply_to: "admin@bold-patients.com",
        to: [CHASE_INBOX],
        subject,
        html,
      }),
    });
    const result = await r.json();
    if (!r.ok) return { success: false, error: result?.message || "Resend failed" };
    return { success: true, id: result?.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Clinic (or admin) requests GoBold to chase a patient. */
export const requestChase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { appointmentId: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin = getAdminClient();
    const { data: appt, error: apptErr } = await admin
      .from("clinic_appointments")
      .select("id, clinic_id, lead_id, patient_name, patient_phone, appointment_date, appointment_time, deposit_amount, chase_status")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (apptErr || !appt) return { success: false, error: "Appointment not found" };

    // Authorization: allow if user is a clinic user for this clinic, or an admin/rep.
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    const { data: isClinicUser } = await context.supabase.rpc("is_clinic_user_for", { _clinic_id: appt.clinic_id });
    if (!isAdmin && !isClinicUser) {
      return { success: false, error: "Not authorised" };
    }

    if (appt.chase_status === "requested") {
      return { success: false, error: "Already awaiting follow-up" };
    }

    const note = (data.note ?? "").trim().slice(0, 2000);

    const { error: updErr } = await admin
      .from("clinic_appointments")
      .update({
        chase_status: "requested",
        chase_requested_at: new Date().toISOString(),
        chase_requested_by: context.userId,
        chase_note: note || null,
        chase_result_at: null,
        chase_result_by: null,
      })
      .eq("id", appt.id);
    if (updErr) return { success: false, error: updErr.message };

    // Gather email context
    const [{ data: clinic }, { data: lead }] = await Promise.all([
      admin.from("partner_clinics").select("clinic_name").eq("id", appt.clinic_id).maybeSingle(),
      appt.lead_id
        ? admin.from("meta_leads").select("first_name,last_name,phone,email").eq("id", appt.lead_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const clinicName = clinic?.clinic_name ?? "(unknown clinic)";
    const phone = appt.patient_phone || lead?.phone || "—";
    const consultDate = new Date(appt.appointment_date).toLocaleDateString("en-AU", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const deposit = appt.deposit_amount != null ? `$${Number(appt.deposit_amount).toLocaleString()}` : "—";
    const internalLink = appt.lead_id
      ? `${APP_BASE_URL}/sales-call?leadId=${appt.lead_id}`
      : `${APP_BASE_URL}/booked-appointments`;
    const clinicLink = `${APP_BASE_URL}/clinic-portal`;

    const subject = `Chase requested: ${appt.patient_name} (${clinicName})`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;color:#111;line-height:1.5">
        <h2 style="margin:0 0 12px;color:#1a3a6b">GoBold chase requested</h2>
        <p style="margin:0 0 16px;color:#555">${esc(clinicName)} has asked us to follow up with this patient.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <tbody>
            <tr><td style="padding:6px 0;color:#666;width:140px">Patient</td><td style="padding:6px 0"><strong>${esc(appt.patient_name)}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">Mobile</td><td style="padding:6px 0"><a href="tel:${esc(phone)}">${esc(phone)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#666">Clinic</td><td style="padding:6px 0">${esc(clinicName)}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Consult date</td><td style="padding:6px 0">${esc(consultDate)} · ${esc(appt.appointment_time)}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Deposit</td><td style="padding:6px 0">${esc(deposit)}</td></tr>
          </tbody>
        </table>
        ${note ? `
        <div style="margin-top:16px;padding:12px;background:#fff7ed;border:1px solid #fcd9a8;border-radius:8px">
          <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Note from clinic</div>
          <div style="font-size:13px;white-space:pre-wrap">${esc(note)}</div>
        </div>` : ""}
        <div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">
          <a href="${internalLink}" style="display:inline-block;background:#1a3a6b;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:13px">Open in Sales Portal</a>
          <a href="${clinicLink}" style="display:inline-block;background:#fff;color:#1a3a6b;border:1px solid #1a3a6b;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:13px">Open Clinic Portal</a>
        </div>
        <p style="margin-top:24px;font-size:11px;color:#999">Update the result from the Chase Queue in the internal portal — the outcome shows on the clinic's patient card.</p>
      </div>`;

    const emailResult = await sendChaseEmail(subject, html);
    return { success: true, emailSent: emailResult.success, emailError: emailResult.success ? null : emailResult.error };
  });

/** Internal: set result on a chase-requested appointment. */
export const resolveChase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { appointmentId: string; result: "rebooked" | "not_proceeding" | "no_answer" | "voicemail" }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
    const { data: hasSalesRole } = await context.supabase.rpc("has_sales_role", { _roles: ["admin", "rep"] });
    if (!isAdmin && !hasSalesRole) return { success: false, error: "Not authorised" };

    const admin = getAdminClient();
    const { error } = await admin
      .from("clinic_appointments")
      .update({
        chase_status: data.result,
        chase_result_at: new Date().toISOString(),
        chase_result_by: context.userId,
      })
      .eq("id", data.appointmentId)
      .eq("chase_status", "requested");
    if (error) return { success: false, error: error.message };
    return { success: true };
  });
