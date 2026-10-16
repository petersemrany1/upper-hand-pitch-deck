import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, RotateCcw, Check, X } from "lucide-react";
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
  const [setup, setSetup] = useState(views.length === 0), [example, setExample] = useState(false);
  const [fileBusy, setFileBusy] = useState(false), [fileError, setFileError] = useState("");
  const video = useRef<HTMLVideoElement>(null), controller = useRef<NorwoodCaptureController | null>(null);
  const latestCapture = useRef(capture); latestCapture.current = capture;
  const fileRun = useRef(0), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const current = new NorwoodCaptureController(view, {
      open: signal => openNorwoodCamera(video.current!, signal),
      check: (photos, selectedView) => latestCapture.current(photos[0], selectedView, photos.slice(1)), change: setState,
    });
    controller.current = current; setState(current.state); setFileError(""); setFileBusy(false); setExample(false);
    heading.current?.focus({ preventScroll: true });
    const hide = () => { if (document.hidden) { fileRun.current++; setFileBusy(false); current.pause(); } };
    document.addEventListener("visibilitychange", hide);
    return () => { fileRun.current++; current.dispose(); document.removeEventListener("visibilitychange", hide); };
  }, [view, token]);
  async function choose(file?: File) {
    if (!file || fileBusy) return;
    const run = ++fileRun.current; setFileBusy(true); setFileError(""); setExample(false);
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
  const { phase } = state, pose = HAIR_POSITIONS[view];
  const live = phase === "camera" || phase === "scanning";
  const waiting = phase === "opening" || phase === "checking" || fileBusy;
  const retry = ["retake", "connection", "camera_error"].includes(phase);
  const showReview = phase === "retake" && Boolean(state.review) && !example;
  function primary() {
    setFileError(""); setExample(false);
    if (setup) { setSetup(false); return; }
    if (example && live) return;
    if (phase === "camera") void controller.current?.take();
    else if (phase === "scanning") void controller.current?.finish();
    else if (phase === "connection") void controller.current?.retryConnection();
    else {
      const current = controller.current;
      if (current) void current.open().then(() => current.take());
    }
  }
  const title = setup ? "Rest your phone here" : phase === "checking" ? "Checking this photo" : phase === "connection" ? "Let’s reconnect" : showReview ? "Let’s adjust this" : pose.title;
  const instruction = setup ? "Sit facing the screen. Rest it at eye level." : fileError || state.message || (phase === "checking" ? "You can relax." : phase === "scanning" ? pose.live : example && live ? pose.instruction : phase === "camera" ? view === "front" ? "Fit your whole head inside the outline." : "Get comfortable. Tap Start when ready." : pose.instruction);
  return <section className="nw-card nw-easy" aria-label="Guided hair photos">
    <div className="nw-easy-progress"><span>{setup ? "Get comfortable" : `Photo ${views.length + 1} of 5`}</span><div aria-label={`${views.length} photos saved`}>{NORWOOD_VIEWS.map(v => <span key={v} className={views.includes(v) ? "done" : v === view ? "current" : ""}/>)}</div></div>
    <h1 ref={heading} tabIndex={-1}>{title}</h1>
    <p className="nw-easy-instruction" role="status">{instruction}</p>
    <div className={`nw-easy-stage ${live ? "is-live" : ""}`}>
      <video ref={video} autoPlay playsInline muted aria-label="Live selfie camera"/>
      {showReview ? <><img className="nw-easy-review" src={`data:image/jpeg;base64,${state.review}`} alt="Your photo from this attempt"/><span className="nw-easy-caption">Your photo</span></> : !live && !waiting && phase !== "connection" && <NorwoodPositionGuide view={view} setup={setup}/>}
      {(waiting || phase === "connection") && <div className="nw-easy-wait">{phase === "connection" ? <RotateCcw size={38}/> : <span className="nw-spinner"/>}<span>{fileBusy ? "Opening photo…" : phase === "opening" ? "Opening camera…" : phase === "connection" ? "Tap Retry to check the same photos." : "Finding the clearest view…"}</span></div>}
      {live && example && <div className="nw-easy-demo-overlay"><NorwoodPositionGuide view={view}/></div>}
      {live && !example && <>
        {live && view === "front" && <svg className="nw-easy-outline" viewBox="0 0 300 400" aria-hidden="true"><rect x="46" y="38" width="208" height="285" rx="90"/><path d="M87 117Q150 91 213 117"/></svg>}
        <button className="nw-easy-back" aria-label="Stop and show the movement" onClick={() => controller.current?.pause()}><X size={22}/></button>
        {phase === "scanning" && <span className="nw-easy-recording"><i/>Capturing</span>}
      </>}
    </div>
    <button className="nw-primary nw-easy-action" disabled={waiting} onClick={primary}>
      {setup ? <>Phone is ready<ChevronRight size={22}/></> : waiting ? phase === "checking" ? "Checking…" : "Opening…" : phase === "scanning" ? <><Check size={24}/>Done</> : example && live ? "Got it" : phase === "camera" ? "Start" : retry ? <><RotateCcw size={21}/>Retry</> : <>Start this photo<ChevronRight size={22}/></>}</button>
    {phase === "retake" && state.review && <button className="nw-easy-link" onClick={() => setExample(value => !value)}>{example ? "See my photo" : "Show me the movement"}</button>}
    {!setup && !live && !waiting && phase !== "connection" && <label className="nw-easy-native"><Camera size={17}/>Use phone camera<input aria-label="Use phone camera" type="file" accept="image/*" capture="user" onClick={() => controller.current?.pause()} onChange={e => { void choose(e.target.files?.[0]); e.target.value = ""; }}/></label>}
    {phase === "camera" && <button className="nw-easy-link" onClick={() => setExample(value => !value)}>{example ? "Back to camera" : "Show me the movement"}</button>}
  </section>;
}
