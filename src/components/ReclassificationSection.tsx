import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RECLASSIFICATION_ACKNOWLEDGEMENT, RECLASSIFICATION_NOTICE, type ReclassificationRequest } from "@/lib/reclassification";
import { getReclassificationRequest, submitReclassificationRequest } from "@/utils/reclassification.functions";
import { useDemoClinic } from "./DemoClinicContext";
import "./reclassification.css";

export function ReclassificationSection({ appointmentId, patientName, disqualified = false }: {
  appointmentId: string; patientName: string; disqualified?: boolean;
}) {
  const demo = useDemoClinic();
  const [request, setRequest] = useState<ReclassificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    const load = demo ? Promise.resolve(demo.reclassificationFor(appointmentId)) : getReclassificationRequest({ data: { appointmentId } });
    void load.then(value => { if (!cancelled) setRequest(value); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appointmentId, demo, attempt]);

  const submit = async () => {
    if (submitting.current || !acknowledged || reason.trim().length < 20) return;
    submitting.current = true; setSaving(true); setError("");
    try {
      const saved = demo ? demo.requestReclassification(appointmentId, reason, acknowledged)
        : await submitReclassificationRequest({ data: { appointmentId, reason, acknowledged: true } });
      setRequest(saved); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit. Please try again."); }
    finally { submitting.current = false; setSaving(false); }
  };

  return <section className="reclassification-section" aria-label="Lead reclassification">
    {loading ? <p role="status">Checking reclassification requests…</p> : loadError ? <p role="alert">Could not check previous requests. <button className="reclass-link" onClick={() => setAttempt(n => n + 1)}>Retry</button></p>
      : request ? <div className="reclass-receipt" role="status">
        <strong>Reclassification requested</strong>
        <p>Submitted {new Date(request.created_at).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} · Pending review</p>
        <p>Please allow 1–2 weeks for a response. Classification and pack count remain unchanged while the request is pending.</p>
        <details><summary>View submitted reason</summary><p className="reclass-reason">{request.reason}</p></details>
        {demo && <p>Demo request saved. No email was sent.</p>}
      </div> : disqualified ? <p>This lead is already disqualified.</p> : <details>
        <summary>More actions</summary>
        <button className="reclass-button" onClick={() => { setError(""); setAcknowledged(false); setOpen(true); }}>Submit a reclassification request</button>
      </details>}
    <Dialog open={open} onOpenChange={value => { if (!submitting.current) setOpen(value); }}>
      <DialogContent className="reclass-dialog z-[120]" overlayClassName="z-[110]" onEscapeKeyDown={e => { if (saving) e.preventDefault(); }} onInteractOutside={e => { if (saving) e.preventDefault(); }}>
        <DialogTitle>Request a lead reclassification</DialogTitle>
        <DialogDescription>{patientName}</DialogDescription>
        <div className="reclass-explanation"><strong>Review timeframe: 1–2 weeks</strong><p>{RECLASSIFICATION_NOTICE}</p>
          <p>Submitting a request does not automatically approve a reclassification, credit or refund. A lead currently classified as qualified continues to count as qualified while the review is pending.</p>
        </div>
        <label className="reclass-field" htmlFor="reclassification-reason">Reason and supporting details <span>(required)</span></label>
        <p id="reclassification-help" className="reclass-help">Which qualification criterion in your agreement was not met? Include the relevant facts and dates so we can assess your request.</p>
        <textarea id="reclassification-reason" aria-describedby="reclassification-help" value={reason} onChange={e => setReason(e.target.value)} maxLength={4000} minLength={20} rows={4} disabled={saving} placeholder="Explain the criterion and what happened…" />
        <span className="reclass-help">{reason.trim().length}/4000 characters · minimum 20</span>
        <label className="reclass-ack"><input type="checkbox" checked={acknowledged} disabled={saving} onChange={e => setAcknowledged(e.target.checked)} /><span>{RECLASSIFICATION_ACKNOWLEDGEMENT}</span></label>
        {error && <p className="reclass-error" role="alert">{error}</p>}
        {demo && <p className="reclass-help">Training demo — this request stays in this tab and sends no email.</p>}
        <div className="reclass-footer"><button className="reclass-button" disabled={saving} onClick={() => setOpen(false)}>Cancel</button>
          <button className="reclass-button reclass-submit" disabled={saving || !acknowledged || reason.trim().length < 20} onClick={() => void submit()}>{saving ? "Submitting…" : "Submit request"}</button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
