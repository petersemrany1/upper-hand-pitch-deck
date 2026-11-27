// Ported from the Legal app (family-law-floater/src/lib/cold-calling/applicants.ts). Re-run the port script to refresh.
// A firm that applies through the Meta ads pipeline (firm_applications) must not
// be cold called. Pure matching helpers shared by the webhook, the import and
// the browser; no I/O here.
import { normaliseDomain, phoneTail } from "./normalise";

/** Prospect status for a firm that has applied through Meta ads. Never callable. */
export const APPLIED_STATUS = "applied";

/** Statuses a Meta application never overrides. */
const FROZEN_STATUSES: ReadonlySet<string> = new Set([
  APPLIED_STATUS,
  "meeting_booked",
  "do_not_contact",
]);

export type ApplicationLike = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  firm_name: string | null;
};

export type ProspectMatchTarget = {
  id: string;
  firm_name: string;
  phone_e164: string | null;
  root_domain: string | null;
  prospect_status: string;
  do_not_contact: boolean;
};

export type ApplicationKeys = {
  phoneTail: string | null;
  domain: string | null;
  nameKey: string | null;
  /** First distinctive word of the firm name, for a cheap database prefilter. */
  nameToken: string | null;
};

/** Personal mailboxes say nothing about the firm. */
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.com.au",
  "hotmail.com",
  "hotmail.com.au",
  "live.com",
  "live.com.au",
  "msn.com",
  "yahoo.com",
  "yahoo.com.au",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "bigpond.com",
  "bigpond.net.au",
  "optusnet.com.au",
  "iinet.net.au",
  "tpg.com.au",
  "internode.on.net",
  "westnet.com.au",
  "dodo.com.au",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "fastmail.com",
  "y7mail.com",
  "exemail.com.au",
  "adam.com.au",
]);

const LEGAL_SUFFIXES =
  /\b(pty\.?\s*ltd\.?|pty\.?\s*limited|proprietary\s+limited|limited|ltd\.?|inc\.?|llp|llc|the)\b/g;
const NAME_STOPWORDS = new Set([
  "the",
  "law",
  "legal",
  "lawyers",
  "solicitors",
  "family",
  "and",
  "of",
  "co",
  "group",
  "firm",
  "partners",
  "associates",
]);

/** "Smith & Co. Family Lawyers Pty Ltd" → "smithcofamilylawyers". Null when too short to trust. */
export function normaliseFirmName(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/\band\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
  return key.length >= 5 ? key : null;
}

/** First word of the name that is not a generic law-firm word, at least three letters. */
export function firmNameToken(name: string | null | undefined): string | null {
  if (!name) return null;
  const words = name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !NAME_STOPWORDS.has(w));
  return words[0] ?? null;
}

export function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = normaliseDomain(email.slice(at + 1));
  if (!domain || FREE_MAIL_DOMAINS.has(domain)) return null;
  return domain;
}

export function applicationKeys(
  app: Pick<ApplicationLike, "phone" | "email" | "firm_name">,
): ApplicationKeys {
  const tail = phoneTail(app.phone);
  return {
    phoneTail: tail.length === 9 ? tail : null,
    domain: emailDomain(app.email),
    nameKey: normaliseFirmName(app.firm_name),
    nameToken: firmNameToken(app.firm_name),
  };
}

export function hasAnyKey(keys: ApplicationKeys): boolean {
  return !!(keys.phoneTail || keys.domain || keys.nameKey);
}

/**
 * Why a prospect matches an application, or null. Phone and email domain are
 * exact; the firm name must match after normalisation.
 */
export function matchReason(firm: ProspectMatchTarget, keys: ApplicationKeys): string | null {
  if (keys.phoneTail && firm.phone_e164 && phoneTail(firm.phone_e164) === keys.phoneTail)
    return "phone number";
  if (keys.domain && firm.root_domain && firm.root_domain === keys.domain) return "email domain";
  if (keys.nameKey && normaliseFirmName(firm.firm_name) === keys.nameKey) return "firm name";
  return null;
}

/** Should this prospect be withdrawn when it matches? Frozen statuses and Do Not Contact stay as they are. */
export function canWithdraw(
  firm: Pick<ProspectMatchTarget, "prospect_status" | "do_not_contact">,
): boolean {
  return !firm.do_not_contact && !FROZEN_STATUSES.has(firm.prospect_status);
}

export function applicantName(app: Pick<ApplicationLike, "first_name" | "last_name">): string {
  return [app.first_name, app.last_name].filter(Boolean).join(" ").trim();
}

/** The patch that takes a prospect out of the calling list. */
export function withdrawPatch(
  app: ApplicationLike,
  reason: string,
  now: Date,
): {
  prospect_status: string;
  next_follow_up_at: null;
  exclusion_reason: string;
} {
  const who = [applicantName(app), app.firm_name].filter(Boolean).join(", ");
  const day = now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
  return {
    prospect_status: APPLIED_STATUS,
    next_follow_up_at: null,
    exclusion_reason: `Applied through Meta ads on ${day}${who ? ` (${who})` : ""} — matched on ${reason}`,
  };
}

/** Match a set of prospects against a set of applications. Each prospect is withdrawn at most once. */
export function planWithdrawals(
  firms: readonly ProspectMatchTarget[],
  apps: readonly ApplicationLike[],
  now: Date,
): Array<{
  firm: ProspectMatchTarget;
  app: ApplicationLike;
  reason: string;
  patch: ReturnType<typeof withdrawPatch>;
}> {
  const keyed = apps
    .map((app) => ({ app, keys: applicationKeys(app) }))
    .filter((a) => hasAnyKey(a.keys));
  const out: Array<{
    firm: ProspectMatchTarget;
    app: ApplicationLike;
    reason: string;
    patch: ReturnType<typeof withdrawPatch>;
  }> = [];
  for (const firm of firms) {
    if (!canWithdraw(firm)) continue;
    for (const { app, keys } of keyed) {
      const reason = matchReason(firm, keys);
      if (!reason) continue;
      out.push({ firm, app, reason, patch: withdrawPatch(app, reason, now) });
      break;
    }
  }
  return out;
}
