// Abandoned-call rule (pure, unit tested).
//
// A lead that is still "new" but has been dialled, where every dial was short
// (nobody picked up, or it went to voicemail and was hung up) and none is
// recent, is really a no-answer that the rep never logged. Marking it keeps
// the "new" list honest without touching anything a rep might still be on.

export type SweepCall = {
  lead_id: string | null;
  called_at: string | null;
  duration: number | null;
  duration_seconds?: number | null;
};

export type SweepLead = {
  id: string;
  status: string | null;
  callback_scheduled_at?: string | null;
  booking_date?: string | null;
};

/** Calls at or under this many seconds count as "nobody answered". */
export const SHORT_CALL_SECONDS = 20;
/** Leave calls this recent alone — the rep may still be logging the outcome. */
export const SETTLE_MS = 2 * 60 * 60 * 1000;

const isStillNew = (s: string | null | undefined) => {
  const raw = (s ?? "").trim().toLowerCase();
  return raw === "" || raw === "new";
};

export function abandonedLeadIds(leads: SweepLead[], calls: SweepCall[], now: Date): string[] {
  const byLead = new Map<string, SweepCall[]>();
  for (const c of calls) {
    if (!c.lead_id || !c.called_at) continue;
    const list = byLead.get(c.lead_id) ?? [];
    list.push(c);
    byLead.set(c.lead_id, list);
  }
  const cutoff = now.getTime() - SETTLE_MS;
  const out: string[] = [];
  for (const l of leads) {
    if (!isStillNew(l.status)) continue;
    if (l.callback_scheduled_at || l.booking_date) continue;
    const list = byLead.get(l.id);
    if (!list || list.length === 0) continue;
    const allShort = list.every((c) => (c.duration ?? c.duration_seconds ?? 0) <= SHORT_CALL_SECONDS);
    const allSettled = list.every((c) => new Date(c.called_at as string).getTime() <= cutoff);
    if (allShort && allSettled) out.push(l.id);
  }
  return out;
}
