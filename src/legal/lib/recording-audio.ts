// Ported from the Legal app (family-law-floater/src/lib/recording-audio.ts). Re-run the port script to refresh.
/** Minimal PCM WAV reader/splitter for Twilio recordings; no native binary needed in Workers. */
/** Every audio window was processed successfully, but none contained verified speech. */
export class NoSpeechRecordingError extends Error {
  constructor() {
    super("No speech could be verified in the recording");
    this.name = "NoSpeechRecordingError";
  }
}

export type PcmRecording = {
  bytes: Uint8Array;
  dataOffset: number;
  frames: number;
  channels: number;
  sampleRate: number;
  blockAlign: number;
};
export function readPcmWav(buffer: ArrayBuffer): PcmRecording {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const text = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (bytes.length < 44 || text(0, 4) !== "RIFF" || text(8, 4) !== "WAVE")
    throw new Error("Recording is not a valid WAV file");
  let channels = 0,
    sampleRate = 0,
    blockAlign = 0,
    dataOffset = 0,
    dataLength = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + size > bytes.length) throw new Error("Recording WAV data is truncated");
    const kind = text(offset, 4);
    if (kind === "fmt ") {
      if (size < 16 || view.getUint16(start, true) !== 1 || view.getUint16(start + 14, true) !== 16)
        throw new Error("Recording must use 16-bit PCM audio");
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
      blockAlign = view.getUint16(start + 12, true);
    } else if (kind === "data") {
      dataOffset = start;
      dataLength = size;
    }
    offset = start + size + (size % 2);
  }
  if (
    ![1, 2].includes(channels) ||
    sampleRate < 8000 ||
    sampleRate > 48000 ||
    blockAlign !== channels * 2 ||
    !dataOffset ||
    dataLength % blockAlign
  )
    throw new Error("Recording has unsupported or empty PCM data");
  if (!dataLength) throw new Error("Recording contains no audio frames");
  return { bytes, dataOffset, frames: dataLength / blockAlign, channels, sampleRate, blockAlign };
}

/** A bounded mono slice, preserving one physical call leg when the recording is stereo. */
export function wavChannelSlice(
  recording: PcmRecording,
  channel: number,
  startFrame: number,
  endFrame: number,
): Uint8Array<ArrayBuffer> {
  if (
    !Number.isInteger(channel) ||
    channel < 0 ||
    channel >= recording.channels ||
    !Number.isInteger(startFrame) ||
    !Number.isInteger(endFrame) ||
    startFrame < 0 ||
    endFrame > recording.frames ||
    endFrame <= startFrame
  )
    throw new Error("Invalid recording slice");
  const length = (endFrame - startFrame) * 2;
  const output = new Uint8Array(44 + length);
  const view = new DataView(output.buffer);
  const put = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  put(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  put(8, "WAVE");
  put(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, recording.sampleRate, true);
  view.setUint32(28, recording.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  put(36, "data");
  view.setUint32(40, length, true);
  for (let frame = startFrame; frame < endFrame; frame++) {
    const from = recording.dataOffset + frame * recording.blockAlign + channel * 2;
    const to = 44 + (frame - startFrame) * 2;
    output[to] = recording.bytes[from]!;
    output[to + 1] = recording.bytes[from + 1]!;
  }
  return output;
}

export type AudioWindow = {
  startFrame: number;
  endFrame: number;
  offset: number;
  keepFrom: number;
  keepUntil: number;
  part: number;
};
export function recordingWindows(recording: PcmRecording, maxSeconds = 600): AudioWindow[] {
  // Under 1,400 seconds and 25MB even at 48kHz. Two seconds of overlap protects cut words.
  if (!Number.isFinite(maxSeconds) || maxSeconds < 1) throw new Error("Invalid audio window size");
  const seconds = Math.min(
    maxSeconds,
    600,
    Math.floor(24_000_000 / (recording.sampleRate * 2)) - 4,
  );
  const total = recording.frames / recording.sampleRate;
  const windows: AudioWindow[] = [];
  for (let from = 0; from < total; from += seconds) {
    const offset = Math.max(0, from - 2);
    windows.push({
      startFrame: Math.floor(offset * recording.sampleRate),
      endFrame: Math.min(recording.frames, Math.ceil((from + seconds + 2) * recording.sampleRate)),
      offset,
      keepFrom: from,
      keepUntil: Math.min(total, from + seconds),
      part: windows.length + 1,
    });
  }
  return windows;
}
