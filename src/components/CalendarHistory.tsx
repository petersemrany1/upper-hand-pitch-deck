import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { History, X } from "lucide-react";
import { HISTORY_PAGE_SIZE, historySummary, historyTimestamp, type CalendarHistoryEntry, type CalendarHistoryLoader } from "@/lib/calendar-history";

export function CalendarHistory({ load, clinicName }: { load: CalendarHistoryLoader; clinicName: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [entries, setEntries] = useState<CalendarHistoryEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    if (!open) return;
    setLoading(true); setError(""); setEntries([]); setHasMore(false);
    void load({ date: date || undefined }).then(page => {
      if (generation.current !== current) return;
      setEntries(page.entries.slice(0, HISTORY_PAGE_SIZE)); setHasMore(page.entries.length > HISTORY_PAGE_SIZE);
    }).catch(() => {
      if (generation.current === current) setError("Could not load calendar history. Please try again.");
    }).finally(() => { if (generation.current === current) setLoading(false); });
    return () => { ++generation.current; };
  }, [open, date, refresh, load]);
  async function more() {
    if (loading || !hasMore) return;
    const current = generation.current;
    setLoading(true); setError("");
    try {
      const page = await load({ date: date || undefined, before: entries.at(-1)?.id });
      if (generation.current !== current) return;
      setEntries(previous => [...previous, ...page.entries.slice(0, HISTORY_PAGE_SIZE)]); setHasMore(page.entries.length > HISTORY_PAGE_SIZE);
    } catch { if (generation.current === current) setError("Could not load older entries. Please try again."); }
    finally { if (generation.current === current) setLoading(false); }
  }
  const changes = entries.filter(entry => entry.operation !== "baseline");
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button className="availability-history-link"><History size={14} />Calendar history</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="availability-dialog-backdrop" /><Dialog.Content className="availability-dialog availability-history-dialog">
      <div className="availability-dialog-title"><Dialog.Title>Calendar history</Dialog.Title><Dialog.Close aria-label="Close calendar history"><X size={18} /></Dialog.Close></div>
      <Dialog.Description>{clinicName} · Sydney time</Dialog.Description>
      <div className="availability-history-filters"><label>Calendar date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>{date && <button onClick={() => setDate("")}>All dates</button>}<button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh history</button></div>
      {error && <div className="availability-error" role="alert">{error}<button onClick={() => entries.length ? void more() : setRefresh(value => value + 1)}>Retry</button></div>}
      {!loading && !error && !changes.length && <p role="status" className="availability-history-empty">No recorded changes{date ? " for this date" : " yet"}.</p>}
      <ol className="availability-history-list">{changes.map(entry => <li key={entry.id}>
        <p className="availability-history-summary">{historySummary(entry)}</p>
        <time dateTime={entry.recorded_at}>{historyTimestamp(entry.recorded_at)}</time>
      </li>)}</ol>
      {loading && <p role="status">Loading history…</p>}
      {hasMore && <div className="availability-actions"><button disabled={loading} onClick={() => void more()}>Load older entries</button></div>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
