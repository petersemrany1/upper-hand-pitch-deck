import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, RotateCcw, X } from "lucide-react";
import { NORWOOD_VIEWS, type NorwoodView } from "@/lib/norwood-assessment";
import type { NorwoodPhotoCheck } from "@/lib/norwood-photo-check";
import { NorwoodCaptureController, type CaptureState } from "@/lib/norwood-capture-controller";
import NorwoodPositionGuide, { HAIR_POSITIONS } from "./NorwoodPositionGuide";
import { openNorwoodCamera } from "./norwood-camera";
import { prepareNorwoodPhoto } from "./useNorwoodCamera";
import "./norwood-guided.css";

export default function NorwoodGuidedCapture({ token, views, capture }: {
  token: string; views: NorwoodView[];
  capture: (photo: string, view: NorwoodView, alternatives?: string[]) => Promise<NorwoodPhotoCheck>;
}) {
  const view = NORWOOD_VIEWS.find(v => !views.includes(v)) ?? "right";
  const [state, setState] = useState<CaptureState>({ phase: "guide", seconds: null, message: "" });
  const [fileBusy, setFileBusy] = useState(false), [fileError, setFileError] = useState("");
  const video = useRef<HTMLVideoElement>(null), controller = useRef<NorwoodCaptureController | null>(null);
  const latestCapture = useRef(capture); latestCapture.current = capture;
  const fileRun = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const current = new NorwoodCaptureController(view, {
      open: signal => openNorwoodCamera(video.current!, signal),
      check: (photos, selectedView) => latestCapture.current(photos[0], selectedView, photos.slice(1)),
      change: setState,
    });
    controller.current = current; setState(current.state); setFileError(""); setFileBusy(false);
    heading.current?.focus({ preventScroll: true });
    const hide = () => { if (document.hidden) { fileRun.current++; setFileBusy(false); current.pause(); } };
    document.addEventListener("visibilitychange", hide);
    return () => { fileRun.current++; current.dispose(); document.removeEventListener("visibilitychange", hide); };
  }, [view, token]);
  async function choose(file?: File) {
    if (!file || fileBusy) return;
    const run = ++fileRun.current; setFileBusy(true); setFileError("");
    const url = URL.createObjectURL(file);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a smaller photo.");
      const img = new Image(); img.src = url; await img.decode();
      if (run !== fileRun.current) return;
      const photo = prepareNorwoodPhoto(img, img.naturalWidth, img.naturalHeight, false, false);
      setFileBusy(false); await controller.current?.usePhoto(photo);
    } catch { if (run === fileRun.current) setFileError("That photo could not open. Take a new one."); }
    finally { URL.revokeObjectURL(url); if (run === fileRun.current) setFileBusy(false); }
  }
  const { phase, seconds } = state, pose = HAIR_POSITIONS[view];
  const live = phase === "camera" || phase === "countdown";
  const waiting = phase === "opening" || phase === "checking" || fileBusy;
  const retry = ["retake", "connection", "camera_error"].includes(phase);
  const timerSeconds = view === "top" || view === "crown" ? 8 : 5;
  function primary() {
    setFileError("");
    if (phase === "camera") void controller.current?.take();
    else if (phase === "connection") void controller.current?.retryConnection();
    else void controller.current?.open();
  }
  return <section className="nw-card nw-easy" aria-label="Guided hair photos">
    <div className="nw-easy-progress"><span>Photo {views.length + 1} of 5</span><div aria-label={`${views.length} photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={views.includes(v) ? "done" : v === view ? "current" : ""}/>)}</div></div>
    <h1 ref={heading} tabIndex={-1}>{phase === "checking" ? "You can relax" : phase === "connection" ? "Let’s reconnect" : pose.title}</h1>
    <p className="nw-easy-instruction" role="status">{fileError || state.message || (phase === "checking" ? "Choosing your clearest photo…" : live ? pose.live : pose.instruction)}</p>
    <div className={`nw-easy-stage ${live ? "is-live" : ""}`}>
      <video ref={video} autoPlay playsInline muted aria-label="Live selfie camera"/>
      {!live && !waiting && phase !== "connection" && <NorwoodPositionGuide view={view}/>}
      {(waiting || phase === "connection") && <div className="nw-easy-wait">{phase === "connection" ? <RotateCcw size={38}/> : <span className="nw-spinner"/>}<span>{fileBusy ? "Opening photo…" : phase === "opening" ? "Opening camera…" : phase === "connection" ? "Your captured photo is ready to retry." : "Checking this angle"}</span></div>}
      {live && <button className="nw-easy-back" aria-label="Back to position guide" onClick={() => controller.current?.pause()}><X size={22}/></button>}
      {phase === "countdown" && <div className="nw-easy-countdown" role="status"><strong>{seconds || "Hold still"}</strong><span>{seconds ? "Get into position" : "Taking photos…"}</span></div>}
    </div>
    <button className="nw-primary nw-easy-action" disabled={waiting || phase === "countdown"} onClick={primary}>
      {waiting ? phase === "checking" ? "Checking…" : "Opening…" : phase === "countdown" ? "Taking your photo…" : phase === "camera" ? `Take photo in ${timerSeconds} seconds` : retry ? <><RotateCcw size={21}/>Retry</> : <>Open camera<ChevronRight size={22}/></>}</button>
    {!live && !waiting && phase !== "connection" && <label className="nw-easy-native"><Camera size={17}/>Use phone camera<input aria-label="Use phone camera" type="file" accept="image/*" capture="user" onClick={() => controller.current?.pause()} onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }}/></label>}
    {phase === "camera" && <button className="nw-easy-link" onClick={() => controller.current?.pause()}>Show me the position again</button>}
  </section>;
}
