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

function appointmentDetails(input: PatientSmsDetails, opening: string): string {
  const name = (input.consultantName?.trim() || input.doctorName?.trim() || "your consultation provider")
    .split(" — ")[0].trim();
  const address = input.clinicAddress?.trim().replace(/[.\s]+$/, "");
  return `Hi ${input.firstName.trim() || "there"}, ${opening} at ${input.time} with ${name} at ${input.clinicName}.`
    + (address ? ` Address: ${address}.` : "");
}

function rescheduleContact(input: PatientSmsDetails): string {
  const phone = input.clinicPhone?.trim();
  return phone ? ` If you need to reschedule, call ${input.clinicName} on ${phone}.` : "";
}

/** Patient confirmation copy shared by the SMS sender and its preview. */
export function bookingConfirmationSms(input: PatientSmsDetails): string {
  const phone = input.clinicPhone?.trim();
  const contact = phone ? `Call ${input.clinicName} on ${phone}` : "Let us know";
  return appointmentDetails(input, `your hair transplant consultation is confirmed for ${input.date}`)
    + ` Need to cancel or reschedule? ${contact} at least 24 hours before your appointment to keep your deposit.`;
}

export function appointmentReminderSms(input: PatientSmsDetails, kind: "3day" | "24h"): string {
  if (!input.clinicName.trim() || !input.clinicAddress?.trim() || !input.clinicPhone?.trim()) {
    throw new Error("Missing clinic name, address or phone");
  }
  if (!input.consultantName?.trim() && !input.doctorName?.trim()) throw new Error("Missing consultation provider");
  return appointmentDetails(input, `this is a reminder that your hair transplant consultation is scheduled for ${kind === "24h" ? `tomorrow (${input.date})` : input.date}`) + rescheduleContact(input);
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
  return appointmentDetails(input, `your hair transplant consultation has been rescheduled to ${input.date}`) + rescheduleContact(input);
}
