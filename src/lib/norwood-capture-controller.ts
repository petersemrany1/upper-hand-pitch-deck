import type { NorwoodView } from "./norwood-assessment";
import type { NorwoodPhotoCheck } from "./norwood-photo-check";

export type CapturePhase = "guide" | "opening" | "camera" | "scanning" | "checking" | "retake" | "connection" | "camera_error";
export type CaptureState = { phase: CapturePhase; seconds: number | null; message: string; review?: string };
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
export const CAPTURE_MAX_FRAMES = 8;
export const CAPTURE_MAX_TICKS = 40; // 28 seconds, with an explicit Done button throughout.

/** Keep coverage across the movement, not just the last frames after looking up. */
export class CaptureSamples {
  private frames: { tick: number; photo: string }[] = [];
  add(tick: number, photo: string) {
    this.frames.push({ tick, photo });
    if (this.frames.length > CAPTURE_MAX_FRAMES) {
      let remove = 1, shortest = Infinity;
      for (let i = 1; i < this.frames.length - 1; i++) {
        const span = this.frames[i + 1].tick - this.frames[i - 1].tick;
        if (span < shortest) { shortest = span; remove = i; }
      }
      this.frames.splice(remove, 1);
    }
  }
  photos() { return this.frames.map(frame => frame.photo); }
  clear() { this.frames = []; }
}

/** No shutter deadline: collect throughout the movement until Done (bounded at 28s). */
export class NorwoodCaptureController {
  state: CaptureState = { phase: "guide", seconds: null, message: "" };
  private run = new AbortController();
  private camera: CaptureCamera | null = null;
  private retained: string[] = [];
  private samples = new CaptureSamples();
  private checking = false;
  private disposed = false;
  private hidden = false;
  constructor(readonly view: NorwoodView, private ports: Ports) {}
  private update(phase: CapturePhase, message = "", seconds: number | null = null, review?: string) {
    if (this.disposed) return;
    this.state = { phase, seconds, message, ...(review ? { review } : {}) }; this.ports.change(this.state);
  }
  private stopCamera() { this.camera?.stop(); this.camera = null; }
  private newRun() { this.run.abort(); this.run = new AbortController(); return this.run.signal; }
  async open() {
    if (this.disposed || this.checking || ["opening", "camera", "scanning"].includes(this.state.phase)) return;
    const signal = this.newRun(); this.hidden = false; this.retained = []; this.samples.clear(); this.update("opening");
    try {
      const camera = await this.ports.open(signal);
      if (signal.aborted) { camera.stop(); return; }
      this.camera = camera; this.update("camera");
    } catch { if (!signal.aborted) { this.stopCamera(); this.update("camera_error", "Camera unavailable. Try your phone camera below."); } }
  }
  async take() {
    if (this.disposed || this.state.phase !== "camera" || !this.camera || this.checking) return;
    const signal = this.run.signal, wait = this.ports.wait ?? captureWait;
    this.samples.clear();
    try {
      for (let tick = 0; tick < CAPTURE_MAX_TICKS; tick++) {
        if (signal.aborted || !this.camera) return;
        this.samples.add(tick, this.camera.photo());
        this.update("scanning", "", Math.floor(tick * .7));
        await wait(700, signal);
      }
      if (!signal.aborted) await this.finish();
    } catch { if (!signal.aborted) { this.samples.clear(); this.stopCamera(); this.update("camera_error", "The camera paused. Tap Retry."); } }
  }
  async finish() {
    if (this.disposed || this.checking || this.state.phase !== "scanning") return;
    const photos = this.samples.photos();
    this.samples.clear(); const signal = this.newRun(); this.stopCamera();
    if (photos.length) await this.submit(photos, signal);
    else this.update("camera_error", "No photo captured. Tap Retry.");
  }
  async usePhoto(photo: string) {
    if (this.disposed || this.checking) return;
    const signal = this.newRun(); this.hidden = false; this.samples.clear(); this.stopCamera(); await this.submit([photo], signal);
  }
  async retryConnection() {
    if (this.disposed || this.checking || this.state.phase !== "connection" || !this.retained.length) return;
    this.hidden = false; await this.submit(this.retained, this.newRun());
  }
  private async submit(photos: string[], signal: AbortSignal) {
    if (signal.aborted || this.checking) return;
    this.checking = true; this.retained = [...photos]; this.update("checking");
    try {
      const result = await this.ports.check(photos, this.view);
      if (signal.aborted) return;
      this.retained = [];
      if (!result.ready) {
        const index = result.reviewIndex;
        const review = !this.hidden && Number.isInteger(index) && index! >= 0 && index! < photos.length ? photos[index!] : undefined;
        this.update("retake", result.message, null, review);
      }
    } catch (error) {
      if (!signal.aborted) this.update(this.retained.length ? "connection" : "camera_error",
        error instanceof Error ? error.message : "Connection interrupted. Tap Retry.");
    } finally { photos.length = 0; this.checking = false; }
  }
  pause() {
    this.hidden = true; this.retained = []; this.samples.clear(); this.stopCamera();
    // A submitted request can still save. Do not overlap it with a new one.
    if (this.checking) { this.update("checking"); return; }
    this.newRun(); this.update("guide");
  }
  dispose() { this.disposed = true; this.run.abort(); this.retained = []; this.samples.clear(); this.stopCamera(); this.state = { phase: "guide", seconds: null, message: "" }; }
}
