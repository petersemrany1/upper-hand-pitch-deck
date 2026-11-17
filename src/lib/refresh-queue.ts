/** Coalesce refresh bursts while a read is running. Changes arriving during the
 * read invalidate its result and produce one fresh read as soon as it finishes. */
export function createRefreshQueue(read: (isCurrent: () => boolean) => Promise<void>) {
  let revision = 0;
  let running = false;
  let pending = false;
  let stopped = false;
  const drain = async () => {
    running = true;
    try {
      while (pending && !stopped) {
        pending = false;
        const started = revision;
        await read(() => !stopped && started === revision);
      }
    } finally {
      running = false;
    }
  };
  return {
    // The caller already applied a row event. Only a snapshot that was in
    // flight can now be stale; idle events need no full table refetch.
    invalidate() {
      if (!stopped && running) { revision += 1; pending = true; }
    },
    refresh() {
      if (stopped) return;
      revision += 1;
      pending = true;
      if (!running) void drain();
    },
    stop() { stopped = true; pending = false; },
  };
}
