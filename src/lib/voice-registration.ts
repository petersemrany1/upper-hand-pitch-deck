/** Retry the initial registration while the dialler is in use. No call is originated here. */
export function recoverVoiceRegistration(check: () => Promise<boolean>, visible: () => boolean,
  schedule = setTimeout, cancel = clearTimeout) {
  let stopped = false, running = false, failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (running || stopped || !visible()) return;
    cancel(timer);
    running = true;
    try {
      if (await check()) { failures = 0; return; }
    } catch { /* A failed registration can be retried without placing a call. */ }
    finally { running = false; }
    if (!stopped && failures < 3) timer = schedule(run, [5_000, 15_000, 45_000][failures++]);
  };
  return {
    wake() { failures = 0; void run(); },
    stop() { stopped = true; cancel(timer); },
  };
}
