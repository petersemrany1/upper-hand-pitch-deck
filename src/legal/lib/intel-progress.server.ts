// Ported from the Legal app (family-law-floater/src/lib/intel-progress.server.ts). Re-run the port script to refresh.
import { createHash } from "node:crypto";

/** Drafts stay internal; only independently reviewed output can reach the handover. */
export type IntelProgress = {
  draft?: string;
  factualDraft?: string;
  reviews: Record<string, string>;
  splitReviews?: string[];
};

export function intelReviewKey(batch: string): string {
  return createHash("sha256").update(batch).digest("hex");
}

export function cachedIntelProgress(value: unknown, fingerprint: string): IntelProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { reviews: {} };
  const saved = value as Record<string, unknown>;
  if (saved["fingerprint"] !== fingerprint || saved["version"] !== 1) return { reviews: {} };
  const reviews = saved["reviews"];
  return {
    ...(typeof saved["draft"] === "string" ? { draft: saved["draft"] } : {}),
    ...(typeof saved["factualDraft"] === "string" ? { factualDraft: saved["factualDraft"] } : {}),
    ...(Array.isArray(saved["splitReviews"])
      ? {
          splitReviews: saved["splitReviews"].filter(
            (key): key is string => typeof key === "string" && /^[a-f0-9]{64}$/.test(key),
          ),
        }
      : {}),
    reviews: Object.fromEntries(
      reviews && typeof reviews === "object" && !Array.isArray(reviews)
        ? Object.entries(reviews).filter(
            ([key, review]) => /^[a-f0-9]{64}$/.test(key) && typeof review === "string",
          )
        : [],
    ),
  };
}
