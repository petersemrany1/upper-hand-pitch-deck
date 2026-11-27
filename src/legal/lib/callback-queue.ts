// Ported from the Legal app (family-law-floater/src/lib/callback-queue.ts). Re-run the port script to refresh.
/** Preserve the current position even when a callback was already visited. */
export function insertCallbackNext(queue: string[], currentIndex: number, leadId: string) {
  return [
    ...queue.slice(0, currentIndex + 1),
    leadId,
    ...queue.slice(currentIndex + 1).filter((id) => id !== leadId),
  ];
}
