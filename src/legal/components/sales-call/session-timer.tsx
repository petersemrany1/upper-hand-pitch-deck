// Ported from the Legal app (family-law-floater/src/components/sales-call/session-timer.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { Coffee, Play } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { formatDuration } from "@/legal/lib/sales-call";

type BreakTime = { pausedAt: number | null; totalBreakMs: number };
const noBreak: BreakTime = { pausedAt: null, totalBreakMs: 0 };

function readBreak(key: string, fallback: BreakTime): BreakTime {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return noBreak;
    const saved = JSON.parse(raw);
    if (
      (saved?.pausedAt === null || Number.isFinite(saved?.pausedAt)) &&
      Number.isFinite(saved.totalBreakMs) &&
      saved.totalBreakMs >= 0
    )
      return saved;
    return noBreak;
  } catch {
    return fallback;
  }
}

export function SessionTimer({ sessionId, startedAt }: { sessionId: string; startedAt: string }) {
  const storageKey = `sales-call-break-${sessionId}`;
  const [rest, setRest] = useState(() => readBreak(storageKey, noBreak));
  const [now, setNow] = useState(Date.now);
  const storageAvailable = useRef(true);
  const paused = rest.pausedAt !== null;

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (storageAvailable.current && (event.key === storageKey || event.key === null)) {
        setNow(Date.now());
        setRest(readBreak(storageKey, noBreak));
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  function toggleBreak() {
    const at = Date.now();
    const current = storageAvailable.current ? readBreak(storageKey, rest) : rest;
    let next = current;
    if (paused && current.pausedAt !== null) {
      next = {
        pausedAt: null,
        totalBreakMs: current.totalBreakMs + Math.max(0, at - current.pausedAt),
      };
    } else if (!paused && current.pausedAt === null) {
      next = { ...current, pausedAt: at };
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      storageAvailable.current = false;
    }
    setNow(at);
    setRest(next);
  }

  const elapsedMs = (rest.pausedAt ?? now) - Date.parse(startedAt) - rest.totalBreakMs;
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">
          {paused ? "On break" : "Session time"}
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatDuration(Math.max(0, Math.floor(elapsedMs / 1000)))}
        </span>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={toggleBreak}>
        {paused ? <Play aria-hidden="true" /> : <Coffee aria-hidden="true" />}
        {paused ? "Resume" : "Break"}
      </Button>
    </div>
  );
}
