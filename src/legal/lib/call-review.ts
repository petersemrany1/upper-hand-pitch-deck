// Ported from the Legal app (family-law-floater/src/lib/call-review.ts). Re-run the port script to refresh.
export type PreviousCall = {
  id: string;
  leadId: string;
  createdAt: string;
  direction: string | null;
  status: string | null;
  duration: number | null;
  callSid: string | null;
  hasRecording: boolean;
  transcript: string | null;
  summary: string | null;
  nextAction: string | null;
  outcome: string | null;
  noSaleReasons: string[];
  followUpDate: string | null;
  followUpTime: string | null;
};

export type CallReviewPage = {
  calls: PreviousCall[];
  notes: Array<{ leadId: string; body: string; previousEnquiry: boolean; kind?: "rep" | "legacy" }>;
  nextOffset: number | null;
};

/** Provider callbacks can create two rows for one dial. Keep the playable row's ID. */
export function mergePreviousCalls(calls: PreviousCall[]): PreviousCall[] {
  const merged = new Map<string, PreviousCall>();
  for (const call of calls) {
    const key = call.callSid ? `${call.leadId}:${call.callSid}` : call.id;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...call });
      continue;
    }
    const newest = call.createdAt > existing.createdAt ? call : existing;
    const older = newest === call ? existing : call;
    merged.set(key, {
      ...newest,
      id: existing.hasRecording ? existing.id : call.hasRecording ? call.id : newest.id,
      hasRecording: existing.hasRecording || call.hasRecording,
      duration: Math.max(existing.duration ?? 0, call.duration ?? 0) || null,
      transcript: newest.transcript || older.transcript,
      summary: newest.summary || older.summary,
      nextAction: newest.nextAction || older.nextAction,
      outcome: newest.outcome || older.outcome,
      noSaleReasons: newest.noSaleReasons.length ? newest.noSaleReasons : older.noSaleReasons,
      followUpDate: newest.followUpDate || older.followUpDate,
      followUpTime: newest.followUpTime || older.followUpTime,
    });
  }
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function initialPreviousCall(calls: PreviousCall[]): PreviousCall | undefined {
  return (
    calls.find((call) => call.summary || call.transcript) ??
    calls.find((call) => call.hasRecording) ??
    calls[0]
  );
}

export function callStatusLabel(value: string | null): string {
  if (!value) return "Call logged";
  const label = value.replace(/[_-]/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
