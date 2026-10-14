import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, MessageSquare, Check, RefreshCw, ArrowRight, MapPin } from "lucide-react";
import { confirmationDate, confirmationDay, confirmationTime, confirmationState, currentConfirmationEvents, confirmationAddress, confirmationMap, confirmationText, confirmationCallGuide, clinicLocalClock, type ConfirmationBooking, type ConfirmationOutcome } from "@/lib/appointment-confirmations";
import { formatSydney } from "@/lib/timezone";
import "./appointment-confirmation-calls.css";

type Action = { appointmentId: string; version: string; requestId: string };
export type ConfirmationApi = {
  list(date: string): Promise<ConfirmationBooking[]>;
  record(data: Action & { outcome: ConfirmationOutcome; note: string }): Promise<unknown>;
  send(data: Action & { body: string }): Promise<{ status: string; error: string | null }>;
};
const labels = { pending: "To call", confirmed: "Confirmed", no_answer: "No answer", needs_help: "Needs help" };

export function ConfirmationCallsView({ api, onCall, onInbox, onReschedule, onHangup, activePhone, callBusy = false, callStatus, callError, refreshKey = 0, repName, now: suppliedNow }: {
  api: ConfirmationApi; onCall(b: ConfirmationBooking): Promise<void>; onInbox(b: ConfirmationBooking): void;
  onReschedule(b: ConfirmationBooking): void; onHangup(): void; activePhone?: string | null;
  callBusy?: boolean; callStatus?: string; callError?: string | null; refreshKey?: number; repName?: string | null; now?: Date;
}) {
  const [now, setNow] = useState(() => suppliedNow ?? new Date());
  const [date, setDate] = useState(() => confirmationDate(1, suppliedNow));
  const [rows, setRows] = useState<ConfirmationBooking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [composer, setComposer] = useState<{ appointmentId: string; version: string; requestId: string; body: string; locked: boolean } | null>(null);
  const request = useRef(0);
  const actionLock = useRef(false);
  const load = useCallback(async (background = false) => {
    const current = ++request.current;
    if (!background) setLoading(true);
    try {
      const bookings = await api.list(date);
      if (current !== request.current) return;
      setRows(bookings); setError("");
      setSelectedId(previous => bookings.some(b => b.id === previous) ? previous : bookings.find(b => confirmationState(b) !== "confirmed")?.id ?? bookings[0]?.id ?? null);
    } catch (e) { if (current === request.current) setError((e as Error).message || "Could not load confirmations"); }
    finally { if (current === request.current) setLoading(false); }
  }, [api, date]);
  useEffect(() => { setRows([]); setSelectedId(null); setComposer(null); void load(); return () => { request.current++; }; }, [load, refreshKey]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && !actionLock.current) { setNow(suppliedNow ?? new Date()); void load(true); } };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load, suppliedNow]);
  useEffect(() => { setNote(""); setComposer(null); setMessage(""); }, [selectedId, date]);
  const selected = rows.find(b => b.id === selectedId);
  const events = selected ? currentConfirmationEvents(selected) : [];
  const sms = events.find(e => e.kind === "sms");
  const clock = selected ? clinicLocalClock(selected, now) : null;
  const confirmed = rows.filter(b => confirmationState(b) === "confirmed").length;
  const followUp = rows.filter(b => ["no_answer", "needs_help"].includes(confirmationState(b))).length;
  const status = selected ? confirmationState(selected) : "pending";
  const locked = busy || loading || Boolean(error);
  const composerStale = Boolean(composer && (!selected || composer.appointmentId !== selected.id || composer.version !== selected.updated_at));

  async function act(work: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setMessage("");
    try { await work(); } catch (e) { setMessage((e as Error).message || "Could not complete that action. Please retry."); }
    finally { actionLock.current = false; setBusy(false); }
  }
  function openText(b: ConfirmationBooking, missed: boolean) {
    const existing = currentConfirmationEvents(b).find(e => e.kind === "sms");
    setComposer({ appointmentId: b.id, version: b.updated_at, requestId: existing?.id ?? crypto.randomUUID(), body: existing?.sms_body || confirmationText(b, missed), locked: Boolean(existing) });
  }
  async function record(outcome: ConfirmationOutcome) {
    if (!selected) return;
    const b = selected;
    await act(async () => {
      await api.record({ appointmentId: b.id, version: b.updated_at, requestId: crypto.randomUUID(), outcome, note });
      await load(true);
      setMessage(outcome === "confirmed" ? "Patient confirmed they’re coming." : outcome === "no_answer" ? "No answer recorded. Review the text below." : "Saved for follow-up.");
      if (outcome === "no_answer") openText(b, true);
    });
  }

  return <section className="confirmation-calls">
    <header className="cc-heading"><div><h1>Confirmation calls</h1><p>Check the address, confirm they’re coming, and help with anything in the way.</p></div><button onClick={() => void load()} disabled={busy || loading}><RefreshCw size={15} /> Refresh</button></header>
    <div className="cc-toolbar"><div className="cc-date-buttons">
      <button aria-pressed={date === confirmationDate(0, now)} disabled={busy} onClick={() => setDate(confirmationDate(0, now))}>Today</button>
      <button aria-pressed={date === confirmationDate(1, now)} disabled={busy} onClick={() => setDate(confirmationDate(1, now))}>Tomorrow</button>
      <input type="date" aria-label="Appointment date" value={date} disabled={busy} onChange={e => { if (e.target.value) setDate(e.target.value); }} />
    </div><span>Appointments on {confirmationDay(date)}</span></div>
    <div className="cc-stats"><div><strong>{rows.length}</strong> appointments</div><div><strong>{rows.length - confirmed - followUp}</strong> to call</div><div className="cc-green"><strong>{confirmed}</strong> confirmed</div><div><strong>{followUp}</strong> need follow-up</div></div>
    {error && <p className="cc-error" role="alert">{error} <button onClick={() => void load()}>Retry</button></p>}
    {loading ? <p role="status" className="cc-empty">Loading appointments…</p> : !rows.length && !error ? <div className="cc-empty"><Check size={28} /><h2>No appointments to confirm for this date</h2><p>Choose another day to work ahead.</p></div> : <div className="cc-workspace">
      <aside className="cc-list" aria-label="Appointments to confirm">{rows.map(b => <button key={b.id} disabled={busy} aria-pressed={b.id === selectedId} onClick={() => setSelectedId(b.id)}>
        <span className="cc-row-top"><strong>{b.patient_name}</strong><span>{confirmationTime(b.appointment_time)}</span></span>
        <span className="cc-clinic">{b.clinic?.clinic_name || "Clinic not linked"}</span>
        <span className={`cc-badge cc-${confirmationState(b)}`}>{labels[confirmationState(b)]}</span>
      </button>)}</aside>
      {selected && <article className="cc-detail">
        <div className="cc-person"><div><h2>{selected.patient_name}</h2><p>{confirmationDay(selected.appointment_date)} · {confirmationTime(selected.appointment_time)}</p><p>{selected.clinic?.clinic_name || "Clinic not linked"}{selected.doctor_name ? ` · ${selected.doctor_name}` : ""}</p></div><span className={`cc-badge cc-${status}`}>{labels[status]}</span></div>
        <div className="cc-address"><MapPin size={18} /><div><strong>{confirmationAddress(selected) || "Clinic address missing"}</strong>{confirmationMap(selected) && <a href={confirmationMap(selected)} target="_blank" rel="noreferrer">Open map ↗</a>}</div></div>
        <div className="cc-phone"><span>{selected.patient_phone || "No phone number saved"}</span><span>{clock?.label} in {clock?.city}</span></div>
        {clock?.early && <p className="cc-warning">It’s before 9 am in {clock.city}. You can come back to this call later.</p>}
        {clock?.late && <p className="cc-warning">It’s after 8 pm in {clock.city}. Check whether this is a suitable time to call.</p>}
        <div className="cc-actions"><button className="cc-primary" disabled={locked || callBusy || !selected.patient_phone} onClick={() => void act(async () => { await onCall(selected); })}><Phone size={16} /> Call patient</button>
          <button disabled={locked || !selected.patient_phone} onClick={() => { try { openText(selected, status === "no_answer"); } catch (e) { setMessage((e as Error).message); } }}><MessageSquare size={16} /> {sms ? "View text" : "Text appointment details"}</button>
          <button disabled={busy} onClick={() => onInbox(selected)}>SMS conversation ↗</button>
        </div>
        {callBusy && <div className="cc-call-active" role="status">{callStatus === "in-call" ? "Call in progress" : "Connecting call"}{activePhone ? ` · ${activePhone}` : ""}<button onClick={onHangup}><PhoneOff size={16} /> End call</button></div>}
        {callError && <p role="alert" className="cc-error">{callError}</p>}
        <div className="cc-script"><span className="cc-eyebrow">Your call guide</span>
          {confirmationCallGuide(selected, repName, now).map((paragraph, index) => <p key={index}>“{paragraph}”</p>)}
        </div>
        <label className="cc-note">Call notes <span>optional</span><textarea value={note} maxLength={1000} disabled={locked} onChange={e => setNote(e.target.value)} placeholder="Anything to follow up, or a good time to call back…" rows={2} /></label>
        <div className="cc-outcomes" aria-label="Call outcome"><button className="cc-confirm" disabled={locked || callBusy} onClick={() => void record("confirmed")}><Check size={16} /> Confirmed they’re coming</button><button disabled={locked || callBusy} onClick={() => void record("no_answer")}>No answer → text</button><button disabled={locked || callBusy} onClick={() => void record("needs_help")}>Needs follow-up</button></div>
        <div className="cc-secondary"><button disabled={locked || callBusy} onClick={() => onReschedule(selected)}>Reschedule appointment</button><button disabled={busy || callBusy || rows.length < 2} onClick={() => { const candidates = rows.filter(b => b.id !== selected.id && confirmationState(b) !== "confirmed"); setSelectedId(candidates[0]?.id ?? rows[(rows.findIndex(b => b.id === selected.id) + 1) % rows.length]?.id); }}>Next patient <ArrowRight size={14} /></button></div>
        {message && <p role="status" className="cc-message">{message}</p>}
        {composer && <div className="cc-composer"><div><h3>{sms ? "Appointment text" : "Review your text"}</h3><span>To {selected.patient_phone}</span></div>
          <textarea aria-label="Confirmation text" value={composer.body} maxLength={1600} rows={9} disabled={busy || composer.locked || Boolean(sms) || composerStale} onChange={e => setComposer({ ...composer, body: e.target.value })} />
          {composerStale ? <p role="alert">The appointment changed. Close this draft and reopen the latest details.</p> : sms?.sms_status === "accepted" ? <p>Text accepted for sending. Delivery updates and replies are in the SMS conversation.</p> : ["sending", "uncertain"].includes(sms?.sms_status ?? "") ? <p role="alert">{sms?.sms_error || "Sending is still being checked. Check the SMS conversation before trying again."}</p> : <p>{sms?.sms_error || "Nothing is sent until you press Send text."}</p>}
          <div className="cc-actions"><button className="cc-primary" disabled={locked || composerStale || !composer.body.trim() || ["sending", "accepted", "uncertain"].includes(sms?.sms_status ?? "")} onClick={() => void act(async () => {
            const result = await api.send(composer);
            await load(true);
            setMessage(result.status === "accepted" ? "Text accepted for sending. This patient still needs to confirm." : result.error || "Sending is being checked. Open the SMS conversation for updates.");
          })}>{busy ? "Sending…" : sms?.sms_status === "failed" ? "Retry text" : "Send text"}</button><button disabled={busy} onClick={() => setComposer(null)}>Close text</button></div>
        </div>}
        {!!selected.events.length && <details className="cc-history"><summary>Confirmation history ({selected.events.length})</summary>{selected.events.map(e => <div key={e.id}><strong>{e.kind === "sms" ? `Text: ${e.sms_status}` : labels[e.kind]}</strong> · {e.actor_name} · {formatSydney(e.created_at, { dateStyle: "short", timeStyle: "short" })}{Date.parse(e.appointment_updated_at) !== Date.parse(selected.updated_at) && <span> · Before booking was updated</span>}{e.note && <p>{e.note}</p>}</div>)}</details>}
      </article>}
    </div>}
  </section>;
}
