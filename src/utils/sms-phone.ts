import { normalizeAUPhone } from "./phone";

export const INVALID_SMS_PHONE = "Check the recipient's phone number. Use 04xx xxx xxx or +61 4xx xxx xxx for an Australian mobile. The SMS was not sent.";

/** Normalize once, and reject malformed/masked numbers before any send. */
export function normalizeSmsPhone(raw: string | null | undefined): string | null {
  const input = raw?.trim();
  // Do not turn letters, extensions or redaction characters into a different number.
  if (!input || !/^\+?[\d\s().-]+$/.test(input)) return null;
  const phone = normalizeAUPhone(input);
  if (!phone) return null;
  if (phone.startsWith("+61")) {
    return /^\+61[234578]\d{8}$/.test(phone) ? phone : null;
  }
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
