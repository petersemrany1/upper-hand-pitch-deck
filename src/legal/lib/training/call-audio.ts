// Ported from the Legal app (family-law-floater/src/lib/training/call-audio.ts). Re-run the port script to refresh.
// Preparing a real call recording for the Sales Call Example module: both call legs mixed
// into one track, with chosen moments silenced (card numbers, names, addresses). Pure code,
// so it runs on the server without any native audio tools.

import type { PcmRecording } from "@/legal/lib/recording-audio";

export type SilenceRange = { start: number; end: number };

/**
 * Mono 16-bit WAV of the whole call, with every range (in seconds) replaced by silence.
 * The two call legs are summed (each leg is mostly quiet while the other talks), not averaged.
 */
export function mixedWavWithSilence(
  recording: PcmRecording,
  silence: readonly SilenceRange[],
): Uint8Array<ArrayBuffer> {
  const { frames, channels, sampleRate, dataOffset, blockAlign, bytes } = recording;
  const muted = new Uint8Array(frames);
  for (const r of silence) {
    if (!(r.end > r.start) || r.start < 0) throw new Error("Invalid silence range");
    const from = Math.max(0, Math.floor(r.start * sampleRate));
    const to = Math.min(frames, Math.ceil(r.end * sampleRate));
    muted.fill(1, from, to);
  }

  const length = frames * 2;
  const out = new Uint8Array(44 + length);
  const view = new DataView(out.buffer);
  const put = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  put(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, "data");
  view.setUint32(40, length, true);

  const src = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let f = 0; f < frames; f++) {
    let sample = 0;
    if (!muted[f]) {
      let sum = 0;
      for (let c = 0; c < channels; c++)
        sum += src.getInt16(dataOffset + f * blockAlign + c * 2, true);
      sample = Math.max(-32768, Math.min(32767, sum));
    }
    view.setInt16(44 + f * 2, sample, true);
  }
  return out;
}
