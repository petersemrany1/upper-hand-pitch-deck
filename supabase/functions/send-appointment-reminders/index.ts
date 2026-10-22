// Every five minutes; each clinic’s local schedule determines what is due. Dry runs never write.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { requireInternalOrSalesRole } from "../_shared/authorize.ts";
import { PATIENT_SMS_FROM } from "../_shared/patient-sms.ts";
import { sendSms } from "./twilio.ts";
import { processConfirmationWorkflow, type ConfirmationBooking } from "./confirmation-workflow.ts";
import { type ReminderSettings } from "../_shared/appointment-confirmation.ts";
import { sendConfirmationEmail } from "./email.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
async function logToInbox(sb: any, opts: {
  to: string;
  body: string;
  sid?: string;
  status?: string;
  displayName?: string;
  leadId?: string | null;
}) {
  try {
    let threadId: string | null = null;
    const { data: existing } = await sb
      .from("sms_threads")
      .select("id")
      .eq("phone", opts.to)
      .maybeSingle();
    if (existing?.id) {
      threadId = existing.id;
    } else {
      const { data: created } = await sb
        .from("sms_threads")
        .insert({ phone: opts.to, display_name: opts.displayName ?? null })
        .select("id")
        .single();
      threadId = created?.id ?? null;
    }
    if (!threadId) return;
    await sb.from("sms_messages").insert({
      thread_id: threadId,
      direction: "outbound",
      body: opts.body,
      twilio_message_sid: opts.sid ?? null,
      status: opts.status ?? "queued",
      from_number: PATIENT_SMS_FROM,
      to_number: opts.to,
      lead_id: opts.leadId ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[send-appointment-reminders] logToInbox failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrSalesRole(req, corsHeaders, ["admin"]);
  if (denied) return denied;
  let body: Record<string, unknown> = {};
  if (req.method === "POST" || req.method === "PUT") {
    try { body = await req.json(); } catch { /* Cron may have no body. */ }
  }
  if ("test_phone" in body) return json({ error: "Live test sends are disabled. Use dry_run: true for a preview without sending." }, 400);
  const dryRun = body.dry_run === true;
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || (!dryRun && (!accountSid || !authToken))) return json({ error: "Missing env" }, 500);
  const sb = createClient(url, key);
  const now = new Date();
  try {
    if (!dryRun) {
      const { error } = await sb.rpc("recover_stale_confirmation_deliveries");
      if (error) throw error;
    }
    const allSettings: ReminderSettings[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await sb.from("clinic_reminder_settings").select("*").order("clinic_id").range(offset, offset + 499);
      if (error) throw error;
      allSettings.push(...data);
      if (data.length < 500) break;
    }
    const rows: ConfirmationBooking[] = [];
    const settings = new Map<string, ReminderSettings>();
    // Stable pagination avoids silently missing bookings beyond the API cap.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await sb.from("appointment_reminders").select(`
        *, appointment:clinic_appointments!appointment_reminders_appointment_id_fkey(
          id, clinic_id, appointment_date, appointment_time, doctor_id, outcome, disqualified_at,
          clinic:partner_clinics!clinic_appointments_clinic_id_fkey(
            clinic_name,address,city,state,phone,
            team:partner_doctors(id,name,is_active,conducts_consultations)
          )
        )
      `).eq("status", "confirmed").gte("booking_date", now.toISOString().slice(0,10)).order("id").range(offset, offset + 499);
      if (error) throw error;
      rows.push(...(data as unknown as ConfirmationBooking[]));
      for (const row of data as any[]) {
        const config = allSettings.find(s => s.clinic_id === row.appointment?.clinic_id);
        if (config) settings.set(row.id, config);
      }
      if (!data || data.length < 500) break;
    }
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://hairtransplantgroup.lovable.app";
    const results = await processConfirmationWorkflow(rows, settings, now, dryRun, {
      async claim(row, config, kind, message, destination) {
        const { data, error } = await sb.rpc("claim_confirmation_delivery", {
          p_reminder: row.id, p_revision: row.confirmation_revision, p_kind: kind,
          p_settings_version: config.updated_at, p_body: message, p_destination: destination,
        });
        if (error) throw error;
        return data;
      },
      async finish(id, status, provider, errorMessage) {
        const { error } = await sb.rpc("finish_confirmation_delivery", { p_delivery: id, p_status: status, p_provider: provider ?? null, p_error: errorMessage ?? null });
        if (error) throw error;
      },
      sms: (to, message, deliveryId) => sendSms(accountSid!, authToken!, to, message, fetch, `${baseUrl}/api/public/hooks/twilio-message-status?reminder_delivery=${encodeURIComponent(deliveryId)}`),
      email: (to, subject, html, key) => sendConfirmationEmail(to, subject, html, key, { apiKey: Deno.env.get("RESEND_API_KEY"), gatewayKey: Deno.env.get("LOVABLE_API_KEY") }),
      log: (row, to, message, result) => logToInbox(sb, { to, body: message, sid: result.sid, status: result.status, leadId: row.lead_id }),
    }, baseUrl);
    return json({ ok: !results.some(r => r.error), mode: dryRun ? "dry_run" : "send", sender: PATIENT_SMS_FROM, configuration: { sms: Boolean(accountSid && authToken), email: Boolean(Deno.env.get("RESEND_API_KEY")) }, scanned: rows.length, processed: results.length, results });
  } catch (error) {
    console.error("[send-appointment-reminders] failed", error);
    return json({ error: error instanceof Error ? error.message : "Reminder database query failed" }, 500);
  }
});
