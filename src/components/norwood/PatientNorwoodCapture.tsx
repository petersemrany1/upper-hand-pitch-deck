import { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronRight, HelpCircle, Pause, Play, ShieldCheck, X } from "lucide-react";
import { NORWOOD_VIEWS, type NorwoodView, type PatientNorwoodSession } from "@/lib/norwood-assessment";
import type { NorwoodPatientApi } from "@/lib/norwood-preview-session";
import NorwoodPoseGuide, { CAPTURE_STEPS } from "./NorwoodPoseGuide";
import { prepareNorwoodPhoto, useNorwoodCamera } from "./useNorwoodCamera";
import NorwoodGuidedCapture from "./NorwoodGuidedCapture";
import NorwoodVideoScan from "./NorwoodVideoScan";
import hairlineScan from "@/assets/norwood-hairline-scan.jpg";
import "./norwood-capture.css";

export default function PatientNorwoodCapture({ api, linkToken: token, mode = "local" }: { api: NorwoodPatientApi; linkToken: string; mode?: "local" | "private" }) {
  const [session, setSession] = useState<PatientNorwoodSession | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false), [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false), [help, setHelp] = useState(false);
  const helpDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (help) helpDialog.current?.showModal(); }, [help]);
  const activeToken = useRef(token), busyRef = useRef(false), analysisStarted = useRef(false), sessionRevision = useRef(0);
  const view = NORWOOD_VIEWS.find(v => !session?.views.includes(v)) ?? "right";
  const guide = CAPTURE_STEPS[view];
  const finished = session?.status === "ready", allPhotos = session?.views.length === 5;
  const expired = Boolean(session && Date.parse(session.expiresAt) <= Date.now());
  const enabled = Boolean(session?.consented && !finished && !allPhotos && !unavailable && !expired);

  async function savePhoto(photo: string, captureView: NorwoodView) {
    sessionRevision.current++; busyRef.current = true; setBusy(true); setError("");
    try {
      const result = await api.uploadPatientNorwood({ data: { token, view: captureView, photo } });
      if (activeToken.current !== token) return;
      if (!result.ok) throw new Error(result.error);
      setSession(result.data);
    } finally { if (activeToken.current === token) { busyRef.current = false; setBusy(false); } }
  }
  async function capturePhoto(photo: string, captureView: NorwoodView) {
    sessionRevision.current++; busyRef.current = true;
    try {
      const result = await api.capturePatientNorwoodFrame!({ data: { token, view: captureView, photo } });
      if (activeToken.current !== token) return { ready: false, message: "Link changed." };
      if (!result.ok) throw new Error(result.error);
      if (result.data.check.ready && !result.data.session) throw new Error("Your photo could not be saved. Tap Retry.");
      if (result.data.session) setSession(result.data.session);
      return result.data.check;
    } finally { if (activeToken.current === token) busyRef.current = false; }
  }
  const camera = useNorwoodCamera({ api, token, view, enabled, save: savePhoto });

  useEffect(() => {
    let cancelled = false; activeToken.current = token;
    setSession(null); setError(""); setLoading(true); setUnavailable(false); setAccepted(false);
    analysisStarted.current = false; busyRef.current = false; setBusy(false);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setError("This link is incomplete. Ask your advisor for a new one."); setLoading(false); return; }
    void api.openPatientNorwood({ data: { token } }).then(result => {
      if (cancelled) return;
      if (result.ok) setSession(result.data); else setError(result.error);
    }).catch(() => { if (!cancelled) setError("Check your connection and reload this page."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; activeToken.current = ""; };
  }, [api, token]);

  useEffect(() => {
    if (!session || finished || unavailable) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (busyRef.current) return;
      const revision = sessionRevision.current;
      try {
        const result = await api.openPatientNorwood({ data: { token } });
        if (cancelled || busyRef.current || revision !== sessionRevision.current) return;
        if (result.ok) setSession(result.data);
        else { setError(result.error); if (result.error.startsWith("This link has expired")) setUnavailable(true); }
      } catch { /* The next poll can recover without disrupting the camera. */ }
    }, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [api, token, Boolean(session), finished, unavailable]);

  async function runAnalysis() {
    analysisStarted.current = true; sessionRevision.current++; busyRef.current = true; setBusy(true); setError("");
    setSession(prev => prev ? { ...prev, status: "analysing", canRetry: false } : prev);
    try {
      const result = await api.analysePatientNorwood({ data: { token } });
      if (activeToken.current !== token) return;
      if (result.ok) setSession(result.data); else setError(result.error);
    } catch { if (activeToken.current === token) setError("Your photos are saved. Your advisor can retry the estimate."); }
    finally { if (activeToken.current === token) { busyRef.current = false; setBusy(false); } }
  }
  useEffect(() => { if (session?.status === "photos_in" && !analysisStarted.current) void runAnalysis(); }, [token, session?.status]);

  async function begin() {
    sessionRevision.current++; busyRef.current = true; setBusy(true); setError("");
    // Open the camera from the button gesture. No frames leave the browser
    // until the consent request succeeds and the capture screen is enabled.
    const opening = (api.capturePatientNorwoodFrame || api.selectPatientNorwoodFrames) ? Promise.resolve() : camera.open();
    try {
      const result = await api.consentPatientNorwood({ data: { token } });
      if (activeToken.current !== token) return;
      if (!result.ok) { camera.stop(); setError(result.error); return; }
      setSession(result.data); await opening;
    } catch { camera.stop(); if (activeToken.current === token) setError("We couldn't start. Check your connection and try again."); }
    finally { if (activeToken.current === token) { busyRef.current = false; setBusy(false); } }
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    camera.pause();
    if (file.size > 25 * 1024 * 1024) { setError("That file is too large. Take a new photo."); return; }
    const url = URL.createObjectURL(file); sessionRevision.current++; busyRef.current = true; setBusy(true); setError("");
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (activeToken.current !== token) return;
      await savePhoto(prepareNorwoodPhoto(img, img.naturalWidth, img.naturalHeight), view);
    } catch (e) { if (activeToken.current === token) setError(e instanceof Error ? e.message : "Please choose a JPEG photo."); }
    finally { URL.revokeObjectURL(url); if (activeToken.current === token) { busyRef.current = false; setBusy(false); } }
  }
  const showHelp = () => { camera.pause(); setHelp(true); };

  return <main className="nw-page nw-premium"><div className="nw-shell">
    <header className="nw-brand"><span className="nw-brand-mark" aria-hidden="true">{session?.clinicName.slice(0, 1) || "H"}</span><span>{session?.clinicName || "Your photo check"}<small>HAIR PROFILE</small></span><ShieldCheck size={20} aria-label="Private link" /></header>
    {loading ? <div className="nw-card nw-result" role="status"><span className="nw-spinner" /><p>Opening your link…</p></div>
      : !session || unavailable || expired ? <div className="nw-card nw-result"><h1>{expired ? "This link has expired" : "Let’s get you connected"}</h1><p role="alert">{error || "Ask your advisor for a fresh link."}</p></div>
        : finished ? <div className="nw-card nw-result"><span className="nw-success"><Check size={28} /></span><h1>Your estimate:<br /><strong>Norwood {session.estimate}</strong></h1><p>This is an estimate from your photos. Your doctor will confirm at your consult.</p><p>Your advisor has your result and will check it with you.</p></div>
          : !session.consented ? <div className="nw-card nw-intro">
            <div className="nw-intro-heading"><span className="nw-eyebrow">AI-ASSISTED ASSESSMENT</span><h1>Hair <span>Profile</span></h1></div><img className="nw-intro-photo" src={hairlineScan} alt="" width={768} height={512} />
            <p className="nw-tips"><b>Tips:</b> Bright room · Dry hair · No hats</p>
            <label className="nw-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>{mode === "private" ? "I agree to camera images being checked by Anthropic AI and 5 photos being saved privately for my advisory team." : "I agree to send my photos to Anthropic AI. They stay in this tab and are not saved to patient records."}</span></label>
            {error && <p className="nw-error" role="alert">{error}</p>}
            <button className="nw-primary" disabled={!accepted || busy} onClick={() => void begin()}>{busy ? "Starting…" : "Start my scan"}<ChevronRight size={20} /></button>
          </div>
            : allPhotos ? <div className="nw-card nw-result" aria-live="polite">{session.status !== "failed" && <span className="nw-spinner" />}<h1>{session.status === "failed" ? "Let’s check this together" : "Analysing…"}</h1><p>Your advisor will see the result too.</p>{error && <p className="nw-error" role="alert">{error}</p>}{session.canRetry && <button className="nw-primary" disabled={busy} onClick={() => void runAnalysis()}>Try again</button>}{session.status === "failed" && !session.canRetry && <p>Your advisor can review the photos with you.</p>}</div>
              : api.capturePatientNorwoodFrame ? <NorwoodGuidedCapture token={token} views={session.views} capture={capturePhoto} />
              : api.selectPatientNorwoodFrames ? <NorwoodVideoScan api={api} token={token} views={session.views} save={savePhoto} />
              : <div className="nw-card nw-capture">
                <div className="nw-step-row"><span>Photo {session.views.length + 1} of 5</span><span>Silent photo check</span></div>
                <div className="nw-progress" aria-label={`${session.views.length} of 5 photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={session.views.includes(v) ? "done" : v === view ? "current" : ""} />)}</div>
                <h1>{guide.title}</h1><p className="nw-instruction">{guide.move}</p>
                <NorwoodPoseGuide view={view} />
                <div className="nw-camera">
                  <video ref={camera.video} autoPlay playsInline muted aria-label="Live selfie camera" />
                  <div className={`nw-frame nw-frame-${view}`} aria-hidden="true" />
                  {!camera.ready && <div className="nw-camera-placeholder"><Camera size={30} /><span>Open your camera below</span></div>}
                  <span className="nw-camera-label">{guide.target}</span>
                  {camera.countdown !== null && <div className="nw-countdown" role="status">{camera.countdown}</div>}
                  {(busy || camera.phase === "saving") && <div className="nw-checking"><span className="nw-spinner" />Checking photo…</div>}
                </div>
                <p className={`nw-feedback ${error ? "nw-feedback-error" : ""}`} role="status" aria-live="polite">{error || camera.message}</p>
                {!camera.ready ? <button className="nw-primary" disabled={busy} onClick={() => void camera.open()}><Camera size={18} />Open camera</button>
                  : <button className="nw-primary" disabled={busy || camera.phase === "saving"} onClick={api.checkPatientNorwoodFrame ? camera.togglePause : camera.manual}>{api.checkPatientNorwoodFrame ? camera.paused ? <><Play size={18} />Resume automatic photos</> : <><Pause size={18} />Pause automatic photos</> : "Start 5-second timer"}</button>}
                <div className="nw-tools"><button onClick={showHelp} disabled={busy}><HelpCircle size={16} />Show me how</button><label className={busy ? "disabled" : ""}><Camera size={16} />Phone camera<input type="file" accept="image/*" capture="user" disabled={busy} onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = ""; }} /></label></div>
              </div>}
    <footer className="nw-footer"><ShieldCheck size={12} />Private photos · Your advisory team only</footer>
    {help && <dialog ref={helpDialog} className="nw-help" onCancel={() => setHelp(false)} aria-label={`How to photograph ${guide.title}`}><button autoFocus className="nw-close" aria-label="Close guide" onClick={() => setHelp(false)}><X size={20} /></button><h1>{guide.title}</h1><NorwoodPoseGuide view={view} large /><p>{guide.move}</p><p className="nw-help-target">Photo needs: <b>{guide.target}</b></p>{(view === "top" || view === "crown") && <p>Keep the phone in front. Bow your head towards the camera.</p>}<button className="nw-primary" onClick={() => { setHelp(false); if (camera.paused) camera.togglePause(); }}>Got it</button></dialog>}
  </div></main>;
}
