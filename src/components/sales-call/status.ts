// Lead status normalisation shared by the dialler and its queue rules.
// Raw `meta_leads.status` values are free-form ("Callback Scheduled",
// "no_answer", "contacted", "" …); everything funnels into one of these keys.

export type StatusKey =
  | "new"
  | "no_answer"
  | "callback_scheduled"
  | "had_convo_chase_up"
  | "had_convo_no_sale"
  | "not_interested"
  | "booked_no_deposit"
  | "booked_deposit_paid"
  | "dropped";

export type StatusLead = {
  status: string | null;
  booking_date?: string | null;
  callback_scheduled_at?: string | null;
};

export function normaliseStatus(s: string | null | undefined, l?: StatusLead): StatusKey {
  const raw = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (raw.includes("deposit_paid")) return "booked_deposit_paid";
  if (raw.includes("booked")) return "booked_no_deposit";
  if (raw.includes("callback")) return "callback_scheduled";
  if (raw.includes("no_sale") || raw.includes("did_not_get_the_sale") || raw.includes("did_not_sale")) return "had_convo_no_sale";
  if (raw.includes("chase") || raw.includes("had_convo")) return "had_convo_chase_up";
  if (raw.includes("not_interested") || raw === "ineligible") return "not_interested";
  if (raw.includes("no_answer") || raw === "contacted") return "no_answer";
  if (raw === "dropped") return "dropped";
  if (l?.callback_scheduled_at) return "callback_scheduled";
  return "new";
}

/** Raw statuses the dialler never calls, regardless of how they normalise. */
export function isRetiredRawStatus(s: string | null | undefined): boolean {
  const raw = (s ?? "").toLowerCase();
  return raw === "cancelled" || raw === "no_show" || raw === "dropped";
}

/**
 * Lead classes never shown in a lead list: people who were booked in once
 * (a past appointment exists). A re-enquiry from someone we never got over
 * the line ("returning") stays in — another crack. (Peter's rule, 2026-09-08.)
 */
export const HIDDEN_LEAD_CLASSES: ReadonlySet<string> = new Set(["post_consult"]);

export function isReturningLead(leadClass: string | null | undefined): boolean {
  return HIDDEN_LEAD_CLASSES.has((leadClass ?? "").toLowerCase());
}

/**
 * Leads the rep should dial by hand, not on the 3-2-1 auto-dial: anyone
 * we've already spoken to (chase-up) or a scheduled callback. The rep needs
 * a moment to read the journey/notes first. (Peter's rule, 2026-09-11.)
 */
const MANUAL_DIAL_STATUSES: ReadonlySet<StatusKey> = new Set<StatusKey>([
  "callback_scheduled",
  "had_convo_chase_up",
]);

export function requiresManualDial(l: StatusLead): boolean {
  return MANUAL_DIAL_STATUSES.has(normaliseStatus(l.status, l));
}
