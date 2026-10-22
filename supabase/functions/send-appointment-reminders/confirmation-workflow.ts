import { nextReminderAction, type ConfirmationFields, type DeliveryKind, type ReminderSettings, type WorkflowBooking } from "../_shared/appointment-confirmation.ts";
import { reminderCopy, formatAUPhone, type Reminder, type SendResult } from "./reminders.ts";

export type ConfirmationBooking = Reminder & WorkflowBooking & ConfirmationFields & { patient_last_name?: string | null };
export type WorkflowDependencies = {
  claim(row: ConfirmationBooking, settings: ReminderSettings, kind: DeliveryKind, body: string, destination: string): Promise<string | null>;
  finish(id: string, status: "accepted" | "failed" | "unknown", provider?: string, error?: string): Promise<void>;
  sms(to: string, body: string, deliveryId: string): Promise<SendResult>;
  email(to: string, subject: string, html: string, idempotencyKey: string): Promise<SendResult>;
  log(row: ConfirmationBooking, to: string, body: string, result: SendResult): Promise<void>;
};
export function workflowSms(row: ConfirmationBooking, kind: Exclude<DeliveryKind, "call_email">, anonymize = false): string {
  if (kind === "3day" || kind === "24h") return reminderCopy(row, kind, anonymize);
  // Validate appointment, contact and provider even for acknowledgements.
  const details = reminderCopy(row, "3day", anonymize);
  if (kind === "ack") return details.replace("this is a reminder that your hair transplant consultation is scheduled", "thanks for confirming. Your consultation is booked");
  if (kind === "followup") return details.replace("this is a reminder that", "we haven’t received your confirmation yet.").replace("your hair", "Your hair") + " Please reply YES to confirm you’ll attend, or CHANGE if you need another time.";
  return details + " Please reply YES to confirm you’ll attend, or CHANGE if you need another time.";
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export function confirmationEmail(row: ConfirmationBooking, settings: ReminderSettings, baseUrl: string) {
  const clinic = row.appointment?.clinic?.clinic_name || "Clinic";
  const reason = row.confirmation_reason === "patient_reply" ? "The patient replied and needs your help." : row.confirmation_reason === "delivery_failed" ? "Their reminder could not be delivered reliably." : row.confirmation_reason === "opt_out" ? "The patient has opted out of SMS." : row.confirmation_requested_at ? "They have not confirmed that they will attend." : "This booking needs a call because there was not enough time for the usual confirmation sequence.";
  const name = [row.patient_first_name, row.patient_last_name].filter(Boolean).join(" ") || "Patient";
  const link = `${baseUrl.replace(/\/$/, "")}/booked-appointments?appointment=${encodeURIComponent(row.appointment_id!)}`;
  const date = row.booking_date ? new Date(row.booking_date + "T12:00:00Z").toLocaleDateString("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }) : "";
  const time = row.booking_time?.slice(0, 5) || "";
  const stamp = (value: string) => new Date(value).toLocaleString("en-AU", { timeZone: settings.timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const history = [["First request", row.confirmation_requested_at], ["Second request", row.confirmation_followup_at]].filter(([, value]) => value).map(([label, value]) => `${label}: ${escape(stamp(value!))}`).join("<br>");
  return { subject: `Please confirm appointment: ${name} · ${clinic}`, html: `<div style="font:16px/1.6 Arial,sans-serif;max-width:580px;color:#17212d"><h2>Please call to confirm this appointment</h2><p>${escape(reason)}</p><p><strong>${escape(name)}</strong><br>${escape(clinic)}<br>${escape(date)} at ${escape(time)} (${escape(settings.timezone)})</p><p><a href="tel:${escape(formatAUPhone(row.patient_phone) || "")}">${escape(row.patient_phone || "No phone number saved")}</a></p>${history ? `<p>${history} (clinic local time)</p>` : ""}${row.confirmation_last_reply ? `<p>Latest reply: ${escape(row.confirmation_last_reply)}</p>` : ""}<p><a href="${escape(link)}">Open appointment and record the call</a></p><p style="font-size:13px;color:#666">Check the current status before calling: a reply received after this email clears the call flag. The appointment remains booked.</p></div>` };
}

export async function processConfirmationWorkflow(rows: ConfirmationBooking[], settings: Map<string, ReminderSettings>, now: Date, dryRun: boolean, deps: WorkflowDependencies, baseUrl: string) {
  const results: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const config = settings.get(row.id);
    if (!config) { results.push({ id: row.id, error: "Clinic reminder settings are missing" }); continue; }
    let delivery: string | null = null;
    try {
      if (!row.appointment || row.appointment.outcome || row.appointment.disqualified_at) continue;
      const kind = nextReminderAction(row, config, now);
      if (!kind) continue;
      const to = kind === "call_email" ? config.alert_email : formatAUPhone(row.patient_phone);
      // Even a missing phone must produce a call-list entry/email instead of vanishing.
      const email = confirmationEmail(row, config, baseUrl);
      let body = email.html;
      let validationError: string | undefined;
      if (kind !== "call_email") {
        try { body = workflowSms(row, kind, dryRun); }
        catch (error) { body = "Reminder could not be prepared"; validationError = error instanceof Error ? error.message : "Invalid appointment details"; }
      }
      if (dryRun && validationError) { results.push({ id: row.id, kind, error: validationError }); continue; }
      if (dryRun) { results.push({ id: row.id, kind, clinic: row.appointment.clinic?.clinic_name, timezone: config.timezone, mode: config.mode, body: kind === "call_email" ? "Email asking the team to call (patient details omitted)" : body }); continue; }
      delivery = await deps.claim(row, config, kind, body, to || "invalid phone");
      if (!delivery) continue;
      const result = validationError ? { ok: false, error: validationError } : !to ? { ok: false, error: "Invalid patient phone number" } : kind === "call_email" ? await deps.email(to, email.subject, body, delivery) : await deps.sms(to, body, delivery);
      // Persist provider acceptance before inbox logging; a logging failure must never cause a duplicate send.
      await deps.finish(delivery, result.ok ? "accepted" : "failed", result.sid, result.error);
      if (result.ok && kind !== "call_email") {
        try { await deps.log(row, to!, body, result); }
        catch { results.push({ id: row.id, kind, warning: "Message sent but inbox history needs review" }); }
      }
      results.push({ id: row.id, kind, sent: result.ok, ...(result.error ? { error: result.error } : {}) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reminder processing failed";
      if (delivery) await deps.finish(delivery, "unknown", undefined, message).catch(() => {});
      results.push({ id: row.id, error: message });
    }
  }
  return results;
}
