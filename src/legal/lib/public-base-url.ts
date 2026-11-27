// Ported from the Legal app (family-law-floater/src/lib/public-base-url.ts). Re-run the port script to refresh.
const CANONICAL_ORIGIN = "https://boldfamilylaw.com.au";

/** Twilio POST callbacks must not cross the retired domain's redirect. */
export function canonicalPublicBaseUrl(configured?: string): string {
  const value = configured?.trim().replace(/\/+$/, "");
  if (!value) return CANONICAL_ORIGIN;
  const url = new URL(value);
  if (url.hostname === "family-law-floater.lovable.app") return CANONICAL_ORIGIN;
  return value;
}
