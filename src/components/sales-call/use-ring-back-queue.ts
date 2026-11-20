import { useCallback, useEffect, useState, type SetStateAction } from "react";

const STORE_KEY = "salesCall.ringBackQueue";
const TTL_MS = 2 * 60 * 60 * 1000;
type Queue = { owner: string | null; ids: string[]; ringBack: string[] };

function restore(owner: string | null): Queue {
  const empty = { owner, ids: [], ringBack: [] };
  if (!owner || typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(`${STORE_KEY}.${owner}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.at) || Date.now() - parsed.at > TTL_MS || !Array.isArray(parsed.ids)) return empty;
    const ids = parsed.ids.filter((id: unknown): id is string => typeof id === "string");
    const ringBack = Array.isArray(parsed.ringBack) ? parsed.ringBack.filter((id: unknown) => ids.includes(id)) : [];
    return { owner, ids, ringBack };
  } catch { return empty; }
}

/** Legacy unowned queues are not imported into another rep's account. */
export function useRingBackQueue(owner: string | null) {
  const [queue, setQueue] = useState<Queue>(() => restore(owner));
  useEffect(() => { setQueue(restore(owner)); }, [owner]);
  useEffect(() => {
    if (!owner || queue.owner !== owner || typeof window === "undefined") return;
    try {
      const key = `${STORE_KEY}.${owner}`;
      if (!queue.ids.length) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), ids: queue.ids, ringBack: queue.ringBack }));
    } catch { /* Storage unavailable: keep the in-memory queue. */ }
  }, [queue, owner]);
  const setMissedCallQueue = useCallback((update: SetStateAction<string[]>) => {
    setQueue(prev => prev.owner !== owner ? prev : { ...prev, ids: typeof update === "function" ? update(prev.ids) : update });
  }, [owner]);
  const setRingBackIds = useCallback((update: SetStateAction<string[]>) => {
    setQueue(prev => prev.owner !== owner ? prev : { ...prev, ringBack: typeof update === "function" ? update(prev.ringBack) : update });
  }, [owner]);
  return {
    missedCallQueue: queue.owner === owner ? queue.ids : [],
    ringBackIds: queue.owner === owner ? queue.ringBack : [],
    queueOwner: queue.owner === owner ? owner : null,
    setMissedCallQueue, setRingBackIds,
  };
}
