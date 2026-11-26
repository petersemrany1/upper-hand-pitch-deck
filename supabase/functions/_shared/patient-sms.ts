/** Historical preference only; senders resolve an active pool number before sending. */
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

/** Shared rescheduling policy for patient booking and payment texts. */
export function patientRescheduleNotice(clinicPhone?: string | null): string {
  const phone = clinicPhone?.trim();
  const contact = phone ? `call ${phone}` : "call the clinic";
  return `If you need to reschedule, ${contact} at least 24 hours before your appointment to keep your deposit.`;
}

/** Patient confirmation copy shared by the SMS sender and its preview. */
export function bookingConfirmationSms(input: PatientSmsDetails): string {
  return appointmentDetails(input, `your hair transplant consultation is confirmed for ${input.date}`)
    + ` ${patientRescheduleNotice(input.clinicPhone)}`;
}

export type PatientReminderKind = "3day" | "24h" | "request" | "followup";

export function appointmentReminderSms(input: PatientSmsDetails, kind: PatientReminderKind): string {
  if (!input.clinicName.trim() || !input.clinicAddress?.trim() || !input.clinicPhone?.trim()) {
    throw new Error("Missing clinic name, address or phone");
  }
  if (!input.consultantName?.trim() && !input.doctorName?.trim()) throw new Error("Missing consultation provider");
  const opening = kind === "24h" ? `your consultation is tomorrow (${input.date})`
    : kind === "followup" ? `we haven't heard back about your consultation on ${input.date}`
    : `your consultation is on ${input.date}`;
  const confirm = kind === "request" || kind === "followup" ? " Please reply YES to confirm you'll attend." : "";
  return appointmentDetails(input, opening) + ` ${patientRescheduleNotice(input.clinicPhone)}` + confirm;
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
  return appointmentDetails(input, `your hair transplant consultation has been rescheduled to ${input.date}`) + ` ${patientRescheduleNotice(input.clinicPhone)}`;
}
