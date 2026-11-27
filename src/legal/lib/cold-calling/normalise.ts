// Ported from the Legal app (family-law-floater/src/lib/cold-calling/normalise.ts). Re-run the port script to refresh.
// Pure normalisation helpers shared by the browser (import preview) and the
// server (import commit, dial guards). No I/O, no Twilio.

export type AuPhoneKind = "landline" | "mobile" | "national" | "unknown";

export type NormalisedPhone = { e164: string; kind: AuPhoneKind; national: string };

const NOT_FOUND = /^(not\s*found|not\s*verified|n\/?a|none|-+)$/i;

/**
 * Normalise an Australian business number to E.164. Returns null rather than
 * guessing — a null here must never be dialled.
 *
 * Accepts: "03 8672 5222", "(03) 8672-5222", "+61 3 8672 5222", "+613 8672 5222",
 * "tel:+61386725222", "Call (02) 9412 4500", "1300 749 709", "13 11 14",
 * "0412 345 678", "+61 412 345 678", "61 3 8672 5222", "9412 4500" (9 digits → +61).
 */
export function normaliseAuPhone(input: string | null | undefined): NormalisedPhone | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed || NOT_FOUND.test(trimmed)) return null;
  // Keep only digits and a leading plus; "tel:", "Call", brackets and dashes go.
  const cleaned = trimmed.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
  const plus = cleaned.startsWith("+");
  let digits = cleaned.replace(/\D/g, "");
  if (!digits) return null;

  let national: string | null = null;
  if (plus || digits.startsWith("61")) {
    if (digits.startsWith("61")) {
      const rest = digits.slice(2);
      // "+61 03 ..." — a leading trunk zero left in by mistake.
      national = rest.startsWith("0") && rest.length === 10 ? rest.slice(1) : rest;
    } else {
      return null; // a foreign number — never dial it as Australian
    }
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.startsWith("0011")) {
    return null;
  } else if (digits.length === 10 && (digits.startsWith("1300") || digits.startsWith("1800"))) {
    national = digits;
  } else if (digits.length === 6 && digits.startsWith("13")) {
    national = digits;
  } else if (digits.length === 9) {
    national = digits;
  }
  if (!national) return null;

  let kind: AuPhoneKind = "unknown";
  if (national.length === 9) {
    const lead = national[0];
    if (lead === "4") kind = "mobile";
    else if (lead === "2" || lead === "3" || lead === "7" || lead === "8") kind = "landline";
    else return null;
  } else if (
    national.length === 10 &&
    (national.startsWith("1300") || national.startsWith("1800"))
  ) {
    kind = "national";
  } else if (national.length === 6 && national.startsWith("13")) {
    kind = "national";
  } else {
    return null;
  }
  digits = `61${national}`;
  return { e164: `+${digits}`, kind, national };
}

/**
 * 13, 1300 and 1800 numbers. Twilio cannot route these from an Australian caller ID:
 * the dial fails instantly, so they must never enter the calling queue.
 */
export function isNationalRateNumber(e164: string | null | undefined): boolean {
  return /^\+61(13\d{4}|1300\d{6}|1800\d{6})$/.test(e164 ?? "");
}

/** Last nine digits — the matching key used by the existing sales tables. */
export function phoneTail(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(-9);
}

/** "+61 3 •••• •222" — enough to recognise a number without exposing it. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 6) return "•••";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 3)} •••• •${digits.slice(-3)}`;
}

/** Human display for an E.164 AU number. */
export function formatAuPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const digits = e164.replace(/\D/g, "");
  if (!digits.startsWith("61")) return e164;
  const national = digits.slice(2);
  if (national.length === 9 && national.startsWith("4")) {
    return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  if (national.length === 9) {
    return `(0${national[0]}) ${national.slice(1, 5)} ${national.slice(5)}`;
  }
  if (national.length === 10)
    return `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7)}`;
  if (national.length === 6)
    return `${national.slice(0, 2)} ${national.slice(2, 4)} ${national.slice(4)}`;
  return e164;
}

/**
 * Root domain: lower-case host without scheme, "www.", path, port or trailing dot.
 * Returns null when nothing domain-like remains.
 */
export function normaliseDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let value = String(input).trim().toLowerCase();
  if (!value || NOT_FOUND.test(value)) return null;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.replace(/^\/\//, "");
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/:\d+$/, "");
  value = value.replace(/^www\./, "");
  value = value.replace(/\.+$/, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return null;
  return value;
}

/** YES / NO / NOT VERIFIED (and friends) → true / false / null. */
export function parseTriState(input: string | null | undefined): boolean | null {
  if (input == null) return null;
  const value = String(input).trim().toLowerCase();
  if (!value) return null;
  if (["yes", "y", "true", "confirmed", "1"].includes(value)) return true;
  if (["no", "n", "false", "0"].includes(value)) return false;
  return null;
}

/** "14" → 14, "NOT VERIFIED" → null, "4.9" → 4.9. */
export function parseNumber(input: string | null | undefined): number | null {
  if (input == null) return null;
  const value = String(input).trim();
  if (!value || NOT_FOUND.test(value)) return null;
  const n = Number(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Blank, "NOT FOUND" and "NOT VERIFIED" all mean "we have nothing". */
export function cleanText(input: string | null | undefined): string | null {
  if (input == null) return null;
  const value = String(input).trim();
  if (!value || NOT_FOUND.test(value)) return null;
  return value;
}

/** Split "A | B | C" style multi-value cells. */
export function splitPipes(input: string | null | undefined): string[] {
  const value = cleanText(input);
  if (!value) return [];
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}
