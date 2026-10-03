/** Shared by the web confirmation sender and scheduled Edge Function. */
export const PATIENT_SMS_FROM = "+61468031075";

export type PatientSmsDetails = {
  firstName: string;
  date: string;
  time: string;
  consultantName?: string | null;
  doctorName?: string | null;
  clinicName: string;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
};

function patientSms(input: PatientSmsDetails, opening: string): string {
  const name = (input.consultantName?.trim() || input.doctorName?.trim() || "your consultation provider")
    .split(" — ")[0].trim();
  const address = input.clinicAddress?.trim().replace(/[.\s]+$/, "");
  const phone = input.clinicPhone?.trim();
  return `Hi ${input.firstName.trim() || "there"}, ${opening} at ${input.time} with ${name} at ${input.clinicName}.`
    + (address ? ` Address: ${address}.` : "")
    + (phone ? ` If you need to reschedule, call ${input.clinicName} on ${phone}.` : "");
}

/** Patient confirmation copy shared by the SMS sender and its preview. */
export function bookingConfirmationSms(input: PatientSmsDetails): string {
  return patientSms(input, `your hair transplant consultation is confirmed for ${input.date}`);
}

export function appointmentReminderSms(input: PatientSmsDetails, kind: "3day" | "24h"): string {
  if (!input.clinicName.trim() || !input.clinicAddress?.trim() || !input.clinicPhone?.trim()) {
    throw new Error("Missing clinic name, address or phone");
  }
  if (!input.consultantName?.trim() && !input.doctorName?.trim()) throw new Error("Missing consultation provider");
  return patientSms(input, `this is a reminder that your hair transplant consultation is scheduled for ${kind === "24h" ? `tomorrow (${input.date})` : input.date}`);
}

/** Some clinic addresses contain the suburb/state already; others store them separately. */
export function clinicSmsAddress(clinic: { address: string | null; city: string | null; state: string | null } | null | undefined): string {
  const address = clinic?.address?.trim() ?? "";
  if (!address) return "";
  const parts = [address];
  if (clinic?.city && !address.toLowerCase().includes(clinic.city.toLowerCase()) && !/\b\d{4}\b/.test(address)) parts.push(clinic.city);
  if (clinic?.state && !address.toLowerCase().split(/\W+/).includes(clinic.state.toLowerCase())) parts.push(clinic.state);
  return parts.join(", ");
}

export function rescheduleConfirmationSms(input: PatientSmsDetails): string {
  return patientSms(input, `your hair transplant consultation has been rescheduled to ${input.date}`);
}
