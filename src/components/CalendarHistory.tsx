import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { History, X } from "lucide-react";
import { HISTORY_PAGE_SIZE, historyDetails, historyTimestamp, historyTitle, type CalendarHistoryEntry, type CalendarHistoryLoader } from "@/lib/calendar-history";

export function CalendarHistory({ load, clinicName }: { load: CalendarHistoryLoader; clinicName: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [entries, setEntries] = useState<CalendarHistoryEntry[]>([]);
  const [startedAt, setStartedAt] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    if (!open) return;
    setLoading(true); setError(""); setEntries([]); setHasMore(false); setStartedAt("");
    void load({ date: date || undefined }).then(page => {
      if (generation.current !== current) return;
      setStartedAt(page.started_at); setEntries(page.entries.slice(0, HISTORY_PAGE_SIZE)); setHasMore(page.entries.length > HISTORY_PAGE_SIZE);
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
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button className="availability-history-link"><History size={14} />Calendar history</button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="availability-dialog-backdrop" /><Dialog.Content className="availability-dialog availability-history-dialog">
      <div className="availability-dialog-title"><Dialog.Title>Calendar history</Dialog.Title><Dialog.Close aria-label="Close calendar history"><X size={18} /></Dialog.Close></div>
      <Dialog.Description>{clinicName} · A read-only record of saved changes, newest first. All times are Sydney time.</Dialog.Description>
      {startedAt && <p className="availability-history-start">Recording began {historyTimestamp(startedAt)}. “Present when history started” entries show the starting calendar, not when those items were originally created. Earlier edits aren’t available.</p>}
      <div className="availability-history-filters"><label>Calendar date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>{date && <button onClick={() => setDate("")}>All dates</button>}<button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Refresh history</button></div>
      <p className="availability-help">Filter by the date affected to compare bookings with availability changes. Weekly hours and settings affecting that date are included.</p>
      {error && <div className="availability-error" role="alert">{error}<button onClick={() => entries.length ? void more() : setRefresh(value => value + 1)}>Retry</button></div>}
      {!loading && !error && !entries.length && <p role="status" className="availability-history-empty">No recorded changes{date ? " for this date" : " yet"}.</p>}
      <ol className="availability-history-list">{entries.map(entry => <li key={entry.id}>
        <div className="availability-history-meta"><time dateTime={entry.recorded_at}>{historyTimestamp(entry.recorded_at)}</time><span>{entry.actor_name}{entry.actor_role === "clinic" ? " · Clinic account" : entry.actor_role === "admin" ? " · Admin" : entry.actor_role === "rep" ? " · Sales team" : ""}</span></div>
        <h3>{historyTitle(entry)}</h3>
        <div className="availability-history-values">{entry.before_data && <div><strong>Before</strong>{historyDetails(entry.entity_type, entry.before_data).map((line, index) => <p key={index}>{line}</p>)}</div>}{entry.after_data && <div><strong>{entry.operation === "baseline" ? "Starting state" : entry.before_data ? "After" : "Details"}</strong>{historyDetails(entry.entity_type, entry.after_data).map((line, index) => <p key={index}>{line}</p>)}</div>}</div>
      </li>)}</ol>
      {loading && <p role="status">Loading history…</p>}
      {hasMore && <div className="availability-actions"><button disabled={loading} onClick={() => void more()}>Load older entries</button></div>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
