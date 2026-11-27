// Ported from the Legal app (family-law-floater/src/lib/snapshot-cache.ts). Re-run the port script to refresh.
/** A bounded, process-local snapshot. Concurrent readers share one request. */
export function createSnapshotCache<T>(ttlMs: number, now = Date.now) {
  let value: { data: T; expires: number } | undefined;
  let pending: Promise<T> | undefined;
  let generation = 0;
  return {
    read(load: () => Promise<T>): Promise<T> {
      if (value && now() < value.expires) return Promise.resolve(value.data);
      if (pending) return pending;
      const version = generation;
      const request = load()
        .then((data) => {
          if (generation === version) value = { data, expires: now() + ttlMs };
          return data;
        })
        .finally(() => {
          if (pending === request) pending = undefined;
        });
      pending = request;
      return request;
    },
    clear() {
      generation++;
      value = undefined;
      pending = undefined;
    },
  };
}
