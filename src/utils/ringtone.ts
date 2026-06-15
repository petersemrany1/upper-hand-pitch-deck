// Synthetic inbound ringtone — plays in the browser while a call is ringing
// so the rep can hear it even if their headset/system isn't producing one.
// Classic two-tone "ring ring" pattern (AU/UK style).

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

// Call from a user gesture (click/keydown) to unlock the AudioContext so a
// later startRingtone() — fired from a non-gesture Twilio event — is allowed
// to play under browser autoplay policies.
export function primeRingtoneAudio(): void {
  try {
    const ac = getCtx();
    if (ac.state === "suspended") void ac.resume();
  } catch (e) {
    console.warn("ringtone: prime failed", e);
  }
}


export function startRingtone(): void {
  if (playing) return;
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

    const VOL = 0.18;
    const schedule = () => {
      if (!playing || !gain) return;
      const now = ac.currentTime;
      const g = gain.gain;
      g.cancelScheduledValues(now);
      g.setValueAtTime(VOL, now);
      g.setValueAtTime(0, now + 0.4);
      g.setValueAtTime(VOL, now + 0.6);
      g.setValueAtTime(0, now + 1.0);
      timer = window.setTimeout(schedule, 3000);
    };
    schedule();
  } catch (e) {
    console.warn("ringtone: failed to start", e);
    stopRingtone();
  }
}

export function stopRingtone(): void {
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
