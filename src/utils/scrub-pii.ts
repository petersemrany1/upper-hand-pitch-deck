/**
 * Shared PII scrubbing + dedup helpers for the error logging system.
 *
 * Rules:
 *  - Strings: mask email addresses and phone-number-ish sequences.
 *  - Object keys: any key that names patient info (name / email / phone /
 *    address / DOB / etc.) has its value replaced with "[REDACTED]".
 *  - Recurses into nested objects and arrays, with a depth cap so we can't
 *    blow the stack on weird payloads.
 *  - Circular refs are cut off with "[Circular]".
 */

const PII_KEY_RE =
  /(^|_)(patient|first|last|full|middle|given|family|maiden|display|user|contact)?[_-]?(name|email|e_mail|mail|phone|mobile|cell|tel|number|address|street|suburb|postcode|zip|city|dob|birth|birthday|ssn|medicare|passport|licen[cs]e|ip|password|secret|token|auth|api[_-]?key|bearer|credit|card|cvv|cc)($|_)/i;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Any 8+ digit sequence (with optional separators / country code) — catches
// AU mobiles (04xx xxx xxx), landlines, and international formats without
// destroying legitimate short numbers like durations or HTTP status codes.
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

function scrubString(input: string): string {
  if (!input) return input;
  return input.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED);
}

export function scrubPii<T>(value: T, depth = 0, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value) as unknown as T;
  if (typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[MaxDepth]" as unknown as T;
  const obj = value as unknown as object;
  if (seen.has(obj)) return "[Circular]" as unknown as T;
  seen.add(obj);

  if (Array.isArray(value)) {
    return value.map((v) => scrubPii(v, depth + 1, seen)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEY_RE.test(k)) {
      out[k] = REDACTED;
      continue;
    }
    out[k] = scrubPii(v, depth + 1, seen);
  }
  return out as unknown as T;
}

export function scrubMessage(msg: string): string {
  return scrubString(msg ?? "");
}

/**
 * In-memory dedupe. Returns true when the same fingerprint has been seen
 * within `windowMs`. The store is per-process (per-tab on the client, per
 * worker on the server) which is exactly the scope we want to suppress
 * spam without hiding cross-user issues.
 */
const DEFAULT_WINDOW_MS = 60_000;
const dedupeStore = new Map<string, number>();

function fingerprint(functionName: string, errorMessage: string): string {
  // Collapse dynamic tail (ids, timestamps, digits) so the same error with
  // different id suffixes still dedupes.
  const normalized = (errorMessage ?? "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b\d{4,}\b/g, "<num>")
    .slice(0, 200);
  return `${functionName}::${normalized}`;
}

export function shouldSuppressDuplicate(
  functionName: string,
  errorMessage: string,
  windowMs: number = DEFAULT_WINDOW_MS,
): boolean {
  const key = fingerprint(functionName, errorMessage);
  const now = Date.now();
  const last = dedupeStore.get(key);
  if (last !== undefined && now - last < windowMs) return true;
  dedupeStore.set(key, now);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (dedupeStore.size > 500) {
    for (const [k, ts] of dedupeStore) {
      if (now - ts > windowMs * 4) dedupeStore.delete(k);
    }
  }
  return false;
}
