import type { NorwoodView } from "./norwood-assessment";
import type { NorwoodPhotoCheck } from "./norwood-photo-check";

export type CapturePhase = "guide" | "opening" | "camera" | "countdown" | "checking" | "retake" | "connection" | "camera_error";
export type CaptureState = { phase: CapturePhase; seconds: number | null; message: string };
export type CaptureCamera = { photo(): string; stop(): void };
type Ports = {
  open(signal: AbortSignal): Promise<CaptureCamera>;
  check(photos: string[], view: NorwoodView): Promise<NorwoodPhotoCheck>;
  change(state: CaptureState): void;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
};
export const captureWait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const abort = () => { clearTimeout(timer); reject(new DOMException("Cancelled", "AbortError")); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
  if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
});

/** The user controls the pace. No automatic retries, countdowns or camera opens. */
export class NorwoodCaptureController {
  state: CaptureState = { phase: "guide", seconds: null, message: "" };
  private run = new AbortController();
  private camera: CaptureCamera | null = null;
  private retained: string[] = [];
  private checking = false;
  private disposed = false;
  constructor(readonly view: NorwoodView, private ports: Ports) {}
  private update(phase: CapturePhase, message = "", seconds: number | null = null) {
    if (this.disposed) return;
    this.state = { phase, seconds, message }; this.ports.change(this.state);
  }
  private stopCamera() { this.camera?.stop(); this.camera = null; }
  private newRun() { this.run.abort(); this.run = new AbortController(); return this.run.signal; }
  async open() {
    if (this.disposed || this.checking || ["opening", "camera", "countdown"].includes(this.state.phase)) return;
    const signal = this.newRun(); this.retained = []; this.update("opening");
    try {
      const camera = await this.ports.open(signal);
      if (signal.aborted) { camera.stop(); return; }
      this.camera = camera; this.update("camera");
    } catch { if (!signal.aborted) { this.stopCamera(); this.update("camera_error", "Camera unavailable. Try your phone camera below."); } }
  }
  async take() {
    if (this.disposed || this.state.phase !== "camera" || !this.camera || this.checking) return;
    const signal = this.run.signal, wait = this.ports.wait ?? captureWait;
    try {
      const seconds = this.view === "top" || this.view === "crown" ? 8 : 5;
      for (let remaining = seconds; remaining > 0; remaining--) {
        this.update("countdown", "", remaining); await wait(1000, signal);
        if (signal.aborted) return;
      }
      this.update("countdown", "Hold still", 0);
      const photos: string[] = [];
      for (let frame = 0; frame < 3; frame++) {
        if (frame) await wait(650, signal);
        if (signal.aborted) return;
        photos.push(this.camera.photo());
      }
      this.stopCamera(); await this.submit(photos, signal);
    } catch { if (!signal.aborted) { this.stopCamera(); this.update("camera_error", "The camera paused. Tap Retry."); } }
  }
  async usePhoto(photo: string) {
    if (this.disposed || this.checking) return;
    const signal = this.newRun(); this.stopCamera(); await this.submit([photo], signal);
  }
  async retryConnection() {
    if (this.disposed || this.checking || this.state.phase !== "connection" || !this.retained.length) return;
    await this.submit(this.retained, this.newRun());
  }
  private async submit(photos: string[], signal: AbortSignal) {
    if (signal.aborted || this.checking) return;
    this.checking = true; this.retained = photos; this.update("checking");
    try {
      const result = await this.ports.check(photos, this.view);
      if (signal.aborted) return;
      this.retained = [];
      // A success advances only when the parent receives the saved server session.
      if (!result.ready) this.update("retake", result.message);
    } catch (error) {
      if (!signal.aborted) this.update(this.retained.length ? "connection" : "camera_error",
        error instanceof Error ? error.message : "Connection interrupted. Tap Retry.");
    } finally { this.checking = false; }
  }
  pause() {
    this.retained = []; this.stopCamera();
    // An already-submitted request may still save a photo. Let the server reply
    // settle, but clear local images; never open a second overlapping request.
    if (this.checking) return;
    this.newRun(); this.update("guide");
  }
  dispose() { this.disposed = true; this.run.abort(); this.retained = []; this.stopCamera(); }
}
