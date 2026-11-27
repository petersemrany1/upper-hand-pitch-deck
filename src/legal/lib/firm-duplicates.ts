// Ported from the Legal app (family-law-floater/src/lib/firm-duplicates.ts). Re-run the port script to refresh.
import type { FirmApplication } from "./firm-applications";
import { normaliseAuPhone } from "./cold-calling/normalise";

export type FirmDuplicateMatch = {
  application: FirmApplication;
  matchedOn: ("email" | "phone")[];
};

function emailKey(value: string | null): string | null {
  const email = value?.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function phoneKey(value: string | null): string | null {
  if (!value) return null;
  const phone = value.trim().replace(/^0011|^00/, "+");
  const au = normaliseAuPhone(phone);
  if (au) return au.e164;
  // Keep international country codes intact; matching just a suffix can join
  // unrelated contacts. Invalid/partial numbers must not create duplicates.
  const international = phone.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(international) && !international.startsWith("+61")
    ? international
    : null;
}

/** Direct contact matches across all stages and dates, before any view filter. */
export function findFirmDuplicates(
  applications: FirmApplication[],
): Map<string, FirmDuplicateMatch[]> {
  const emails = new Map<string, FirmApplication[]>();
  const phones = new Map<string, FirmApplication[]>();
  const keys = applications.map((application) => {
    const email = emailKey(application.email);
    const phone = phoneKey(application.phone);
    for (const [index, key] of [
      [emails, email],
      [phones, phone],
    ] as const) {
      if (key) index.set(key, [...(index.get(key) ?? []), application]);
    }
    return { application, email, phone };
  });
  const result = new Map<string, FirmDuplicateMatch[]>();
  for (const { application, email, phone } of keys) {
    const matches = new Map<string, FirmDuplicateMatch>();
    for (const [field, rows] of [
      ["email", email ? emails.get(email) : []],
      ["phone", phone ? phones.get(phone) : []],
    ] as const) {
      for (const other of rows ?? []) {
        if (other.id === application.id) continue;
        const match = matches.get(other.id) ?? { application: other, matchedOn: [] };
        match.matchedOn.push(field);
        matches.set(other.id, match);
      }
    }
    result.set(
      application.id,
      [...matches.values()].sort(
        (a, b) =>
          b.application.created_at.localeCompare(a.application.created_at) ||
          a.application.id.localeCompare(b.application.id),
      ),
    );
  }
  return result;
}
