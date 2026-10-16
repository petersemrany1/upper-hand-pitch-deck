import type { CaptureCamera } from "@/lib/norwood-capture-controller";
import { prepareNorwoodPhoto } from "./useNorwoodCamera";

/** Wait for actual playable frames, not just permission or a resolved play(). */
export async function openNorwoodCamera(video: HTMLVideoElement, signal: AbortSignal): Promise<CaptureCamera> {
  if (signal.aborted || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
  let stream: MediaStream | undefined;
  let ended = false;
  const stop = () => {
    ended = true; const releasing = stream; stream = undefined;
    releasing?.getTracks().forEach(track => track.stop());
    if (video.srcObject === releasing) video.srcObject = null;
    signal.removeEventListener("abort", stop);
  };
  signal.addEventListener("abort", stop, { once: true });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  try {
    await Promise.race([
      (async () => {
        // Called directly from the Open camera gesture; never request audio.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" }, width: { ideal: 1536 }, height: { ideal: 1536 } }, audio: false });
        if (ended || signal.aborted) { stop(); throw new Error("Cancelled"); }
        video.srcObject = stream; await video.play();
        if (ended || signal.aborted) throw new Error("Cancelled");
        await new Promise<void>((resolve, reject) => {
          const check = () => {
            if (ended || signal.aborted) { clearInterval(interval); reject(new Error("Cancelled")); }
            else if (!video.paused && video.readyState >= 2 && video.videoWidth >= 480 && video.videoHeight >= 480) { clearInterval(interval); resolve(); }
          };
          interval = setInterval(check, 50); check();
        });
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Camera timed out")), 15_000); }),
    ]);
    let signature: number[] | undefined;
    return {
      signature: () => signature,
      photo: () => {
        if (ended || signal.aborted || !stream?.active || video.paused || video.readyState < 2 || !stream.getVideoTracks().some(t => t.readyState === "live")) throw new Error("Camera paused");
        const snapshot = document.createElement("canvas"); snapshot.width = video.videoWidth; snapshot.height = video.videoHeight;
        const context = snapshot.getContext("2d"); if (!context) throw new Error("Camera unavailable");
        context.drawImage(video, 0, 0);
        // A tiny, local brightness-normalised thumbnail preserves different poses
        // when a slow movement exceeds eight frames. It is not head detection.
        const thumbnail = document.createElement("canvas"); thumbnail.width = thumbnail.height = 12;
        const small = thumbnail.getContext("2d", { willReadFrequently: true });
        if (small) {
          small.drawImage(snapshot, 0, 0, 12, 12);
          const rgba = small.getImageData(0, 0, 12, 12).data;
          const light = Array.from({ length: 144 }, (_, i) => .299 * rgba[i * 4] + .587 * rgba[i * 4 + 1] + .114 * rgba[i * 4 + 2]);
          const mean = light.reduce((a, b) => a + b, 0) / light.length;
          signature = light.map(value => value - mean);
        }
        return prepareNorwoodPhoto(snapshot, snapshot.width, snapshot.height, false, false);
      }, stop,
    };
  } catch (error) { stop(); throw error; }
  finally { clearTimeout(timeout); clearInterval(interval); }
}
