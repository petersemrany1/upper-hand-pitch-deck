import { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronRight, RefreshCw, ShieldCheck, Sun, Timer, X } from "lucide-react";
import { NORWOOD_GUIDES, NORWOOD_VIEWS, NORWOOD_IMAGE_PIPELINE, photoQuality, type NorwoodView, type PatientNorwoodSession } from "@/lib/norwood-assessment";
import type { NorwoodPatientApi } from "@/lib/norwood-preview-session";
import "./norwood-capture.css";

export function CaptureOutline({ view }: { view: NorwoodView }) {
  const side = view === "left" || view === "right";
  return <svg className="nw-outline" viewBox="0 0 300 360" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" transform={view === "right" ? "translate(300 0) scale(-1 1)" : undefined}>
      {side ? <path d="M72 298 L80 244 Q48 204 67 133 Q78 65 155 62 Q220 64 228 128 L246 158 L225 171 Q231 193 216 201 L211 230 Q203 246 177 244 L174 298 M146 174 C118 150 114 211 141 207" />
        : view === "front" ? <><path d="M83 304 L86 270 Q57 234 60 166 Q56 72 150 63 Q244 72 240 166 Q243 234 214 270 L217 304" /><path d="M65 144 Q89 107 111 119 Q150 92 189 119 Q211 107 235 144" /></>
          : <><ellipse cx="150" cy="179" rx="97" ry="121" />{view === "crown" ? <circle cx="150" cy="165" r="43" /> : <path d="M65 237 Q150 275 235 237 M150 66 L150 289" />}</>}
    </g>
  </svg>;
}

type Preview = { dataUrl: string; problem: string | null };
function preparePhoto(source: CanvasImageSource, width: number, height: number): Preview {
  if (Math.min(width, height) < 480) throw new Error("Please use a larger, clearer photo with your head in view.");
  const canvas = document.createElement("canvas"), scale = Math.min(1, NORWOOD_IMAGE_PIPELINE.maxDimension / Math.max(width, height));
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Camera preview is unavailable. Try your phone's camera option below.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const sample = document.createElement("canvas"); sample.width = 256; sample.height = 256;
  const sc = sample.getContext("2d")!;
  const crop = Math.min(canvas.width, canvas.height);
  sc.drawImage(canvas, (canvas.width - crop) / 2, (canvas.height - crop) / 2, crop, crop, 0, 0, 256, 256);
  // Re-encoding removes camera EXIF/location metadata; never upload the original file.
  return { dataUrl: canvas.toDataURL("image/jpeg", NORWOOD_IMAGE_PIPELINE.jpegQuality), problem: photoQuality(sc.getImageData(0, 0, 256, 256).data, 256, 256) };
}

export default function PatientNorwoodCapture({ api, linkToken, mode = "local" }: { api: NorwoodPatientApi; linkToken: string; mode?: "local" | "private" }) {
  const { analysePatientNorwood, consentPatientNorwood, openPatientNorwood, uploadPatientNorwood } = api;
  const [token, setToken] = useState("");
  const [session, setSession] = useState<PatientNorwoodSession | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false), [cameraReady, setCameraReady] = useState(false);
  const [accepted, setAccepted] = useState(false), [preview, setPreview] = useState<Preview | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState("");
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const activeToken = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisStarted = useRef(false);
  const busyRef = useRef(busy); busyRef.current = busy;
  const view = NORWOOD_VIEWS.find(v => !session?.views.includes(v)) ?? "crown";
  const guide = NORWOOD_GUIDES[view];
  const finished = session?.status === "ready";
  const allPhotos = session?.views.length === 5;
  const expired = Boolean(session && Date.parse(session.expiresAt) <= Date.now());

  function stopCamera() {
    cameraRequest.current++;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCameraReady(false);
    if (timer.current) clearTimeout(timer.current); setCountdown(null);
  }
  useEffect(() => {
    let generation = 0;
    async function loadLink() {
      const current = ++generation;
      const value = linkToken;
      activeToken.current = value;
      stopCamera(); setSession(null); setPreview(null); setError(""); setLoading(true); setUnavailable(false);
      setBusy(false);
      setAccepted(false); analysisStarted.current = false;
      if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
        setToken(""); setError("This link is incomplete. Ask your advisor to send a new one."); setLoading(false); return;
      }
      setToken(value);
      try {
        const result = await openPatientNorwood({ data: { token: value } });
        if (current !== generation) return;
        if (result.ok) setSession(result.data); else setError(result.error);
      } catch { if (current === generation) setError("We couldn't open your link. Check your connection and reload."); }
      finally { if (current === generation) setLoading(false); }
    }
    void loadLink(); window.addEventListener("hashchange", loadLink);
    const pause = () => { if (document.hidden) stopCamera(); };
    document.addEventListener("visibilitychange", pause);
    return () => { generation++; activeToken.current = ""; cameraRequest.current++; document.removeEventListener("visibilitychange", pause); window.removeEventListener("hashchange", loadLink); stream.current?.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current); };
  }, [api, linkToken]);

  // Polling survives reloads and lets the patient see an analysis retried by their rep.
  useEffect(() => {
    if (!token || !session || finished || unavailable) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (busyRef.current) return;
      try {
        const result = await openPatientNorwood({ data: { token } });
        if (cancelled || busyRef.current) return;
        if (result.ok) { setSession(result.data); if (result.data.status === "ready") setError(""); }
        else { setError(result.error); if (result.error.startsWith("This link has expired")) { setUnavailable(true); stopCamera(); } }
      } catch { /* Action errors remain visible; the next poll recovers a lost connection. */ }
    }, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [token, Boolean(session), finished, unavailable]);

  async function runAnalysis() {
    analysisStarted.current = true; stopCamera(); setBusy(true); setError("");
    setSession(prev => prev ? { ...prev, status: "analysing", canRetry: false } : prev);
    try {
      const result = await analysePatientNorwood({ data: { token } });
      if (activeToken.current !== token) return;
      if (result.ok) setSession(result.data); else setError(result.error);
    } catch { if (activeToken.current === token) setError("Your photos are saved. Check your connection; your advisor can also retry the estimate."); }
    finally { if (activeToken.current === token) setBusy(false); }
  }
  useEffect(() => {
    if (token && session?.status === "photos_in" && !analysisStarted.current) void runAnalysis();
  }, [token, session?.status]);

  // Reattach the existing stream when the preview is dismissed and video remounts.
  useEffect(() => {
    if (!preview && video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => {}); }
  }, [preview, session?.consented, cameraReady]);

  async function startCamera() {
    setCameraError("");
    const request = ++cameraRequest.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
      stream.current?.getTracks().forEach(t => t.stop());
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1536 }, height: { ideal: 1536 } }, audio: false });
      if (request !== cameraRequest.current) { acquired.getTracks().forEach(t => t.stop()); return; }
      stream.current = acquired;
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); }
      setCameraReady(true);
    } catch { setCameraError("The live camera couldn't open. Allow camera access, or use your phone camera below."); }
  }
  async function begin() {
    setBusy(true); setError("");
    try {
      const result = await consentPatientNorwood({ data: { token } });
      if (activeToken.current !== token) return;
      if (!result.ok) { setError(result.error); return; }
      setSession(result.data); await startCamera();
    } catch { if (activeToken.current === token) setError("We couldn't start. Check your connection and try again."); }
    finally { if (activeToken.current === token) setBusy(false); }
  }
  function takePhoto() {
    setError("");
    const capture = () => {
      setCountdown(null);
      try {
        if (!video.current || !video.current.videoWidth) throw new Error("Wait for the camera to focus, then try again.");
        setPreview(preparePhoto(video.current, video.current.videoWidth, video.current.videoHeight));
      } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    };
    let remaining = 5; setCountdown(remaining);
    const tick = () => { remaining--; if (remaining === 0) capture(); else { setCountdown(remaining); timer.current = setTimeout(tick, 1000); } };
    timer.current = setTimeout(tick, 1000);
  }
  async function choosePhoto(file?: File) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setError("That file is too large. Please take a new photo."); return; }
    setError(""); setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (activeToken.current !== token) return;
      setPreview(preparePhoto(img, img.naturalWidth, img.naturalHeight));
    } catch { if (activeToken.current === token) setError("We couldn't read this photo. Try taking it with the live camera or choose a JPEG."); }
    finally { URL.revokeObjectURL(url); if (activeToken.current === token) setBusy(false); }
  }
  async function usePhoto() {
    if (!preview || preview.problem) return;
    setBusy(true); setError("");
    try {
      const result = await uploadPatientNorwood({ data: { token, view, photo: preview.dataUrl.split(",")[1] } });
      if (activeToken.current !== token) return;
      if (!result.ok) { setError(result.error); return; }
      setSession(result.data); setPreview(null);
      if (result.data.views.length === 5) stopCamera();
    } catch { if (activeToken.current === token) setError("Your photo hasn't uploaded. Check your connection and try again."); }
    finally { if (activeToken.current === token) setBusy(false); }
  }

  return <main className="nw-page">
    <div className="nw-shell">
      <header className="nw-brand"><span className="nw-brand-mark" aria-hidden="true">{session?.clinicName.slice(0, 1) || "H"}</span><span>{session?.clinicName || "Your photo check"}<small>GUIDED HAIR PHOTOS</small></span><ShieldCheck size={22} aria-label="Private link" /></header>
      {loading ? <div className="nw-state" role="status"><span className="nw-spinner" />Opening your private link…</div>
        : !session ? <div className="nw-card"><h1>Let’s get you connected</h1><p role="alert">{error}</p><p>Your advisor can send a fresh link while you’re on the call.</p></div>
          : expired ? <div className="nw-card"><h1>This link has expired</h1><p>Ask your advisor for a fresh link. It only takes a moment.</p></div>
            : unavailable ? <div className="nw-card"><h1>Let’s use a fresh link</h1><p>{error}</p></div>
            : finished ? <div className="nw-card nw-result"><span className="nw-success"><Check size={28} /></span><p className="nw-eyebrow">YOUR PHOTO CHECK IS COMPLETE</p><h1>Your estimate:<br /><strong>Norwood {session.estimate}</strong></h1><p>This is an estimate from your photos. Your doctor will confirm at your consult.</p><div className="nw-note">{session.needsReview ? "These photos leave some uncertainty. Your advisor needs to check this estimate with you on the call." : "Your advisor has your result and will check it with you on the call."}</div></div>
              : !session.consented ? <div className="nw-card">
                <p className="nw-eyebrow">FIVE PHOTOS. ONE SIMPLE CHECK.</p><h1>A clearer picture,<br />while we chat.</h1><p>Take a few guided photos of your hair. Your advisor will see an AI estimate and check it with you.</p>
                <div className="nw-tips"><Sun size={24} /><div><strong>A little preparation helps</strong><ul><li>Choose a bright room with even light.</li><li>Keep your hair dry, with no hat or hair fibres.</li><li>Push your fringe back to show your hairline.</li><li>Sit down. We’ll guide you through each angle.</li></ul></div></div>
                <div className="nw-angles">{NORWOOD_VIEWS.map((v, i) => <span key={v}><b>{i + 1}</b>{NORWOOD_GUIDES[v].title}</span>)}</div>
                <label className="nw-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>{mode === "private" ? "I agree to these five photos being stored privately for the advisory team and sent to Anthropic for an AI estimate. The photos will not be sent to the clinic." : "I agree to send these five photos to Anthropic for a test AI estimate. The preview keeps the photos in this browser tab and does not save them to patient records or send them to a clinic."}</span></label>
                {error && <p className="nw-error" role="alert">{error}</p>}
                <button className="nw-primary" disabled={!accepted || busy} onClick={() => void begin()}>{busy ? "Starting…" : "Start my photos"}<ChevronRight size={20} /></button><p className="nw-footnote">{mode === "private" ? "Private link · Expires 2 hours after it was sent." : "Preview session · Photos clear when this tab closes or you reset."}</p>
              </div>
                : allPhotos ? <div className="nw-card nw-result" aria-live="polite">{session.status !== "failed" && <span className="nw-spinner" />}<h1>{session.status === "failed" ? "Let’s check this together" : "Analysing…"}</h1><p>All five photos are saved. Stay on the call — your advisor will see the result too.</p>{error && <p className="nw-error" role="alert">{error}</p>}{session.canRetry && <button className="nw-primary" disabled={busy} onClick={() => void runAnalysis()}>Try the estimate again</button>}{session.status === "failed" && !session.canRetry && <p>Your advisor can review the photos with you.</p>}</div>
                  : <div className="nw-card nw-capture">
                    <div className="nw-progress" aria-label={`${session.views.length} of 5 photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={session.views.includes(v) ? "done" : v === view ? "current" : ""} />)}</div>
                    <p className="nw-eyebrow">PHOTO {session.views.length + 1} OF 5</p><h1>{guide.title}</h1><p>{guide.instruction}</p>
                    <div className="nw-camera">
                      {preview ? <img src={preview.dataUrl} alt={`Your ${guide.title.toLowerCase()} photo`} /> : <><video ref={video} autoPlay playsInline muted aria-label="Live selfie camera" /><CaptureOutline view={view} />{!cameraReady && <div className="nw-camera-placeholder"><Camera size={32} /><span>Line your head up with the guide</span></div>}</>}
                      {countdown !== null && <div className="nw-countdown" role="status" aria-live="assertive">{countdown}</div>}
                      <span className="nw-camera-label">{preview ? "Check your photo" : "Keep your head inside the guide"}</span>
                    </div>
                    <p className="nw-tip"><Timer size={18} />{guide.tip}</p>
                    {cameraError && !preview && <p className="nw-note">{cameraError}</p>}
                    {preview?.problem && <p className="nw-error" role="alert">{preview.problem}</p>}
                    {error && <p className="nw-error" role="alert">{error}</p>}
                    {preview ? <><button className="nw-primary" disabled={busy || Boolean(preview.problem)} onClick={() => void usePhoto()}>{busy ? "Saving photo…" : session.views.length === 4 ? "Use photo & get estimate" : "Use photo & continue"}<ChevronRight size={18} /></button><button className="nw-secondary" disabled={busy} onClick={() => { setPreview(null); setError(""); }}><RefreshCw size={16} />Retake photo</button></>
                      : <>{countdown !== null ? <button className="nw-secondary" onClick={() => { if (timer.current) clearTimeout(timer.current); setCountdown(null); }}><X size={18} />Cancel timer</button>
                        : <button className="nw-primary" disabled={busy} onClick={() => cameraReady ? takePhoto() : void startCamera()}><Camera size={20} />{cameraReady ? "Take photo · 5-second timer" : "Open selfie camera"}</button>}
                        <label className={`nw-secondary nw-file ${busy || countdown !== null ? "disabled" : ""}`}>Use phone camera or choose photo<input type="file" accept="image/*" capture="user" disabled={busy || countdown !== null} onChange={e => { void choosePhoto(e.target.files?.[0]); e.target.value = ""; }} /></label></>}
                  </div>}
      <footer className="nw-footer"><ShieldCheck size={14} />{mode === "private" ? "Private photos · Shared only with your advisory team" : "Preview only · No patient records or messages"}</footer>
    </div>
  </main>;
}
