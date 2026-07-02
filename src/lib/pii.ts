/**
 * PII scrubbing for error reports. error_logs rows are visible to every
 * admin, so nothing personally identifying may be written into them:
 * no patient emails, phone numbers, or auth material.
 *
 * Pure module — safe to import from both browser code and server functions.
 */

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// Phone-like sequences: 8+ digits allowing spaces/dashes/dots/parens between,
// with optional leading +. Catches "+61 412 345 678", "(03) 9123 4567" etc.
const PHONE_RE = /[+(]?\d[\d\s().-]{6,}\d/g;

const BEARER_RE = /Bearer\s+[\w~+/.-]+=*/gi;

// JWTs: three base64url segments joined by dots.
const JWT_RE = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g;

/** Context keys whose values are always fully redacted, whatever they hold. */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "cookie",
  "email",
  "phone",
  "phone_number",
  "mobile",
];

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => k === s || k.endsWith(`_${s}`) || k.endsWith(s));
}

export function scrubString(value: string): string {
  return value
    .replace(BEARER_RE, "[redacted-token]")
    .replace(JWT_RE, "[redacted-token]")
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, (match) =>
      // Require at least 8 digits so ids/timestamps in text aren't mangled.
      match.replace(/\D/g, "").length >= 8 ? "[redacted-phone]" : match
    );
}

/**
 * Deep-scrub any value for logging. Strings are pattern-scrubbed; objects are
 * walked (sensitive keys fully redacted); depth-limited against cycles.
 */
export function scrubPii<T>(value: T, depth = 0): T {
  if (depth > 6) return "[max-depth]" as unknown as T;
  if (typeof value === "string") return scrubString(value) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => scrubPii(v, depth + 1)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? "[redacted]" : scrubPii(v, depth + 1);
    }
    return out as unknown as T;
  }
  return value;
}
