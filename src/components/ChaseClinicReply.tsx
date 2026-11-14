import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { getChaseReplies, sendChaseReply } from "@/utils/chase-reply.functions";

type Props = { appointmentId: string; requestedAt: string | null; recipient: string; patient: string };
type Reply = Awaited<ReturnType<typeof getChaseReplies>>[number];

export function ChaseClinicReply({ appointmentId, requestedAt, recipient, patient }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Reply[]>([]);
  const [feedback, setFeedback] = useState("");
  const [subject, setSubject] = useState(`Clinic follow-up — ${patient}`);
  const [body, setBody] = useState("");
  const send = useServerFn(sendChaseReply);
  const list = useServerFn(getChaseReplies);
  const load = async () => {
    try { setHistory(await list({ data: { appointmentId, requestedAt } })); }
    catch { toast.error("Could not load the email history."); }
  };
  const submit = async () => {
    if (busy || !body.trim() || !subject.trim()) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = await send({ data: { appointmentId, requestedAt, recipient, subject, body } });
      if (result.status === "accepted") {
        setFeedback(`Email sent to ${recipient}.`);
        setBody("");
      } else {
        setFeedback(result.error ?? "Check delivery before sending again.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not confirm the send. Check the email history.");
    } finally {
      await load();
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 border-t border-border pt-3 text-sm">
      <button type="button" className="inline-flex items-center gap-2 font-semibold text-primary" aria-expanded={open}
        onClick={() => { setOpen(!open); if (!open) void load(); }}>
        <Mail size={15} /> Reply to clinic by email
      </button>
      {open && (
        <div className="mt-3 max-w-2xl space-y-3">
          {history.length > 0 && <div aria-label="Clinic email history" className="space-y-1">
            {history.map(item => <details key={item.id} className="rounded-md bg-muted p-2 text-xs">
              <summary className="cursor-pointer">
                {item.status === "sent" ? "Sent" : item.status === "pending" ? "Awaiting confirmation" : item.status}
                {" · "}{item.to}{" · "}{new Date(item.at).toLocaleString("en-AU")}
              </summary>
              <strong className="mt-2 block">{item.subject}</strong>
              <p className="mt-1 whitespace-pre-wrap">{item.body}</p>
            </details>)}
          </div>}
          {recipient ? <form className="space-y-2" onSubmit={e => { e.preventDefault(); void submit(); }}>
            <p><strong>To</strong> {recipient}</p>
            <label className="block">Subject
              <input className="mt-1 block w-full rounded border p-2" required maxLength={200} value={subject} disabled={busy} onChange={e => setSubject(e.target.value)} />
            </label>
            <label className="block">Message
              <textarea className="mt-1 block w-full rounded border p-2" required rows={5} maxLength={5000} value={body} disabled={busy} onChange={e => setBody(e.target.value)} />
            </label>
            <button type="submit" disabled={busy || !body.trim() || !subject.trim()} className="rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">
              {busy ? "Sending…" : "Send email"}
            </button>
          </form> : <p>Save an email address for this clinic to send a reply.</p>}
          {feedback && <p role="status" className="font-medium">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
