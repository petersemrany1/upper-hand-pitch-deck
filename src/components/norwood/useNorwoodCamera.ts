import { useEffect, useRef, useState } from "react";
import { NORWOOD_IMAGE_PIPELINE, photoQuality, type NorwoodView } from "@/lib/norwood-assessment";
import type { NorwoodPatientApi } from "@/lib/norwood-preview-session";
import { CAPTURE_STEPS } from "./NorwoodPoseGuide";

export function prepareNorwoodPhoto(source: CanvasImageSource, width: number, height: number, frame = false) {
  if (Math.min(width, height) < 480) throw new Error("Use a larger, clearer photo with your head in view.");
  const canvas = document.createElement("canvas"), scale = Math.min(1, (frame ? 640 : NORWOOD_IMAGE_PIPELINE.maxDimension) / Math.max(width, height));
  canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Camera unavailable. Use the phone camera option.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (!frame) {
    const sample = document.createElement("canvas"); sample.width = sample.height = 256;
    const sc = sample.getContext("2d")!, crop = Math.min(canvas.width, canvas.height);
    sc.drawImage(canvas, (canvas.width - crop) / 2, (canvas.height - crop) / 2, crop, crop, 0, 0, 256, 256);
    const problem = photoQuality(sc.getImageData(0, 0, 256, 256).data, 256, 256);
    if (problem) throw new Error(problem);
  }
  // Re-encode every frame/file: camera EXIF and location metadata are not sent.
  return canvas.toDataURL("image/jpeg", frame ? .72 : NORWOOD_IMAGE_PIPELINE.jpegQuality).split(",")[1];
}

export function useNorwoodCamera({ api, token, view, enabled, save }: {
  api: NorwoodPatientApi; token: string; view: NorwoodView; enabled: boolean;
  save: (photo: string, view: NorwoodView) => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0), requestId = useRef(0), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false), [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(true), [countdown, setCountdown] = useState<number | null>(null);
  const [phase, setPhase] = useState<"position" | "checking" | "countdown" | "saving">("position");
  const [message, setMessage] = useState("Follow the picture. The timer starts when you’re in position.");
  const latest = useRef({ save, sound }); latest.current = { save, sound };
  const lastSpoken = useRef("");
  function speak(text: string) {
    if (!latest.current.sound || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-AU"; utterance.rate = .95;
    // Some iOS releases pause a video while speaking. Resume the silent camera.
    utterance.onend = () => { if (!document.hidden) void video.current?.play().catch(() => {}); };
    window.speechSynthesis.speak(utterance);
  }
  function stop() {
    epoch.current++; requestId.current++;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    window.speechSynthesis?.cancel(); setReady(false); setCountdown(null);
  }
  async function open() {
    const id = ++requestId.current;
    setMessage("Opening camera…");
    // Called directly from a user gesture, before the camera permission promise.
    speak("Follow the pictures. I will count down when your head is in position.");
    try {
      stream.current?.getTracks().forEach(t => t.stop());
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1536 }, height: { ideal: 1536 } }, audio: false });
      if (id !== requestId.current) { acquired.getTracks().forEach(t => t.stop()); return; }
      stream.current = acquired;
      if (video.current) { video.current.srcObject = acquired; await video.current.play(); }
      setReady(true); setPaused(false);
    } catch { if (id === requestId.current) { setReady(false); setMessage("Allow camera access, or use “Phone camera” below."); } }
  }
  useEffect(() => {
    if (video.current && stream.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => {}); }
  }, [enabled, ready]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide); stop(); };
  }, [token]);
  useEffect(() => { if (!enabled) stop(); }, [enabled]);

  function capture() {
    const el = video.current;
    if (!el || el.paused || !el.videoWidth) throw new Error("Wait for the camera to focus, then try again.");
    return prepareNorwoodPhoto(el, el.videoWidth, el.videoHeight);
  }
  function startCountdown(run: number, next: () => void) {
    let seconds = 5; setPhase("countdown"); setCountdown(seconds); setMessage("Head in position. Hold still."); speak("Hold still. Five.");
    const tick = async () => {
      if (run !== epoch.current || document.hidden) return;
      seconds--; setCountdown(seconds || null);
      if (seconds > 0) { speak(String(seconds)); timer.current = setTimeout(tick, 1000); return; }
      setPhase("saving"); setMessage("Checking your photo…"); speak("Checking photo.");
      try {
        await latest.current.save(capture(), view);
        if (run !== epoch.current) return;
        speak("Photo saved.");
      } catch (error) {
        if (run !== epoch.current) return;
        const text = error instanceof Error ? error.message : "Could not check the photo. Try again.";
        setMessage(text); speak(text); setPhase("position");
        timer.current = setTimeout(next, 7000);
      }
    };
    timer.current = setTimeout(tick, 1000);
  }

  useEffect(() => {
    const run = ++epoch.current;
    if (timer.current) clearTimeout(timer.current);
    setCountdown(null); setPhase("position");
    if (!enabled || !ready || paused) return;
    setMessage(api.checkPatientNorwoodFrame ? "Find the position shown. We’ll check it automatically." : "Follow the picture, then start the timer.");
    speak(CAPTURE_STEPS[view].voice); lastSpoken.current = "";
    const check = async () => {
      if (run !== epoch.current || document.hidden || !api.checkPatientNorwoodFrame) return;
      const el = video.current;
      if (!el || el.paused || !el.videoWidth) { void el?.play().catch(() => {}); timer.current = setTimeout(check, 3000); return; }
      setPhase("checking");
      try {
        const frame = prepareNorwoodPhoto(el, el.videoWidth, el.videoHeight, true);
        const result = await api.checkPatientNorwoodFrame({ data: { token, view, photo: frame } });
        if (run !== epoch.current) return;
        if (!result.ok) throw new Error(result.error);
        setMessage(result.data.message);
        if (result.data.ready) { startCountdown(run, check); return; }
        if (lastSpoken.current !== result.data.message) { speak(result.data.message); lastSpoken.current = result.data.message; }
        setPhase("position"); timer.current = setTimeout(check, 3500);
      } catch (error) {
        if (run !== epoch.current) return;
        setMessage(error instanceof Error ? error.message : "Connection interrupted. Tap Resume to try again.");
        setPaused(true); setPhase("position");
      }
    };
    // Time to hear the new angle and move the phone; never immediately snap the
    // next view in the previous pose. Each request finishes before another starts.
    timer.current = setTimeout(check, view === "top" || view === "crown" ? 14000 : 9000);
    return () => { epoch.current++; if (timer.current) clearTimeout(timer.current); window.speechSynthesis?.cancel(); };
  }, [api, token, view, enabled, ready, paused]);

  return { video, ready, paused, sound, phase, message, countdown, open, stop,
    togglePause: () => { if (!paused) setMessage("Photos paused. Tap Resume when you’re ready."); setPaused(!paused); }, pause: () => setPaused(true),
    toggleSound: () => { if (sound) window.speechSynthesis?.cancel(); else { latest.current.sound = true; speak(CAPTURE_STEPS[view].voice); } setSound(!sound); },
    manual: () => { if (!api.checkPatientNorwoodFrame && ready && !paused) startCountdown(epoch.current, () => {}); },
  };
}
