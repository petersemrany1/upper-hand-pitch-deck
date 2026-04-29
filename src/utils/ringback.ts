// Synthetic ringback tone generator for outbound calls.
// Twilio's WebRTC stream doesn't always deliver the carrier's ringback to the
// caller's browser, so we play our own locally between dial and answer.
//
// Pattern: AU/UK style — ring burst (400Hz + 450Hz) ON for 0.4s, OFF 0.2s,
// ON 0.4s, then OFF 2.0s. Total cycle ≈ 3s.

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let timer: number | null = null;
let playing = false;

function getCtx(): AudioContext {
  if (!ctx) {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new AC();
  }
  return ctx;
}

// Call from a user gesture (e.g. click handler) to unlock the AudioContext
// so a later startRingback() — fired from a non-gesture event such as Twilio's
// "ringing" callback — is allowed to play under browser autoplay policies.
export function primeAudioContext(): void {
  try {
    const ac = getCtx();
    if (ac.state === "suspended") void ac.resume();
  } catch (e) {
    console.warn("ringback: prime failed", e);
  }
}

export function startRingback(): void {
  if (playing) return;
  // Must be called from a user gesture (click handler) so the AudioContext
  // is allowed to start under browser autoplay policies.
  try {
    const ac = getCtx();
    if (ac.state === "suspended") void ac.resume();

    gain = ac.createGain();
    gain.gain.value = 0;
    gain.connect(ac.destination);

    osc1 = ac.createOscillator();
    osc1.frequency.value = 400;
    osc1.type = "sine";
    osc1.connect(gain);

    osc2 = ac.createOscillator();
    osc2.frequency.value = 450;
    osc2.type = "sine";
    osc2.connect(gain);

    osc1.start();
    osc2.start();
    playing = true;

    const VOL = 0.08;
    const schedule = () => {
      if (!playing || !gain) return;
      const now = ac.currentTime;
      // Cycle: ON 0.4s, OFF 0.2s, ON 0.4s, OFF 2.0s
      const g = gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(VOL, now);
      g.setValueAtTime(0, now + 0.4);
      g.setValueAtTime(VOL, now + 0.6);
      g.setValueAtTime(0, now + 1.0);
      // next cycle in 3s
      timer = window.setTimeout(schedule, 3000);
    };
    schedule();
  } catch (e) {
    console.warn("ringback: failed to start", e);
    stopRingback();
  }
}

export function stopRingback(): void {
  playing = false;
  if (timer !== null) { window.clearTimeout(timer); timer = null; }
  try { osc1?.stop(); } catch { /* noop */ }
  try { osc2?.stop(); } catch { /* noop */ }
  try { osc1?.disconnect(); } catch { /* noop */ }
  try { osc2?.disconnect(); } catch { /* noop */ }
  try { gain?.disconnect(); } catch { /* noop */ }
  osc1 = null;
  osc2 = null;
  gain = null;
}
