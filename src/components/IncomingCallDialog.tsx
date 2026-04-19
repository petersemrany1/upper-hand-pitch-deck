import { useEffect, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

// Global incoming-call alert. Shows a full-screen-ish modal with caller ID,
// plays a ringtone, and exposes Accept / Reject buttons. Auto-mounted in the
// dashboard layout so it works on any page.

// Simple data-URI ringtone (short beep) used as fallback if no asset is shipped.
// We synthesise via WebAudio for a clean ring without bundling an audio file.
function useRingtone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        if (cancelled) return;

        // Repeat a two-tone ring every 2s
        let timer: number | null = null;
        const playRing = () => {
          const now = ctx.currentTime;
          [0, 0.4].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 480;
            const o2 = ctx.createOscillator();
            o2.frequency.value = 620;
            o2.connect(gain);
            osc.connect(gain);
            gain.gain.setValueAtTime(0.0001, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            o2.start(now + offset);
            osc.stop(now + offset + 0.32);
            o2.stop(now + offset + 0.32);
          });
        };
        playRing();
        timer = window.setInterval(playRing, 2000);
        stopRef.current = () => {
          if (timer !== null) window.clearInterval(timer);
          ctx.close().catch(() => { /* noop */ });
        };
      } catch (e) {
        console.warn("Ringtone unavailable", e);
      }
    };
    void start();
    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [active]);
}

export function IncomingCallDialog() {
  const { status, incomingFrom, answer, reject } = useTwilioDevice();
  const isRinging = status === "ringing-incoming";

  useRingtone(isRinging);

  // Browser notification (best effort)
  useEffect(() => {
    if (!isRinging) return;
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("Incoming call", { body: incomingFrom ?? "Unknown caller" });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().catch(() => { /* noop */ });
        }
      }
    } catch { /* noop */ }
  }, [isRinging, incomingFrom]);

  if (!isRinging) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Incoming call"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: "#0f0f12", border: "1px solid #1f1f23" }}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Incoming call
        </div>
        <div className="mb-1 text-2xl font-bold text-white">
          {incomingFrom || "Unknown caller"}
        </div>
        <div className="mb-8 text-sm text-zinc-400">Ringing…</div>

        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={reject}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-500 active:scale-95"
            aria-label="Reject call"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={answer}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-500 active:scale-95 animate-pulse"
            aria-label="Answer call"
          >
            <Phone className="h-7 w-7" />
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-12 text-xs text-zinc-500">
          <span>Decline</span>
          <span>Answer</span>
        </div>
      </div>
    </div>
  );
}
