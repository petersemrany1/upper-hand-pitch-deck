import { useEffect, useRef, useState } from "react";
import { Camera, Check, Square } from "lucide-react";
import { NORWOOD_VIEWS, type NorwoodView } from "@/lib/norwood-assessment";
import { NORWOOD_SCAN_MAX_FRAMES, NORWOOD_SCAN_SECONDS, nextNorwoodScan, pendingScanViews, type NorwoodScan } from "@/lib/norwood-video-scan";
import type { NorwoodPatientApi } from "@/lib/norwood-preview-session";
import NorwoodPoseGuide, { CAPTURE_STEPS } from "./NorwoodPoseGuide";
import { prepareNorwoodPhoto } from "./useNorwoodCamera";

type Frame = { small: string; photo: string };
type Phase = "setup" | "opening" | "countdown" | "scanning" | "checking";

function ScanDemo({ scan, single }: { scan: NorwoodScan; single?: NorwoodView }) {
  if (single) return <NorwoodPoseGuide view={single} large />;
  return <div className="nw-scan-demo">
    {scan === "upper" ? <svg viewBox="0 0 260 150" role="img" aria-label="Keep the phone still in front of your forehead. Look ahead, then bow your head towards it and back up.">
      <g stroke="#345b50" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M33 144 Q35 104 76 105 Q115 106 128 144" fill="#dce6dd" />
        <g className="nw-scan-bow">
          <path d="M55 105 L55 83 Q35 60 48 34 Q66 12 95 22 Q112 30 112 50 L124 63 L110 70 L109 88 Q102 98 85 93 L85 111" fill="#f2d9bd" />
          <path d="M44 55 Q35 22 70 18 Q98 11 111 38 L95 34 L84 49 L69 39 L62 66" fill="#8ba481" />
          <circle cx="102" cy="52" r="2" fill="#345b50" /><path d="M70 64 Q57 52 59 72 Q61 80 70 77" fill="none" />
        </g>
        <path d="M65 133 Q155 149 196 76" fill="none" stroke="#e1c5a5" strokeWidth="13" />
        <rect x="190" y="28" width="29" height="57" rx="5" fill="#345b50" /><path d="M194 37 V74" stroke="#e5f2d5" />
        <path d="M185 32 L134 22 M185 78 L133 92" stroke="#8cae75" strokeDasharray="4 5" fill="none" />
      </g>
      <text x="193" y="17" textAnchor="middle" fill="#456448" fontSize="11">Keep phone here</text>
    </svg> : <svg viewBox="0 0 260 150" role="img" aria-label="Keep the phone in front. Slowly turn your nose to your right, then to your left.">
      {[0, 1].map(i => <g key={i} className={i === 0 ? "nw-scan-profile-one" : "nw-scan-profile-two"} transform={i === 0 ? "translate(115 0) scale(-1 1)" : "translate(145 0)"} stroke="#345b50" strokeWidth="2.5" strokeLinejoin="round">
        <path d="M24 119 L27 88 Q8 56 24 28 Q44 7 72 20 Q88 30 86 50 L98 64 L85 70 L83 87 Q76 98 58 93 L58 119" fill="#f2d9bd" />
        <path d="M22 59 Q11 23 47 14 Q76 9 86 35 L68 31 L55 53 L40 44 L35 71" fill="#8ba481" /><path d="M49 68 Q32 54 35 76 Q37 85 49 81" fill="none" />
      </g>)}
      <path d="M116 64 H143 M138 59 L143 64 L138 69" stroke="#70914e" strokeWidth="3" fill="none" />
      <text x="66" y="140" textAnchor="middle" fill="#456448" fontSize="12">Your nose → right</text><text x="193" y="140" textAnchor="middle" fill="#456448" fontSize="12">Then → left</text>
    </svg>}
  </div>;
}

export default function NorwoodVideoScan({ api, token, views, save }: {
  api: NorwoodPatientApi; token: string; views: NorwoodView[]; save: (photo: string, view: NorwoodView) => Promise<void>;
}) {
  const scan = nextNorwoodScan(views), pending = pendingScanViews(scan, views);
  const single = pending.length === 1 ? pending[0] : undefined;
  const [phase, setPhase] = useState<Phase>("setup"), [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [cameraFailed, setCameraFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0), cameraRequest = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frames = useRef<Frame[]>([]), latest = useRef({ views, save }); latest.current = { views, save };
  const working = phase !== "setup";

  function cancel() {
    epoch.current++; cameraRequest.current++;
    if (timer.current) clearTimeout(timer.current);
    frames.current = []; setPhase("setup"); setSeconds(0);
  }
  function release() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }
  useEffect(() => {
    cancel(); setMessage("");
    const hide = () => { if (document.hidden) { cancel(); release(); setMessage("Scan paused. Tap Start when you’re ready."); } };
    document.addEventListener("visibilitychange", hide);
    return () => { epoch.current++; cameraRequest.current++; if (timer.current) clearTimeout(timer.current); frames.current = []; release(); document.removeEventListener("visibilitychange", hide); };
  }, [token]);
  useEffect(() => { cancel(); setMessage(""); }, [scan]);

  function sample() {
    const el = video.current;
    if (!el || el.paused || !el.videoWidth) throw new Error("Keep your head in view and try again.");
    // Both resolutions come from precisely the same instant. The original video
    // is never recorded; only a bounded set of stills lives temporarily in memory.
    const snapshot = document.createElement("canvas"); snapshot.width = el.videoWidth; snapshot.height = el.videoHeight;
    const ctx = snapshot.getContext("2d"); if (!ctx) throw new Error("Camera unavailable.");
    ctx.drawImage(el, 0, 0);
    return { small: prepareNorwoodPhoto(snapshot, snapshot.width, snapshot.height, true), photo: prepareNorwoodPhoto(snapshot, snapshot.width, snapshot.height) };
  }
  async function finish(run: number, problem: string) {
    const candidates = frames.current; frames.current = []; setPhase("checking"); setSeconds(0);
    setMessage("Scan finished. Look back at your screen.");
    try {
      if (!candidates.length) throw new Error(problem || "We need a clearer view. Try the movement again.");
      const result = await api.selectPatientNorwoodFrames!({ data: { token, scan, frames: candidates.map(f => f.small) } });
      if (run !== epoch.current) return;
      if (!result.ok) throw new Error(result.error);
      const saved: NorwoodView[] = []; let issue = "";
      for (const choice of result.data) {
        if (run !== epoch.current) return;
        if (!pending.includes(choice.view) || !candidates[choice.frame]) continue;
        try {
          // Full-resolution framing/quality is checked server-side before storage.
          await latest.current.save(candidates[choice.frame].photo, choice.view); saved.push(choice.view);
        } catch (error) { issue = error instanceof Error ? error.message : "That angle needs another try."; }
      }
      if (run !== epoch.current) return;
      const missing = pending.filter(v => !saved.includes(v));
      setMessage(missing.length ? (issue || `Still need: ${missing.map(v => CAPTURE_STEPS[v].title.toLowerCase()).join(" + ")}. Try only the missing angle${missing.length > 1 ? "s" : ""}.`) : "Photos saved.");
      setPhase("setup");
    } catch (error) {
      if (run !== epoch.current) return;
      setMessage(error instanceof Error ? error.message : "Check your connection, then try again."); setPhase("setup");
    } finally { candidates.length = 0; }
  }
  function record(run: number) {
    setPhase("scanning"); setSeconds(NORWOOD_SCAN_SECONDS); setMessage("Slowly follow the movement shown.");
    const started = performance.now(); let problem = "", attempts = 0;
    const tick = () => {
      if (run !== epoch.current || document.hidden) return;
      const elapsed = performance.now() - started;
      if (elapsed >= NORWOOD_SCAN_SECONDS * 1000) { void finish(run, problem); return; }
      if (attempts < NORWOOD_SCAN_MAX_FRAMES) {
        attempts++;
        try { frames.current.push(sample()); } catch (error) { problem = error instanceof Error ? error.message : "Please try again."; }
      }
      setSeconds(Math.max(1, NORWOOD_SCAN_SECONDS - Math.floor(elapsed / 1000)));
      timer.current = setTimeout(tick, 700);
    };
    tick();
  }
  async function start() {
    cancel(); const run = ++epoch.current, request = ++cameraRequest.current;
    setCameraFailed(false); setMessage(""); setPhase("opening");
    try {
      if (!stream.current?.active) {
        const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1536 }, height: { ideal: 1536 } }, audio: false });
        if (request !== cameraRequest.current || run !== epoch.current) { acquired.getTracks().forEach(t => t.stop()); return; }
        stream.current = acquired;
      }
      if (!video.current) throw new Error("Camera unavailable");
      video.current.srcObject = stream.current; await video.current.play();
      if (run !== epoch.current) return;
      let remaining = 3; setSeconds(remaining); setPhase("countdown"); setMessage(single ? "Get ready. Hold the pose shown." : "Get ready. Start by looking at the camera.");
      const tick = () => { if (run !== epoch.current) return; remaining--; if (!remaining) record(run); else { setSeconds(remaining); timer.current = setTimeout(tick, 1000); } };
      timer.current = setTimeout(tick, 1000);
    } catch { if (run === epoch.current) { setPhase("setup"); setCameraFailed(true); setMessage("Allow camera access and try again, or use your phone camera below."); } }
  }
  async function choose(file?: File) {
    if (!file || !pending[0]) return;
    cancel(); const run = ++epoch.current; setPhase("checking");
    const url = URL.createObjectURL(file);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a smaller photo or take a new one.");
      const img = new Image(); img.src = url; await img.decode();
      if (run !== epoch.current) return;
      await latest.current.save(prepareNorwoodPhoto(img, img.naturalWidth, img.naturalHeight), pending[0]);
    } catch (error) { if (run === epoch.current) setMessage(error instanceof Error ? error.message : "Use a JPEG photo."); }
    finally { URL.revokeObjectURL(url); if (run === epoch.current) setPhase("setup"); }
  }

  const title = single ? CAPTURE_STEPS[single].title : scan === "upper" ? "Look down, then back up" : "Turn from side to side";
  const instruction = single ? CAPTURE_STEPS[single].move : scan === "upper" ? "Push hair back. Phone at forehead height. Slowly bow towards it, then look up." : "Keep the phone in front. Slowly turn your nose right, then left.";
  return <div className="nw-card nw-capture nw-scan">
    <div className="nw-step-row"><span>{views.length} of 5 photos saved</span><span>Silent camera scan</span></div>
    <div className="nw-progress" aria-label={`${views.length} of 5 photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={views.includes(v) ? "done" : pending.includes(v) ? "current" : ""} />)}</div>
    <h1>{title}</h1><p className="nw-instruction">{instruction}</p>
    <div className={`nw-scan-stage ${phase === "setup" || phase === "opening" ? "preparing" : ""}`}>
      <video ref={video} autoPlay playsInline muted aria-label="Silent live camera" />
      {(phase === "setup" || phase === "opening") && <div className="nw-scan-lesson"><ScanDemo scan={scan} single={single} /><p>{single ? `We need: ${CAPTURE_STEPS[single].target.toLowerCase()}.` : scan === "upper" ? "Look ahead → look down → back up" : "Right side → left side"}</p><small>Move slowly for a few seconds. We pick the photos.</small></div>}
      {phase === "countdown" && <div className="nw-countdown"><span>{seconds}<small>Get ready</small></span></div>}
      {phase === "scanning" && <><span className="nw-scan-live"><span />Scanning · {seconds}s</span><span className="nw-camera-label">{single ? CAPTURE_STEPS[single].target : scan === "upper" ? "Slowly bow forward, then look back up" : "Slowly turn right, then left"}</span></>}
      {phase === "checking" && <div className="nw-checking"><Check size={28} /><strong>You can look up now</strong><span className="nw-spinner" /><span>Finding your clearest photos…</span></div>}
    </div>
    <p className="nw-feedback" role="status" aria-live="polite">{message || "Stay on your call. No sound or video recording."}</p>
    {working ? <button className="nw-primary" disabled={phase === "checking"} onClick={() => { cancel(); release(); setMessage("Scan stopped. Tap Start to try again."); }}><Square size={16} />{phase === "checking" ? "Checking the photos…" : "Stop scan"}</button>
      : <button className="nw-primary" onClick={() => void start()}><Camera size={18} />{views.length === 0 ? "Start first scan" : views.length === 3 && scan === "sides" ? "Scan both sides" : "Scan missing angle"}</button>}
    {cameraFailed && <label className="nw-file-fallback">Use phone camera for {CAPTURE_STEPS[pending[0]].title.toLowerCase()}<input type="file" accept="image/*" capture="user" disabled={working} onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }} /></label>}
  </div>;
}
