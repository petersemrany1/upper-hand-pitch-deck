export type SessionConnection = "connected" | "reconnecting" | "needs-sign-in";

type Timer = ReturnType<typeof setTimeout>;
type RecoveryOptions<T> = {
  check: () => Promise<T>;
  accept: (value: T) => void;
  status: (status: SessionConnection) => void;
  stillCurrent: () => boolean;
  intervalMs?: number;
  schedule?: (callback: () => void, delay: number) => Timer;
  cancel?: (timer: Timer) => void;
};

function needsSignIn(error: unknown) {
  const e = error as { status?: number; statusCode?: number; message?: string } | null;
  return e?.status === 401 || e?.status === 403 || e?.statusCode === 401 || e?.statusCode === 403
    || /unauthorized|invalid token|session.not.found|jwt expired/i.test(e?.message ?? "");
}

/** Only session lookup/presence checks belong here. Never retry a call, payment,
 * booking, session start or session end: their responses may be lost after saving. */
export function recoverSessionCheck<T>(options: RecoveryOptions<T>) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let stopped = false;
  let failures = 0;
  let next: Timer | undefined;
  let slow: Timer | undefined;
  const current = () => !stopped && options.stillCurrent();
  const run = async () => {
    if (!current()) return;
    // A slow request stays single-flight; a warning never starts another request.
    slow = schedule(() => { if (current()) options.status("reconnecting"); }, 8_000);
    try {
      const value = await options.check();
      if (!current()) return;
      options.accept(value);
      options.status("connected");
      failures = 0;
      if (options.intervalMs && current()) next = schedule(() => void run(), options.intervalMs);
    } catch (error) {
      if (!current()) return;
      if (needsSignIn(error)) {
        options.status("needs-sign-in");
        return;
      }
      options.status("reconnecting");
      const delay = Math.min(5_000 * 2 ** Math.min(failures++, 3), 30_000);
      next = schedule(() => void run(), delay);
    } finally {
      if (slow !== undefined) cancel(slow);
    }
  };
  void run();
  return () => {
    stopped = true;
    if (next !== undefined) cancel(next);
    if (slow !== undefined) cancel(slow);
  };
}
