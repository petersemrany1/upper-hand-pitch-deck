import { useEffect, useRef, useState } from "react";

/** A failed read cannot finish a session. An exit/navigation invalidates in-flight work. */
export function useSessionCompletion<L>(enabled: boolean, options: {
  load: () => Promise<L[]>;
  stillCurrent: () => boolean;
  restore: (leads: L[]) => void;
  complete: () => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setError(null);
    void (async () => {
      try {
        const leads = await latest.current.load();
        if (cancelled || !latest.current.stillCurrent()) return;
        if (leads.length) latest.current.restore(leads);
        else latest.current.complete();
      } catch (err) {
        console.error("Final new-lead check failed", err);
        if (!cancelled) setError("Couldn’t check for new leads. Please retry before finishing.");
      }
    })();
    return () => { cancelled = true; };
  }, [enabled, retry]);
  return { error, retry: () => setRetry(n => n + 1) };
}
