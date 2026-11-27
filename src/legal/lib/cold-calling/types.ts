// Shared vocabulary for Firm Cold Calling. Keep the disposition list EXACTLY as
// specified — the outcome buttons render these labels verbatim.

export const DISPOSITIONS = [
  { code: "no_answer", label: "NO ANSWER" },
  { code: "gatekeeper_try_again", label: "GATEKEEPER — TRY AGAIN" },
  { code: "dm_not_interested", label: "SPOKE TO DECISION MAKER — NOT INTERESTED" },
  { code: "follow_up", label: "FOLLOW UP" },
  { code: "interested", label: "INTERESTED" },
  { code: "meeting_booked", label: "CLOSER ZOOM SET" },
  { code: "bad_fit", label: "BAD FIT" },
  { code: "do_not_contact", label: "DO NOT CONTACT" },
] as const;

export type Disposition = (typeof DISPOSITIONS)[number]["code"];

const INBOUND_LABELS: Record<string, string> = {
  called_back: "Called back",
  texted_back: "Texted back",
};

export function dispositionLabel(code: string | null | undefined): string {
  return (
    DISPOSITIONS.find((d) => d.code === code)?.label ??
    (code ? INBOUND_LABELS[code] : undefined) ??
    code ??
    "—"
  );
}

/** Dispositions where a decision-maker was actually reached. */
export const DECISION_MAKER_DISPOSITIONS: readonly Disposition[] = [
  "dm_not_interested",
  "follow_up",
  "interested",
  "meeting_booked",
  "bad_fit",
];

/** Dispositions that count as "unsuccessful" for the retry ladder. */
export const UNSUCCESSFUL_DISPOSITIONS: readonly Disposition[] = ["no_answer"];

export const PROSPECT_STATUSES = [
  { value: "new", label: "New" },
  { value: "no_answer", label: "No answer" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "emailed", label: "Emailed" },
  { value: "texted", label: "Texted" },
  { value: "follow_up", label: "Follow up" },
  { value: "warm", label: "Warm" },
  { value: "meeting_booked", label: "Closer Zoom set" },
  { value: "not_interested", label: "Not interested" },
  { value: "bad_fit", label: "Bad fit" },
  { value: "do_not_contact", label: "Do not contact" },
  { value: "exhausted", label: "Exhausted — review required" },
  { value: "applied", label: "Applied via Meta" },
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]["value"];

export function prospectStatusLabel(value: string | null | undefined): string {
  return PROSPECT_STATUSES.find((s) => s.value === value)?.label ?? value ?? "—";
}

/** Statuses a caller may still dial. */
export const CALLABLE_STATUSES: readonly ProspectStatus[] = [
  "new",
  "no_answer",
  "gatekeeper",
  "emailed",
  "texted",
  "follow_up",
  "warm",
];

export const PRIORITY_TIERS = ["A", "B", "C"] as const;
export type PriorityTier = (typeof PRIORITY_TIERS)[number];

export const QUEUE_ITEM_STATUSES = [
  "pending",
  "in_progress",
  "done",
  "skipped",
  "removed",
  "cancelled",
] as const;
export type QueueItemStatus = (typeof QUEUE_ITEM_STATUSES)[number];

export const QUEUE_STATUSES = ["open", "active", "paused", "completed"] as const;

/** Twilio call statuses in the order they can legitimately advance. */
export const TELEPHONY_STATUS_RANK: Record<string, number> = {
  queued: 0,
  initiated: 1,
  ringing: 2,
  "in-progress": 3,
  answered: 3,
  completed: 4,
  busy: 4,
  "no-answer": 4,
  failed: 4,
  canceled: 4,
};

export const TERMINAL_TELEPHONY_STATUSES = new Set([
  "completed",
  "busy",
  "no-answer",
  "failed",
  "canceled",
]);

export function isTerminalTelephonyStatus(status: string | null | undefined): boolean {
  return !!status && TERMINAL_TELEPHONY_STATUSES.has(status);
}

/** A call counts as connected when Twilio reports the far end answered. */
export const CONNECTED_TELEPHONY_STATUSES = new Set(["in-progress", "answered", "completed"]);

export type DealStatus = "open" | "closed_won" | "closed_lost";

/** Setter pay: the bonus schedule Peter uses. Reporting only — nothing is paid from here. */
export const SETTER_PAY = {
  hourlyRateAud: 25,
  meetingBonusAud: 1000,
  closedDealBonusAud: 1000,
} as const;
