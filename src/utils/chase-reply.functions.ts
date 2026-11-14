import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateClinicEmailDraft } from "@/lib/clinic-reschedule-email";
import { deliverClinicEmailOnce } from "@/lib/clinic-email-delivery";
import { sendClinicEmail } from "./clinic-mailer.server";

const request = z.object({ appointmentId: z.string().uuid(), requestedAt: z.string().datetime({ offset: true }).nullable() });
const reply = request.extend({ recipient: z.string().email(), subject: z.string(), body: z.string() });
const template = "clinic_chase_reply";
const middleware = [attachSupabaseAuth, requireSupabaseAuth] as const;

async function loadRequest(db: SupabaseClient, input: z.infer<typeof request>) {
  const [admin, sales] = await Promise.all([
    db.rpc("is_admin_user"), db.rpc("has_sales_role", { _roles: ["admin", "rep"] }),
  ]);
  if (!admin.data && !sales.data) throw new Error("Sales access required.");
  // Read under the caller's appointment and clinic access policies.
  const { data, error } = await db.from("clinic_appointments")
    .select("clinic_id, chase_requested_at, partner_clinics(email)")
    .eq("id", input.appointmentId).eq("chase_status", "requested").maybeSingle();
  if (error || !data || data.chase_requested_at !== input.requestedAt) {
    throw new Error("This chase request changed. Refresh the queue.");
  }
  const clinic = data.partner_clinics as unknown as { email: string | null } | null;
  return { clinicId: data.clinic_id, email: clinic?.email?.trim() ?? "" };
}

export const getChaseReplies = createServerFn({ method: "POST" })
  .middleware([...middleware])
  .inputValidator((d: z.infer<typeof request>) => request.parse(d))
  .handler(async ({ data, context }) => {
    const clinic = await loadRequest(context.supabase, data);
    const db: SupabaseClient = supabaseAdmin;
    const { data: rows, error } = await db.from("email_send_log")
      .select("id, recipient_email, status, metadata, created_at").eq("template_name", template)
      .contains("metadata", { appointment_id: data.appointmentId, clinic_id: clinic.clinicId, requested_at: data.requestedAt })
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load previous clinic emails.");
    return (rows ?? []).map(row => ({
      id: String(row.id), to: String(row.recipient_email), status: String(row.status), at: String(row.created_at),
      subject: String(row.metadata.subject), body: String(row.metadata.body),
    }));
  });

export const sendChaseReply = createServerFn({ method: "POST" })
  .middleware([...middleware])
  .inputValidator((d: z.infer<typeof reply>) => ({ ...reply.parse(d), ...validateClinicEmailDraft(d) }))
  .handler(async ({ data, context }) => {
    const { clinicId, email } = await loadRequest(context.supabase, data);
    if (!z.string().email().safeParse(email).success || email !== data.recipient) {
      throw new Error("The clinic email address changed or is missing. Refresh the queue.");
    }
    const metadata = {
      appointment_id: data.appointmentId, clinic_id: clinicId, requested_at: data.requestedAt,
      subject: data.subject, body: data.body, author_id: context.userId,
    };
    // All tabs derive the same claim for identical content on this chase.
    const key = JSON.stringify([template, data.appointmentId, clinicId, data.requestedAt, email, data.subject, data.body]);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const id = [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20,32)].join("-");
    const db: SupabaseClient = supabaseAdmin;
    const entry = () => db.from("email_send_log");
    const event = { id, appointment_id: data.appointmentId, email_to: email, email_subject: data.subject, email_body: data.body };
    return deliverClinicEmailOnce({
      async claim() {
        const { error } = await entry().insert({ id, message_id: hex, template_name: template, recipient_email: email, status: "pending", metadata });
        if (!error) return event;
        if (error.code !== "23505") throw new Error("Could not record the outgoing email.");
        const retry = await entry().update({ status: "pending", error_message: null, metadata })
          .eq("id", id).eq("status", "failed").select("id").maybeSingle();
        if (retry.error) throw new Error("Could not check the previous send.");
        return retry.data ? event : null;
      },
      async existing() {
        const { data: row, error } = await entry().select("status, error_message").eq("id", id).single();
        if (error) throw new Error("Could not check the previous send.");
        return row.status === "sent" ? { status: "accepted", error: null }
          : { status: "uncertain", error: row.error_message || "This email was already submitted. Check delivery before sending again." };
      },
      send: () => sendClinicEmail(email, data.subject, data.body),
      async finish(result) {
        const status = result.status === "accepted" ? "sent" : result.status === "failed" ? "failed" : "pending";
        const { error } = await entry().update({ status, error_message: result.error ?? null })
          .eq("id", id).eq("status", "pending").select("id").single();
        if (error) throw error;
      },
    });
  });
