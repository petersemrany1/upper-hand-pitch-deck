// Ported from the Legal app (family-law-floater/src/lib/cold-calling/queues.ts). Re-run the port script to refresh.
// Dynamic queue views and the default prospect ordering. Pure functions over a
// structural firm shape so both the browser and tests can use them.
import { isCallback } from "./callbacks";
import { isNationalRateNumber } from "./normalise";
import { CALLABLE_STATUSES } from "./types";

export type ProspectFirmLike = {
  id: string;
  fit_score: number | null;
  priority_tier: string | null;
  prospect_status: string;
  call_attempt_count: number;
  unsuccessful_attempt_count: number;
  last_call_at: string | null;
  last_disposition: string | null;
  next_follow_up_at: string | null;
  do_not_contact: boolean;
  phone_e164: string | null;
  imported_at: string;
  suppressed?: boolean;
};

/** Test firms (reserved .test domains or "Peter Test …" names) are only ever shown to admins. */
export function isTestFirm(firm: {
  firm_name?: string | null;
  root_domain?: string | null;
}): boolean {
  return /\.test$/i.test(firm.root_domain ?? "") || /^peter test\b/i.test(firm.firm_name ?? "");
}

export const QUEUE_VIEWS = [
  {
    id: "callback_today",
    label: "Callback Today",
    description: "Follow-ups due today or overdue.",
  },
  {
    id: "new_best",
    label: "A — New Best Prospects",
    description: "Fit score 80+, never called, not queued elsewhere.",
  },
  {
    id: "gatekeeper",
    label: "Gatekeeper",
    description: "Last outcome was GATEKEEPER — TRY AGAIN and the follow-up is due.",
  },
  {
    id: "warm",
    label: "Warm",
    description: "Interested decision-makers without a meeting booked yet.",
  },
  { id: "attempt_2", label: "Attempt 2", description: "Exactly one unsuccessful attempt so far." },
  { id: "attempt_3_plus", label: "Attempt 3+", description: "Two or more unsuccessful attempts." },
] as const;

export type QueueViewId = (typeof QUEUE_VIEWS)[number]["id"];

/** Can this prospect be dialled at all (ignoring time windows)? */
export function isEligibleToCall(firm: ProspectFirmLike): {
  eligible: boolean;
  reason: string | null;
} {
  if (firm.do_not_contact) return { eligible: false, reason: "Do Not Contact" };
  if (firm.suppressed)
    return { eligible: false, reason: "Number is on the global suppression list" };
  if (!firm.phone_e164) return { eligible: false, reason: "No valid public business number" };
  if (isNationalRateNumber(firm.phone_e164))
    return {
      eligible: false,
      reason: "1300/1800 number — the dialler can't ring these; add the firm's landline",
    };
  if (firm.prospect_status === "applied")
    return {
      eligible: false,
      reason: "Applied through Meta ads — this firm is in the Firms pipeline, not the cold list",
    };
  if (!(CALLABLE_STATUSES as readonly string[]).includes(firm.prospect_status)) {
    return { eligible: false, reason: `Status is ${firm.prospect_status.replace(/_/g, " ")}` };
  }
  return { eligible: true, reason: null };
}

export function isFollowUpDue(firm: ProspectFirmLike, now: Date): boolean {
  if (!firm.next_follow_up_at) return false;
  return Date.parse(firm.next_follow_up_at) <= now.getTime();
}

export function firmMatchesView(
  firm: ProspectFirmLike,
  view: QueueViewId,
  now: Date,
  activelyQueuedFirmIds: ReadonlySet<string>,
): boolean {
  if (!isEligibleToCall(firm).eligible) return false;
  const due = isFollowUpDue(firm, now);
  const retryDue = firm.next_follow_up_at === null || due;
  switch (view) {
    case "new_best":
      return (
        (firm.fit_score ?? 0) >= 80 &&
        firm.call_attempt_count === 0 &&
        firm.prospect_status === "new" &&
        !activelyQueuedFirmIds.has(firm.id)
      );
    case "callback_today":
      return due && firm.prospect_status !== "meeting_booked";
    case "attempt_2":
      return (
        firm.prospect_status === "no_answer" && firm.unsuccessful_attempt_count === 1 && retryDue
      );
    case "attempt_3_plus":
      return (
        firm.prospect_status === "no_answer" && firm.unsuccessful_attempt_count >= 2 && retryDue
      );
    case "gatekeeper":
      return (
        firm.last_disposition === "gatekeeper_try_again" &&
        firm.prospect_status === "gatekeeper" &&
        due
      );
    case "warm":
      return firm.prospect_status === "warm";
    default:
      return false;
  }
}

/**
 * Default ordering: firms that rang/texted back (newest first) → due follow-ups
 * (soonest first) → Tier A → highest fit score → oldest uncalled prospect.
 */
export function compareProspects(a: ProspectFirmLike, b: ProspectFirmLike, now: Date): number {
  const dueA = isFollowUpDue(a, now);
  const dueB = isFollowUpDue(b, now);
  if (dueA !== dueB) return dueA ? -1 : 1;
  // A firm that rang or texted back goes straight to the top, most recent first.
  const cbA = dueA && isCallback(a);
  const cbB = dueB && isCallback(b);
  if (cbA !== cbB) return cbA ? -1 : 1;
  if (cbA && cbB) return Date.parse(b.next_follow_up_at!) - Date.parse(a.next_follow_up_at!);
  if (dueA && dueB) {
    const d = Date.parse(a.next_follow_up_at!) - Date.parse(b.next_follow_up_at!);
    if (d !== 0) return d;
  }
  const tierA = a.priority_tier === "A" ? 0 : 1;
  const tierB = b.priority_tier === "A" ? 0 : 1;
  if (tierA !== tierB) return tierA - tierB;
  const scoreDiff = (b.fit_score ?? -1) - (a.fit_score ?? -1);
  if (scoreDiff !== 0) return scoreDiff;
  const uncalledA = a.call_attempt_count === 0 ? 0 : 1;
  const uncalledB = b.call_attempt_count === 0 ? 0 : 1;
  if (uncalledA !== uncalledB) return uncalledA - uncalledB;
  return Date.parse(a.imported_at) - Date.parse(b.imported_at);
}

/** Queue priority for a queue item: callbacks first, then tier, then score. */
export function queuePriority(firm: ProspectFirmLike, now: Date): number {
  if (isFollowUpDue(firm, now)) return 0;
  if (firm.priority_tier === "A") return 1;
  if (firm.priority_tier === "B") return 2;
  return 3;
}
