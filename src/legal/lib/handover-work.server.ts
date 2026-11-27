// Ported from the Legal app (family-law-floater/src/lib/handover-work.server.ts). Re-run the port script to refresh.
/** Yield between saved units of work so no request has to finish the whole call. */
export class HandoverContinuation extends Error {
  constructor(
    public readonly stage: string,
    public readonly retryAfterMs = 0,
  ) {
    super(stage);
  }
}

export type HandoverWork = { before: (stage: string) => void };

export function handoverWork(): HandoverWork {
  let used = false;
  return {
    before(stage) {
      if (used) throw new HandoverContinuation(stage);
      used = true;
    },
  };
}

export function retryableIntelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const detail = error as { name?: string; message?: string; cause?: unknown };
  if (detail.cause && retryableIntelError(detail.cause)) return true;
  return (
    ["TimeoutError", "AbortError"].includes(detail.name ?? "") ||
    /timed? out|took too long|fetch failed|failed to fetch|network|connection|\b(408|429|5\d\d)\b/i.test(
      detail.message ?? "",
    )
  );
}
