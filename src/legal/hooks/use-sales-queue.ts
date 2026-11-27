// Ported from the Legal app (family-law-floater/src/hooks/use-sales-queue.ts). Re-run the port script to refresh.
import { useCallback, useEffect, useRef, useState } from "react";
import { claimSalesLead, renewSalesLead } from "@/legal/lib/shared-sales-queue";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Could not load the next client. Please retry.";

export function useSalesQueue(sessionId: string | undefined, preferredLeadId: string | undefined, retainCurrentLead = false) {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<string | null>(null);
  const retainCurrent = useRef(retainCurrentLead);
  retainCurrent.current = retainCurrentLead;
  const generation = useRef(0);
  const pending = useRef(false);
  // A link is used on entry; changing the URL after Next must not reopen it.
  const preferred = useRef(preferredLeadId);
  preferred.current = preferredLeadId;
  // Keep a failed explicit client request separate from the automatic queue.
  // Retrying or reconnecting must not silently assign a different client.
  const retryLead = useRef<string | null>(null);

  const load = useCallback(
    async (advance = false, preferredId?: string | null) => {
      if (!sessionId || pending.current) return false;
      const requestGeneration = generation.current;
      const target = advance ? null : preferredId === undefined ? retryLead.current : preferredId;
      if (!active.current || advance) retryLead.current = target;
      pending.current = true;
      setLoading(true);
      try {
        const id = await claimSalesLead(sessionId, advance ? active.current : null, target);
        if (generation.current !== requestGeneration) return false;
        retryLead.current = null;
        active.current = id;
        setLeadId(id);
        setError(null);
        return true;
      } catch (cause) {
        if (generation.current === requestGeneration) setError(message(cause));
        return false;
      } finally {
        if (generation.current === requestGeneration) {
          pending.current = false;
          setLoading(false);
        }
      }
    },
    [sessionId],
  );

  useEffect(() => {
    generation.current += 1;
    active.current = null;
    retryLead.current = preferred.current ?? null;
    pending.current = false;
    setLeadId(null);
    setError(null);
    setLoading(false);
    if (sessionId) void load(false, preferred.current ?? null);
    return () => {
      generation.current += 1;
    };
  }, [sessionId, load]);

  const ensureClaim = useCallback(async () => {
    const id = active.current;
    if (!sessionId || !id) return false;
    const requestGeneration = generation.current;
    const held = await renewSalesLead(sessionId, id);
    if (generation.current !== requestGeneration || active.current !== id) return false;
    if (!held) {
      retryLead.current = id;
      // Keep an in-progress call/outcome on screen; a failed check still blocks dialing.
      if (!retainCurrent.current) {
        active.current = null;
        setLeadId(null);
      }
      setError("This client is unavailable: city capacity is full or another caller has reserved them. Get the next available lead.");
    } else setError(null);
    return held;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let disposed = false;
    const tick = () => {
      if (pending.current) return;
      // Keep waiting when the pool is empty; new leads and due callbacks appear
      // without rebuilding a snapshot or ending the work session.
      if (!active.current) {
        void load();
        return;
      }
      void ensureClaim().catch((cause) => {
        if (!disposed) setError(message(cause));
      });
    };
    const timer = window.setInterval(tick, 15_000);
    window.addEventListener("online", tick);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("online", tick);
    };
  }, [sessionId, load, ensureClaim]);

  return { leadId, loading, error, load, ensureClaim };
}
