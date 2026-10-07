import { useCallback, useEffect, useState } from "react";

type Snapshot<T> = { key: string; data?: T; error: Error | null };

/** Keep the last successful result mounted while refreshing the same view. */
export function useQuietRefresh<T>({
  queryKey,
  load,
  refreshKey = 0,
  enabled = true,
}: {
  queryKey: string;
  load: () => Promise<T>;
  refreshKey?: number;
  enabled?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ key: queryKey, error: null });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // A different clinic/report must never display the previous view's data.
    // For the same view, leave its data and any retry notice in place.
    setSnapshot((previous) => previous.key === queryKey && previous.data !== undefined
      ? previous
      : { key: queryKey, error: null });
    void (async () => {
      try {
        const data = await load();
        if (!cancelled) setSnapshot({ key: queryKey, data, error: null });
      } catch (error) {
        if (!cancelled) setSnapshot((previous) => ({
          key: queryKey,
          data: previous.key === queryKey ? previous.data : undefined,
          error: error instanceof Error ? error : new Error("Could not refresh data"),
        }));
      }
    })();
    // A slower old request must not overwrite a newer refresh or clinic.
    return () => { cancelled = true; };
  }, [queryKey, load, refreshKey, revision, enabled]);

  const current = enabled && snapshot.key === queryKey ? snapshot : undefined;
  return {
    data: current?.data,
    error: current?.error ?? null,
    loading: enabled && current?.data === undefined && !current?.error,
    reload,
  };
}
