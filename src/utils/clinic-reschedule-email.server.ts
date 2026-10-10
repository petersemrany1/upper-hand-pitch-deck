import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { deliverClinicEmailOnce, type ClinicEmailEvent, type EmailSendResult } from "@/lib/clinic-email-delivery";

export async function sendClinicRescheduleEmail(event: ClinicEmailEvent): Promise<EmailSendResult> {
  const key = process.env.RESEND_API_KEY, gateway = process.env.LOVABLE_API_KEY;
  if (!key || !gateway) return {status: "failed", error: "Email service is not configured."};
  const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: {"Content-Type": "application/json", Authorization: `Bearer ${gateway}`, "X-Connection-Api-Key": key, "Idempotency-Key": `clinic-reschedule-${event.id}`},
    body: JSON.stringify({from: "Hair Transplant Group <admin@bold-patients.com>", reply_to: "admin@bold-patients.com", to: [event.email_to], subject: event.email_subject, text: event.email_body}),
  });
  if (!response.ok) {
    // A gateway/server timeout can follow a successful send. Never blindly retry it.
    const uncertain = response.status >= 500 || [408,409].includes(response.status);
    return {status: uncertain ? "uncertain" : "failed", error: `Email service returned ${response.status}.${uncertain ? " Check delivery before sending again." : " The email was not accepted; you can retry it."}`};
  }
  const receipt = await response.json() as {id?: string};
  if (!receipt.id) return {status: "uncertain", error: "Email service returned no receipt. Check delivery before sending again."};
  return {status: "accepted", receipt: receipt.id};
}
export async function deliverClinicRescheduleEmail(eventId: string) {
  const db = supabaseAdmin as any;
  return deliverClinicEmailOnce({
    async claim() { const {data,error} = await db.rpc("claim_reschedule_email", {p_event: eventId}); if(error) throw error; return data; },
    async existing() { const {data,error} = await db.from("appointment_reschedules").select("email_status,email_error").eq("id",eventId).single(); if(error) throw error; return {status:data.email_status,error:data.email_error}; },
    send: sendClinicRescheduleEmail,
    async finish(result) { const {error} = await db.from("appointment_reschedules").update({email_status:result.status,email_error:result.error??null,email_receipt:result.receipt??null,email_accepted_at:result.status==="accepted"?new Date().toISOString():null}).eq("id",eventId).eq("email_status","sending"); if(error) throw error; },
  });
}
