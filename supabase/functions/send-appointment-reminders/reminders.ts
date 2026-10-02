import { appointmentReminderSms, clinicSmsAddress, PATIENT_SMS_FROM } from "../_shared/patient-sms.ts";

export type Kind = "3day" | "24h";
export type TeamMember = { id: string; name: string; is_active: boolean; conducts_consultations: boolean };
export type Reminder = {
  id: string; appointment_id: string | null; status: string; updated_at: string;
  booking_date: string | null; booking_time: string | null;
  patient_first_name: string | null; patient_phone: string | null; lead_id: string | null;
  three_day_sms_sent: boolean; twentyfour_hour_sms_sent: boolean;
  three_day_sms_claim: string | null; twentyfour_hour_sms_claim: string | null;
  appointment: null | {
    id: string; appointment_date: string; appointment_time: string; doctor_id: string | null;
    outcome: string | null; disqualified_at: string | null;
    clinic: null | { clinic_name: string; address: string | null; city: string | null; state: string | null; phone: string | null; team: TeamMember[] };
  };
};
export function sydneyDate(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}
export function daysUntilSydney(date: string, now: Date): number {
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(sydneyDate(now) + "T00:00:00Z")) / 86400000);
}
export function formatAUPhone(raw: string | null): string | null {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  const phone = digits.startsWith("0") ? "+61" + digits.slice(1) : digits.startsWith("61") ? "+" + digits : raw?.trim().startsWith("+") ? "+" + digits : "+61" + digits;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
export function consultationName(appointment: NonNullable<Reminder["appointment"]>): string {
  const team = appointment.clinic?.team.filter(d => d.is_active && d.conducts_consultations) ?? [];
  const selected = team.find(d => d.id === appointment.doctor_id);
  // Respect an explicitly booked consultant/consulting doctor. A surgeon-only
  // historical assignment may fall back only to a single consultation provider.
  const provider = selected ?? (team.length === 1 ? team[0] : undefined);
  if (!provider?.name.trim()) throw new Error("missing_or_ambiguous_consultation_provider");
  return provider.name;
}
export function reminderCopy(row: Reminder, kind: Kind, anonymize = false): string {
  const appointment = row.appointment;
  if (!appointment || appointment.id !== row.appointment_id) throw new Error("unlinked_appointment");
  if (appointment.outcome || appointment.disqualified_at) throw new Error("appointment_not_active");
  if (appointment.appointment_date !== row.booking_date || appointment.appointment_time.slice(0,5) !== row.booking_time?.slice(0,5)) throw new Error("appointment_schedule_mismatch");
  if (!row.booking_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.booking_date) || !row.booking_time || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(row.booking_time)) throw new Error("invalid_schedule");
  const clinic = appointment.clinic;
  if (!clinic) throw new Error("missing_clinic");
  const hour = Number(row.booking_time.slice(0,2));
  const time = `${hour % 12 || 12}:${row.booking_time.slice(3,5)} ${hour >= 12 ? "PM" : "AM"}`;
  const date = new Date(row.booking_date + "T12:00:00Z").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" });
  return appointmentReminderSms({ firstName: anonymize ? "[name]" : row.patient_first_name ?? "there", date, time,
    consultantName: consultationName(appointment), clinicName: clinic.clinic_name,
    clinicAddress: clinicSmsAddress(clinic), clinicPhone: clinic.phone }, kind);
}
export type SendResult = { ok: boolean; error?: string; sid?: string; status?: string };
export type Dependencies = {
  claim(row: Reminder, kind: Kind, token: string): Promise<boolean>;
  send(to: string, body: string): Promise<SendResult>;
  finish(row: Reminder, kind: Kind, token: string, result: SendResult): Promise<void>;
  log(row: Reminder, phone: string, body: string, result: SendResult): Promise<void>;
};
export async function processReminders(rows: Reminder[], now: Date, dryRun: boolean, deps: Dependencies) {
  const results: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    if (row.status !== "confirmed" || !row.booking_date) continue;
    const days = daysUntilSydney(row.booking_date, now);
    const kinds: Kind[] = dryRun && days >= 0 ? ["3day", "24h"] : days === 3 ? ["3day"] : days === 1 ? ["24h"] : [];
    for (const kind of kinds) {
      const sent = kind === "3day" ? row.three_day_sms_sent : row.twentyfour_hour_sms_sent;
      const claimed = kind === "3day" ? row.three_day_sms_claim : row.twentyfour_hour_sms_claim;
      if (!dryRun && (sent || claimed)) { results.push({ id: row.id, kind, skipped: sent ? "already_sent" : "claimed_needs_review" }); continue; }
      try {
        const phone = formatAUPhone(row.patient_phone);
        if (!phone) throw new Error("invalid_patient_phone");
        const message = reminderCopy(row, kind, dryRun);
        if (dryRun) {
          results.push({ id: row.id, kind, clinic: row.appointment!.clinic!.clinic_name, provider: consultationName(row.appointment!), from: PATIENT_SMS_FROM,
            body: message, due_today: days === (kind === "3day" ? 3 : 1), already_sent: sent, claimed: !!claimed });
          continue;
        }
        const token = crypto.randomUUID();
        if (!await deps.claim(row, kind, token)) { results.push({ id: row.id, kind, skipped: "changed_or_claimed" }); continue; }
        // Unknown network outcomes keep their claim. Never retry blindly.
        const result = await deps.send(phone, message);
        if (result.ok) await deps.log(row, phone, message, result);
        await deps.finish(row, kind, token, result);
        results.push({ id: row.id, kind, ...(result.ok ? { sent: true, sid: result.sid } : { error: result.error }) });
      } catch (error) {
        results.push({ id: row.id, kind, error: error instanceof Error ? error.message : "reminder_failed" });
      }
    }
  }
  return results;
}
