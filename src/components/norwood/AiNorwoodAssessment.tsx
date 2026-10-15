import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NORWOOD_GUIDES, type NorwoodSuggestion, type NorwoodView, type RepNorwoodSession } from "@/lib/norwood-assessment";
import type { NorwoodRepApi } from "@/lib/norwood-preview-session";

export default function AiNorwoodAssessment({ leadId, clinicId, onSuggestion, api, mode = "local" }: {
  api: NorwoodRepApi; mode?: "local" | "sms";
  leadId: string; clinicId: string; onSuggestion: (suggestion: NorwoodSuggestion | null) => void;
}) {
  const { getNorwoodPhotoLinks, getRepNorwoodAssessment, retryRepNorwoodAssessment, sendAiNorwoodLink } = api;
  const [session, setSession] = useState<RepNorwoodSession | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const mutationVersion = useRef(0);
  const [photos, setPhotos] = useState<{ view: NorwoodView; url: string }[]>([]);
  const [enlarged, setEnlarged] = useState<NorwoodView | null>(null);
  const offered = useRef<string | null>(null), callback = useRef(onSuggestion);
  callback.current = onSuggestion;

  useEffect(() => {
    let cancelled = false, timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      const version = mutationVersion.current;
      try {
        const result = await getRepNorwoodAssessment({ data: { leadId } });
        if (!cancelled && version === mutationVersion.current) {
          if (result.ok) { setSession(result.data); setConnectionError(""); }
          else setConnectionError(result.error);
        }
      } catch { if (!cancelled) setConnectionError("Live updates disconnected. Reconnecting…"); }
      if (!cancelled) timer = setTimeout(refresh, 3000);
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [leadId, api]);

  useEffect(() => {
    if (session && offered.current && (session.id !== offered.current || session.revoked)) {
      offered.current = null; callback.current(null);
    }
    if (!session?.result || session.revoked || offered.current === session.id) return;
    offered.current = session.id;
    callback.current({ assessmentId: session.id, norwood: session.result.norwood, finalNorwood: session.finalNorwood });
  }, [session]);

  useEffect(() => {
    setPhotos([]);
    if (!session?.id || session.photoCount !== 5) return;
    let cancelled = false;
    async function refresh() {
      try {
        const result = await getNorwoodPhotoLinks({ data: { leadId, assessmentId: session!.id } });
        if (cancelled) return;
        if (result.ok) { setPhotos(result.data); setPhotoError(""); }
        else setPhotoError(result.error);
      } catch { if (!cancelled) setPhotoError("Photo previews could not load. Retrying…"); }
    }
    void refresh();
    const timer = setInterval(refresh, 45_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [leadId, session?.id, session?.photoCount]);

  async function send() {
    if (!clinicId || busy) return;
    mutationVersion.current++;
    setBusy(true); setError("");
    try {
      const result = await sendAiNorwoodLink({ data: { leadId, clinicId } });
      if (result.ok) { mutationVersion.current++; setSession(result.data); setPhotos([]); setPhotoError(""); callback.current(null); }
      else setError(result.error);
    } catch { setError("Couldn't confirm the text was sent. Wait a minute before trying again."); }
    finally { setBusy(false); }
  }
  async function retry() {
    setBusy(true); setError("");
    try {
      const result = await retryRepNorwoodAssessment({ data: { leadId } });
      if (!result.ok) setError(result.error);
    } catch { setError("Couldn't retry the estimate. Check your connection."); }
    finally { setBusy(false); }
  }
  const stopped = Boolean(session?.revoked || (session?.expired && session.status !== "ready"));
  const progress = !session || session.status === "send_failed" || session.status === "sending" ? -1 : session.result ? 3 : session.photoCount === 5 ? 2 : session.openedAt ? 1 : 0;
  const active = photos.find(p => p.view === enlarged);

  return <section className="rounded-lg border border-border bg-card p-3 space-y-3" aria-label="AI Norwood photo check">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-medium"><Camera size={16} />AI Norwood photo check</div>
      <button type="button" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50" disabled={!clinicId || busy} onClick={() => void send()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}{mode === "sms" ? (session && !stopped ? "Send fresh AI Norwood link" : "Send AI Norwood link") : session && !stopped ? "Restart test session" : "Start test session"}</button></div>
    {!clinicId && <p className="text-xs text-muted-foreground">Select a clinic above to brand the patient’s photo page.</p>}
    {session && <>
      <div className="flex gap-1" aria-live="polite">{[mode === "sms" ? "Sent" : "Test started", "Opened", "Photos in", "Result ready"].map((label, i) => <div key={label} className={`flex-1 rounded px-1 py-2 text-center text-[10px] ${i <= progress ? "bg-emerald-50 text-emerald-800" : "bg-muted text-muted-foreground"}`}><span className="block">{i <= progress ? "✓" : i + 1}</span>{label}</div>)}</div>
      <p className="text-xs text-muted-foreground">{session.clinicName} · {session.photoCount}/5 photos{stopped ? " · Link expired or replaced" : ""}</p>
      {clinicId && clinicId !== session.clinicId && <p className="text-xs text-amber-800">The selected clinic changed. Send a fresh link to use its branding.</p>}
      {session.status === "analysing" && !stopped && <p className="flex items-center gap-2 text-xs" role="status"><Loader2 size={13} className="animate-spin" />Analysing all five photos…</p>}
      {session.status === "send_failed" && <p className="text-xs text-destructive">The text could not be confirmed. Send a fresh link.</p>}
      {session.status === "failed" && <p className="text-xs text-amber-800">The estimate could not finish. The photos are saved for review.</p>}
      {photos.length > 0 && <div className="grid grid-cols-5 gap-1.5">{photos.map(photo => <button type="button" key={photo.view} onClick={() => setEnlarged(photo.view)} className="min-w-0 text-center" aria-label={`Enlarge ${NORWOOD_GUIDES[photo.view].title.toLowerCase()} photo`}><img className="aspect-square w-full rounded-md object-cover" src={photo.url} alt={`${NORWOOD_GUIDES[photo.view].title} photo`} referrerPolicy="no-referrer" /><span className="text-[9px] text-muted-foreground">{NORWOOD_GUIDES[photo.view].title}</span></button>)}</div>}
      {session.result && <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm">AI estimate: Norwood {session.result.norwood}</strong><span className="text-[10px] uppercase text-muted-foreground">{session.result.confidence} confidence</span></div>
        <p className="text-xs">{session.result.reason}</p>
        <p className="text-[10px] text-muted-foreground">Confidence is the model’s assessment of the photos, not a measured accuracy rate.</p>
        {session.result.confidence === "low" && <p className="text-xs font-semibold text-amber-800">Low confidence — ask about it on the call</p>}
        {session.result.photo_problems.length > 0 && <ul className="list-disc pl-4 text-xs text-amber-800">{session.result.photo_problems.map((problem, i) => <li key={i}>{problem}</li>)}</ul>}
        {session.finalNorwood == null ? <p className="text-xs font-medium">Suggested below. Tap a Norwood number to confirm or change it before booking.</p> : <p className="flex items-center gap-1 text-xs text-emerald-800"><Check size={12} />Rep confirmed: Norwood {session.finalNorwood}{session.finalNorwood !== session.result.norwood ? " · AI estimate kept separately" : ""}</p>}
      </div>}
      {session.canRetry && !stopped && <button type="button" className="text-xs underline" disabled={busy} onClick={() => void retry()}>Retry estimate</button>}
      {stopped && !session.result && <p className="text-xs text-muted-foreground">Send a fresh link to continue.</p>}
    </>}
    {(error || connectionError || photoError) && <p className="text-xs text-destructive" role="alert">{error || connectionError || photoError}</p>}
    <Dialog open={Boolean(enlarged)} onOpenChange={open => { if (!open) setEnlarged(null); }}><DialogContent className="max-w-2xl"><DialogTitle>{enlarged ? NORWOOD_GUIDES[enlarged].title : "Photo"}</DialogTitle><DialogDescription>{mode === "sms" ? "Private photo for the advisory team. Photo links expire after one minute and renew while this panel is open." : "Private photo for the advisory team. These preview photos are held only in this browser tab."}</DialogDescription>{active && <img className="max-h-[75vh] w-full object-contain" src={active.url} alt={`${NORWOOD_GUIDES[active.view].title} enlarged`} referrerPolicy="no-referrer" />}</DialogContent></Dialog>
  </section>;
}
