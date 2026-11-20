export type ReleaseNumber = {
  number: string; twilio_sid: string | null; status: string;
  retired_at: string | null; release_due_at: string | null; released_at: string | null;
};
export async function releaseRetiredNumbers(d: {
  enabled: boolean; numbers: ReleaseNumber[]; now: number;
  begin(n: ReleaseNumber): Promise<boolean>;
  release(n: ReleaseNumber): Promise<void>;
  finish(n: ReleaseNumber, error: string | null): Promise<void>;
}, dryRun: boolean) {
  const result = { enabled: d.enabled, due: 0, released: 0, errors: [] as string[] };
  if (!d.enabled) return result;
  const due = d.numbers.filter(n => n.status === 'retired' && !n.released_at && n.retired_at && n.release_due_at &&
    Date.parse(n.retired_at) + 60 * 86400_000 <= d.now && Date.parse(n.release_due_at) <= d.now);
  result.due = due.length;
  if (dryRun) return result;
  // Bound provider work per run. The next hourly execution resumes any remainder.
  for (const n of due.slice(0, 10)) {
    try {
      if (!await d.begin(n)) continue;
      await d.release(n);
      await d.finish(n, null);
      result.released++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Number release failed';
      result.errors.push(`${n.number}: ${message}`);
      await d.finish(n, message);
    }
  }
  return result;
}
