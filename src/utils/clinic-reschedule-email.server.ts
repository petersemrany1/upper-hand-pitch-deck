import { sendClinicEmail } from "./clinic-mailer.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { deliverClinicEmailOnce, type ClinicEmailEvent, type EmailSendResult } from "@/lib/clinic-email-delivery";
import { clinicRescheduleCc } from "@/lib/clinic-reschedule-email";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function sendClinicRescheduleEmail(event: ClinicEmailEvent, db: SupabaseClient = supabaseAdmin): Promise<EmailSendResult> {
  // Resolve CC server-side through the saved appointment, never a client-supplied
  // clinic or recipient list. A lookup failure must not silently omit the CCs.
  let cc: string[];
  try {
    if (!event.appointment_id) throw new Error("Missing appointment");
    const {data: appointment, error: appointmentError} = await db.from("clinic_appointments").select("clinic_id").eq("id", event.appointment_id).single();
    if (appointmentError || !appointment?.clinic_id) throw new Error("Appointment lookup failed");
    const {data: clinic, error: clinicError} = await db.from("partner_clinics").select("handover_cc").eq("id", appointment.clinic_id).single();
    if (clinicError || !clinic) throw new Error("Clinic lookup failed");
    cc = clinicRescheduleCc(clinic.handover_cc, event.email_to);
  } catch {
    return {status: "failed", error: "Could not load the clinic's CC addresses. No email was sent; please retry."};
  }

  return sendClinicEmail(event.email_to, event.email_subject, event.email_body, cc);
}
export async function deliverClinicRescheduleEmail(eventId: string) {
  const db: SupabaseClient = supabaseAdmin;
  return deliverClinicEmailOnce({
    async claim() { const {data,error} = await db.rpc("claim_reschedule_email", {p_event: eventId}); if(error) throw error; return data; },
    async existing() { const {data,error} = await db.from("appointment_reschedules").select("email_status,email_error").eq("id",eventId).single(); if(error) throw error; return {status:data.email_status,error:data.email_error}; },
    send: event => sendClinicRescheduleEmail(event, db),
    async finish(result) { const {error} = await db.from("appointment_reschedules").update({email_status:result.status,email_error:result.error??null,email_receipt:result.receipt??null,email_accepted_at:result.status==="accepted"?new Date().toISOString():null}).eq("id",eventId).eq("email_status","sending"); if(error) throw error; },
  });
}
