// Ported from the Legal app (family-law-floater/src/lib/handover-preparation.ts). Re-run the port script to refresh.
import { readHandoverIntel, type HandoverIntelResult } from "./handover-stream";

function abortable<T>(run: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    run.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** Resume saved work automatically; only a complete, verified result becomes sendable. */
export async function prepareHandoverIntel(
  request: (signal: AbortSignal) => Promise<Response>,
  options: {
    signal: AbortSignal;
    onProgress: (stage: string) => void;
    maxWaitMs?: number;
    stepWaitMs?: number;
    retryDelayMs?: number;
  },
): Promise<HandoverIntelResult> {
  const {
    signal,
    onProgress,
    maxWaitMs = 20 * 60_000,
    stepWaitMs = 180_000,
    retryDelayMs = 1_000,
  } = options;
  const deadline = Date.now() + maxWaitMs;
  let failures = 0;
  onProgress("Preparing the call transcript and summary…");
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    const controller = new AbortController();
    const stepSignal = AbortSignal.any([signal, controller.signal]);
    const timer = setTimeout(
      () => controller.abort(new DOMException("Summary step timed out", "TimeoutError")),
      Math.min(stepWaitMs, deadline - Date.now()),
    );
    let result: HandoverIntelResult;
    try {
      result = await abortable(
        request(stepSignal).then((response) => readHandoverIntel(response, stepWaitMs)),
        stepSignal,
      );
    } catch {
      signal.throwIfAborted();
      result = {
        notes: null,
        retryable: true,
        error: "The summary connection was interrupted. Please retry; completed work is saved.",
      };
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
    signal.throwIfAborted();
    if (result.notes?.trim()) return result;
    let delay = 0;
    if (result.pending) {
      failures = 0;
      onProgress(result.stage ?? "Preparing the handover summary…");
      delay = Math.min(Math.max(result.retryAfterMs ?? 0, 0), 5_000);
    } else if (result.retryable && failures < 3) {
      failures++;
      onProgress("Reconnecting and continuing the saved summary…");
      delay = retryDelayMs * failures;
    } else {
      return result;
    }
    if (delay) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await abortable(
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, Math.min(delay, Math.max(0, deadline - Date.now())));
          }),
          signal,
        );
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return {
    notes: null,
    error:
      "The handover is taking longer than expected. Retry to continue from the saved progress; your booking and payment are saved.",
  };
}
