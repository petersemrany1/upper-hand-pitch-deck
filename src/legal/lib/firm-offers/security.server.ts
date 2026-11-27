// Ported from the Legal app (family-law-floater/src/lib/firm-offers/security.server.ts). Re-run the port script to refresh.
import { createHash, createHmac } from "node:crypto";
export function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function privateToken(id: string, revision: number, key: string) {
  if (key.length < 32)
    throw new Error("Configure BOLD_OFFER_TOKEN_SECRET (at least 32 characters)");
  return createHmac("sha256", key).update(`${id}:${revision}`).digest("base64url");
}
export function assertRecipientAccess(
  expiresAt: string | null,
  revokedAt: string | null,
  now = Date.now(),
) {
  if (
    revokedAt ||
    !expiresAt ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    Date.parse(expiresAt) <= now
  )
    throw new Error("This private link is unavailable or expired");
}
