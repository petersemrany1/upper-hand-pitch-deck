// Ported from the Legal app (family-law-floater/src/lib/intel-cache.server.ts). Re-run the port script to refresh.
import { createHash } from "node:crypto";
import type { IntelSource } from "./client-intel-evidence";

export function intelFingerprint(name: string, sources: IntelSource[], prompts: string[]): string {
  return createHash("sha256")
    .update(JSON.stringify({ version: 10, name, sources, prompts }))
    .digest("hex");
}

export function cachedIntel(value: unknown, fingerprint: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const cache = value as Record<string, unknown>;
  return cache["fingerprint"] === fingerprint &&
    typeof cache["notes"] === "string" &&
    cache["notes"].trim()
    ? cache["notes"]
    : null;
}

/** Closing/reopening a dialog shares existing work instead of starting another model run. */
export function singleFlight<T>() {
  const pending = new Map<string, Promise<T>>();
  return (key: string, run: () => Promise<T>): Promise<T> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const result = Promise.resolve()
      .then(run)
      .finally(() => {
        if (pending.get(key) === result) pending.delete(key);
      });
    pending.set(key, result);
    return result;
  };
}
