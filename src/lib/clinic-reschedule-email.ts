import type { RescheduleSnapshot } from "./booking-reschedule";

export type ClinicEmailDraft = { subject: string; body: string };
export function appointmentEmailLabel(date: string, time: string): string {
  // These are clinic wall-clock values. Do not convert through the rep's timezone.
  const day = new Date(date + "T12:00:00Z").toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const [hour, minute] = time.split(":").map(Number);
  return `${day} at ${hour % 12 || 12}:${String(minute).padStart(2, "0")}${hour >= 12 ? "pm" : "am"}`;
}
export function clinicRescheduleEmail(s: RescheduleSnapshot, date: string, time: string): ClinicEmailDraft {
  const name = s.appointment.patient_name;
  return {
    subject: `Consultation rescheduled — ${name}`,
    body: `Hi ${s.clinic.clinic_name} team,

${name} called to reschedule their consultation. We’ve moved their appointment to:

Previous appointment: ${appointmentEmailLabel(s.appointment.appointment_date, s.appointment.appointment_time)}
New appointment: ${appointmentEmailLabel(date, time)}

The patient will receive a text confirming their new appointment details.`,
  };
}
export function validateClinicEmailDraft(draft: ClinicEmailDraft): ClinicEmailDraft {
  if (typeof draft.subject !== "string" || !draft.subject.trim() || draft.subject.length > 200 || /[\r\n]/.test(draft.subject)) throw new Error("Enter an email subject of up to 200 characters on one line.");
  if (typeof draft.body !== "string" || !draft.body.trim() || draft.body.length > 5000) throw new Error("Enter an email message of up to 5,000 characters.");
  return {subject: draft.subject.trim(), body: draft.body.trim()};
}
export function validClinicEmail(value: string | null | undefined): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
