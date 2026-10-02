/** Patient confirmation copy shared by the SMS sender and its preview. */
export function bookingConfirmationSms(input: {
  firstName: string;
  date: string;
  time: string;
  consultantName?: string | null;
  doctorName?: string | null;
  clinicName: string;
  clinicAddress?: string | null;
  clinicPhone?: string | null;
}): string {
  // Saved appointment labels may include a role after the name. SMS uses the
  // name only, preserving an existing Dr prefix without adding one.
  const name = (input.consultantName?.trim() || input.doctorName?.trim() || "your consultation provider")
    .split(" — ")[0].trim();
  const address = input.clinicAddress?.trim().replace(/[.\s]+$/, "");
  const phone = input.clinicPhone?.trim();
  return `Hi ${input.firstName.trim() || "there"}, your hair transplant consultation is confirmed for ${input.date} at ${input.time} with ${name} at ${input.clinicName}.`
    + (address ? ` Address: ${address}.` : "")
    + (phone ? ` If you need to reschedule, call ${input.clinicName} on ${phone}.` : "");
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
