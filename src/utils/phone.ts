// Australian phone number normaliser. Returns E.164 (+61...) when valid,
// otherwise null so callers can show a clear error instead of dialling junk.
//
// Handles:
//   04XX XXX XXX        → +614XX XXX XXX  (mobile)
//   02 / 03 / 07 / 08   → +612... etc.    (landline)
//   1300 XXX XXX        → +611300XXXXXX
//   1800 XXX XXX        → +611800XXXXXX
//   13 XX XX            → +6113XXXX
//   +61 ...             → preserved
//   61... (no plus)     → +61...

export function normalizeAUPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip everything except digits and a leading +.
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return null;

  // Already +61...
  if (hasPlus && digits.startsWith("61")) {
    const rest = digits.slice(2);
    if (rest.length < 8 || rest.length > 12) return null;
    return "+" + digits;
  }

  // Already +<other country>... — pass through if it's at least 8 digits.
  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return null;
    return "+" + digits;
  }

  // 61... without plus — same handling as above.
  if (digits.startsWith("61") && digits.length >= 10) {
    return "+" + digits;
  }

  // 1300 / 1800 / 13 — 6-digit short codes (13 XX XX) or 10-digit 1300/1800.
  if (digits.startsWith("1300") || digits.startsWith("1800")) {
    if (digits.length !== 10) return null;
    return "+61" + digits;
  }
  if (digits.startsWith("13") && digits.length === 6) {
    return "+61" + digits;
  }

  // Standard AU national format: starts with 0, 10 digits total.
  // 04XX = mobile, 02/03/07/08 = landline.
  if (digits.startsWith("0")) {
    if (digits.length !== 10) return null;
    const second = digits[1];
    if (!"234578".includes(second)) return null;
    return "+61" + digits.slice(1);
  }

  // 9-digit number with no leading 0 — assume AU, prepend +61.
  if (digits.length === 9 && "234578".includes(digits[0])) {
    return "+61" + digits;
  }

  return null;
}

export function isValidAUPhone(raw: string | null | undefined): boolean {
  return normalizeAUPhone(raw) !== null;
}
