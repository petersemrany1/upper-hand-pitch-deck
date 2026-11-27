// Ported from the Legal app (family-law-floater/src/lib/handover-recipients.ts). Re-run the port script to refresh.
import { z } from "zod";

/** Accept pasted addresses, but never silently drop a mistyped recipient. */
export function parseHandoverCc(value: string | string[], to = ""): string[] {
  const addresses = (Array.isArray(value) ? value.join(";") : value)
    .split(/[,;\n\r]+/).map((email) => email.trim()).filter(Boolean);
  if (addresses.length > 20) throw new Error("Add no more than 20 CC email addresses.");
  for (const email of addresses) {
    if (!z.string().email().safeParse(email).success) {
      throw new Error(`Check this CC email address: ${email}`);
    }
  }
  return [...new Set(addresses.map((email) => email.toLowerCase()))]
    .filter((email) => email !== to.trim().toLowerCase());
}
