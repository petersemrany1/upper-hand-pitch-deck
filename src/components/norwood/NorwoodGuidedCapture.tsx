import { useEffect, useRef, useState } from "react";
import { Camera, Pause, Play, RotateCcw, SwitchCamera } from "lucide-react";
import { NORWOOD_VIEWS, type NorwoodView } from "@/lib/norwood-assessment";
import type { NorwoodPhotoCheck } from "@/lib/norwood-photo-check";
import NorwoodPoseGuide from "./NorwoodPoseGuide";
import { prepareNorwoodPhoto } from "./useNorwoodCamera";

export const GUIDED_POSES: Record<NorwoodView, { title: string; hint: string }> = {
  front: { title: "Face the camera", hint: "Hair back. Show your whole hairline." },
  top: { title: "Look down", hint: "Phone above your forehead, pointing down." },
  crown: { title: "Chin to chest", hint: "Phone above your head, pointing down." },
  left: { title: "Turn your head right", hint: "Keep the phone in front. Show your ear." },
  right: { title: "Turn your head left", hint: "Keep the phone in front. Show your other ear." },
};
type Phase = "opening" | "position" | "checking" | "paused" | "error";

/** One pose at a time. The server checks and saves exactly the still we send. */
export default function NorwoodGuidedCapture({ token, views, capture }: {
  token: string; views: NorwoodView[];
  capture: (photo: string, view: NorwoodView) => Promise<NorwoodPhotoCheck>;
}) {
  const view = NORWOOD_VIEWS.find(v => !views.includes(v)) ?? "right";
  const [phase, setPhase] = useState<Phase>("opening"), [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null), [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [still, setStill] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequest = useRef(false), retained = useRef<string | null>(null), misses = useRef(0);
  const latest = useRef({ capture, view }); latest.current = { capture, view };
  function clear() { epoch.current++; if (timer.current) clearTimeout(timer.current); setCountdown(null); retained.current = null; setStill(null); }
  function release() { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setReady(false); }
  function pause() { clear(); release(); setPhase("paused"); setMessage("Paused. Your saved photos are kept."); }

  async function check(photo: string, run: number) {
    if (run !== epoch.current || activeRequest.current) return;
    activeRequest.current = true; setPhase("checking"); setCountdown(null); setStill(photo);
    setMessage("Photo captured. You can look up.");
    try {
      const result = await latest.current.capture(photo, latest.current.view);
      if (run !== epoch.current) return;
      retained.current = null; setStill(null);
      if (result.ready) { setMessage("Photo saved"); return; } // next view comes from the saved server session
      misses.current++;
      setMessage(result.message);
      if (misses.current >= 4 || !stream.current?.active) { setPhase("paused"); release(); return; }
      setPhase("position"); countdownToCapture(run, 6);
    } catch (error) {
      if (run !== epoch.current) return;
      // Keep this still for a service/upload retry, never ask for another pose
      // because the server or network failed. Memory only; cleared on hide/exit.
      retained.current = photo; setPhase("error");
      setMessage(error instanceof Error ? error.message : "Connection interrupted. Tap Retry.");
      release();
    } finally { activeRequest.current = false; }
  }
  function countdownToCapture(run: number, seconds: number) {
    setCountdown(seconds);
    const tick = () => {
      if (run !== epoch.current || document.hidden) return;
      if (activeRequest.current) { timer.current = setTimeout(tick, 500); return; }
      seconds--; setCountdown(seconds || null);
      if (seconds > 0) { timer.current = setTimeout(tick, 1000); return; }
      const el = video.current;
      try {
        if (!el || el.paused || !el.videoWidth) throw new Error("Camera paused. Tap Retry or use Phone camera.");
        // Do not reject a smooth bald scalp using a generic edge-count heuristic.
        // Full-resolution blur, light and anatomy are checked server-side once.
        void check(prepareNorwoodPhoto(el, el.videoWidth, el.videoHeight, false, false), run);
      } catch (error) {
        setPhase("error"); release(); setMessage(error instanceof Error ? error.message : "Tap Retry to reopen the camera.");
      }
    };
    timer.current = setTimeout(tick, 1000);
  }
  async function open(nextFacing = facing) {
    const photo = retained.current;
    clear(); const run = epoch.current; misses.current = 0;
    if (photo) { await check(photo, run); return; }
    setPhase("opening"); setMessage("Opening camera…");
    try {
      release();
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: nextFacing }, width: { ideal: 1536 }, height: { ideal: 1536 } }, audio: false });
      if (run !== epoch.current) { acquired.getTracks().forEach(t => t.stop()); return; }
      stream.current = acquired;
      if (!video.current) throw new Error("Camera unavailable");
      video.current.srcObject = acquired; await video.current.play();
      if (run !== epoch.current) return;
      setFacing(nextFacing); setReady(true); setPhase("position"); setMessage("Get in position, then hold still.");
      countdownToCapture(run, view === "top" || view === "crown" ? 8 : 6);
    } catch { if (run === epoch.current) { release(); setPhase("error"); setMessage("Allow camera access, or use Phone camera below."); } }
  }
  useEffect(() => {
    clear(); misses.current = 0;
    if (document.hidden) { release(); setPhase("paused"); setMessage("Paused. Your saved photos are kept."); return; }
    if (!stream.current?.active) { void open(); return; }
    const run = epoch.current;
    setPhase("position"); setMessage("Next position. Hold still when ready.");
    countdownToCapture(run, view === "top" || view === "crown" ? 8 : 6);
  }, [view, token]);
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => { epoch.current++; if (timer.current) clearTimeout(timer.current); retained.current = null; stream.current?.getTracks().forEach(t => t.stop()); document.removeEventListener("visibilitychange", hide); };
  }, [token]);
  async function choose(file?: File) {
    if (!file || activeRequest.current) return;
    clear(); release(); const run = epoch.current, url = URL.createObjectURL(file);
    setPhase("checking"); setMessage("Opening photo…");
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a smaller photo.");
      const img = new Image(); img.src = url; await img.decode();
      if (run !== epoch.current) return;
      await check(prepareNorwoodPhoto(img, img.naturalWidth, img.naturalHeight, false, false), run);
    } catch (error) { if (run === epoch.current) { setPhase("error"); setMessage(error instanceof Error ? error.message : "Choose a JPEG photo."); } }
    finally { URL.revokeObjectURL(url); }
  }
  const working = phase === "position" || phase === "checking" || phase === "opening";
  return <section className="nw-card nw-guided" aria-label="Guided hair photos">
    <div className="nw-guided-progress"><span>YOUR HAIR PROFILE</span><span>{views.length} / 5</span></div>
    <div className="nw-progress" aria-label={`${views.length} of 5 photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={views.includes(v) ? "done" : v === view ? "current" : ""} />)}</div>
    <h1>{GUIDED_POSES[view].title}</h1><p className="nw-instruction">{GUIDED_POSES[view].hint}</p>
    <NorwoodPoseGuide view={view} />
    <div className={`nw-guided-camera ${facing === "user" ? "selfie" : ""}`}>
      <video ref={video} autoPlay playsInline muted aria-label="Silent live camera" />
      {still && <img src={`data:image/jpeg;base64,${still}`} alt="The photo being checked" />}
      {!ready && !still && <div className="nw-camera-placeholder"><Camera size={28} /><span>{phase === "opening" ? "Opening camera…" : "Your photos stay saved"}</span></div>}
      <div className={`nw-guide-outline nw-guide-outline-${view}`} aria-hidden="true" />
      {countdown !== null && <div className="nw-position-timer" role="status"><span>{countdown}</span><b>Hold still</b></div>}
      {phase === "checking" && <div className="nw-capture-status"><span className="nw-spinner" />Checking photo</div>}
      {ready && phase !== "checking" && <button className="nw-flip" aria-label="Switch camera" onClick={() => void open(facing === "user" ? "environment" : "user")}><SwitchCamera size={19} /></button>}
    </div>
    <p className="nw-guided-feedback" role="status" aria-live="polite">{message}</p>
    <button className={`nw-primary ${phase === "error" || phase === "paused" ? "nw-retry" : "nw-pause"}`} disabled={phase === "checking" || phase === "opening"} onClick={() => working ? pause() : void open()}>
      {phase === "checking" ? "Checking…" : phase === "opening" ? "Opening…" : working ? <><Pause size={17} />Pause</> : phase === "paused" && !misses.current ? <><Play size={19} />Resume</> : <><RotateCcw size={20} />Retry</>}
    </button>
    <label className="nw-native-camera"><Camera size={15} />Phone camera<input type="file" accept="image/*" capture="user" disabled={working} onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }} /></label>
  </section>;
}
