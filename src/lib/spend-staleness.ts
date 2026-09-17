// One shared rule for "is the ad spend feed dead?", used by both the Numbers
// page banner and the daily alert email so they can never disagree.
//
// STALE when either:
//   · the newest ad_spend_daily date is older than yesterday (Sydney), or
//   · the last spend push recorded an error.

import { sydneyTodayISO } from "@/lib/timezone";

export type SpendStaleness = {
  stale: boolean;
  /** Newest ad-day date we hold, YYYY-MM-DD, or null when the table is empty. */
  newestDate: string | null;
  /** Plain-English reason, or null when fresh. */
  reason: string | null;
};

function shiftDays(iso: string, days: number): string {
  const t = new Date(iso + "T00:00:00Z").getTime() + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function evaluateSpendStaleness(input: {
  newestDate: string | null;
  lastStatus?: string | null;
  lastMessage?: string | null;
  now?: Date;
}): SpendStaleness {
  const today = sydneyTodayISO(input.now ?? new Date());
  const yesterday = shiftDays(today, -1);
  const newestDate = input.newestDate ?? null;
  const errored = (input.lastStatus ?? "").toLowerCase() === "error";

  if (!newestDate) {
    return {
      stale: true,
      newestDate: null,
      reason: "There is no ad spend recorded at all, so the marketing figures cannot be worked out.",
    };
  }
  if (newestDate < yesterday) {
    return {
      stale: true,
      newestDate,
      reason: `The newest day of ad spend is ${newestDate}, which is older than yesterday (${yesterday}).`,
    };
  }
  if (errored) {
    return {
      stale: true,
      newestDate,
      reason: `The last ad spend update failed${input.lastMessage ? `: ${input.lastMessage}` : "."}`,
    };
  }
  return { stale: false, newestDate, reason: null };
}
