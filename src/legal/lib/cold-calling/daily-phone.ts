// Ported from the Legal app (family-law-floater/src/lib/cold-calling/daily-phone.ts). Re-run the port script to refresh.
// Daily outbound caller-ID selection. Pure so the "same number all day" and
// "least-recently-used" rules can be tested without a database.

export type CallerIdCandidate = {
  id: string;
  number: string;
  status: string;
  can_receive_return_calls?: boolean | null;
  verified_with_twilio?: boolean | null;
  last_assigned_at?: string | null;
  created_at: string;
};

export type ExistingAssignment = {
  id: string;
  outbound_caller_id_id: string | null;
  locked_at: string | null;
};

/**
 * Reuse today's assignment when one exists. Otherwise pick the admin's choice,
 * else the least-recently-assigned active, verified number (ties → oldest row).
 */
export function chooseCallerId(
  candidates: CallerIdCandidate[],
  adminSelectedId: string | null | undefined,
): CallerIdCandidate | null {
  const eligible = candidates.filter(
    (c) =>
      c.status === "active" &&
      c.verified_with_twilio !== false &&
      c.can_receive_return_calls !== false,
  );
  if (eligible.length === 0) return null;
  if (adminSelectedId) {
    const chosen = eligible.find((c) => c.id === adminSelectedId);
    if (chosen) return chosen;
  }
  return [...eligible].sort((a, b) => {
    const la = a.last_assigned_at ? Date.parse(a.last_assigned_at) : -Infinity;
    const lb = b.last_assigned_at ? Date.parse(b.last_assigned_at) : -Infinity;
    if (la !== lb) return la - lb;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  })[0]!;
}

/** Sydney work date — the app's operating day. */
export function sydneyWorkDate(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

/** A number used in an assignment must stay live for 30 days afterwards. */
export const CALLER_ID_RETENTION_DAYS = 30;

export function retentionEndsAt(lastAssignedAt: string | null | undefined): Date | null {
  if (!lastAssignedAt) return null;
  return new Date(Date.parse(lastAssignedAt) + CALLER_ID_RETENTION_DAYS * 86400000);
}
