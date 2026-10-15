import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { confirmationDate, type ConfirmationBooking } from "@/lib/appointment-confirmations";
import { validateCallback, type ScheduleCallbackInput } from "@/lib/confirmation-callbacks";
import { sydneyTodayISO } from "@/lib/timezone";

export function ConfirmationCallbackDialog({ booking, initialNote = "", save, onSaved, onClose }: {
  booking: ConfirmationBooking; initialNote?: string;
  save(data: ScheduleCallbackInput): Promise<unknown>; onSaved(): void; onClose(): void;
}) {
  const [date, setDate] = useState(booking.callback?.callback_date && booking.callback.callback_date >= sydneyTodayISO() ? booking.callback.callback_date : confirmationDate(1));
  const [time, setTime] = useState(booking.callback?.callback_time?.slice(0, 5) ?? "");
  const [note, setNote] = useState(initialNote || booking.callback?.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  // Preserve the same request on an ambiguous retry; edited values receive a fresh ID.
  const request = useRef<{ key: string; id: string } | null>(null);
  async function submit() {
    if (lock.current) return;
    try { validateCallback(date, time || null); } catch (e) { setError((e as Error).message); return; }
    lock.current = true; setBusy(true); setError("");
    const key = JSON.stringify([date, time, note]);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    try {
      await save({ appointmentId: booking.id, version: booking.updated_at, requestId: request.current.id,
        expectedCallbackId: booking.callback?.id ?? null, date, time: time || null, note });
      onSaved();
    } catch (e) { setError((e as Error).message || "Could not save the callback. Please retry."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-md"><DialogHeader>
    <DialogTitle>{booking.callback ? "Change callback" : "Call back later"}</DialogTitle>
    <DialogDescription>{booking.patient_name} · {booking.clinic?.clinic_name}</DialogDescription>
  </DialogHeader>
    <div className="grid grid-cols-2 gap-3 text-sm">
      <label className="grid gap-1">Callback date<input type="date" aria-label="Callback date" className="rounded border p-2" min={sydneyTodayISO()} value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></label>
      <label className="grid gap-1">Time (optional)<input type="time" aria-label="Callback time" className="rounded border p-2" value={time} disabled={busy} onChange={e => setTime(e.target.value)} /></label>
    </div>
    <p className="text-xs text-muted-foreground">Sydney time. Leave the time blank to call any time that day.</p>
    <label className="grid gap-1 text-sm">Callback note<textarea aria-label="Callback note" className="rounded border p-2" rows={3} maxLength={1000} value={note} disabled={busy} onChange={e => setNote(e.target.value)} placeholder="Needs to reschedule; call after work…" /></label>
    <p className="text-sm text-muted-foreground">This adds a callback to your confirmations list. The original booking and its reminders stay unchanged until you reschedule it.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || !date} onClick={() => void submit()}>{busy ? "Saving…" : "Save callback"}</Button></div>
  </DialogContent></Dialog>;
}
