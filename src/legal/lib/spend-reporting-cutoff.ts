// Ported from the Legal app (family-law-floater/src/lib/spend-reporting-cutoff.ts). Re-run the port script to refresh.
import { addDays } from "./reporting-period";
/** Before the morning import, show a complete report through yesterday rather
 * than pairing today's new enquiries with yesterday's spend or blanking history. */
export function spendReportingCutoff(
  requestedEnd: string,
  today: string,
  days: Set<string>,
  syncedAt: string | null,
  now = Date.now(),
) {
  const yesterday = addDays(today, -1);
  return requestedEnd === today &&
    !days.has(today) &&
    days.has(yesterday) &&
    syncedAt &&
    now - Date.parse(syncedAt) < 26 * 3600000
    ? yesterday
    : requestedEnd;
}
