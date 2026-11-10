/** Share reads without allowing a pre-booking response to restore old credits. */
export function createCapacityCache(read: () => Promise<Record<string, number>>) {
  let cached: { at: number; value: Record<string, number> } | null = null;
  let inflight: Promise<Record<string, number>> | null = null;
  let revision = 0;
  const invalidate = () => { cached = null; inflight = null; revision += 1; };
  const fetch = (options: { fresh?: boolean } = {}): Promise<Record<string, number>> => {
    if (options.fresh) invalidate();
    if (cached && Date.now() - cached.at < 30_000) return Promise.resolve(cached.value);
    if (inflight) return inflight;
    const started = revision;
    const request: Promise<Record<string, number>> = read().then(value => {
      // The caller must get the newer result too, not merely leave it uncached.
      if (started !== revision) return fetch();
      cached = { at: Date.now(), value };
      return value;
    }).finally(() => { if (inflight === request) inflight = null; });
    inflight = request;
    return request;
  };
  return { fetch, invalidate };
}
