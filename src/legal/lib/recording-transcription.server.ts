// Ported from the Legal app (family-law-floater/src/lib/recording-transcription.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { twilioEnv } from "./twilio.server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { formatSpeakerTranscript } from "./client-intel-evidence";
import {
  readPcmWav,
  NoSpeechRecordingError,
  recordingWindows,
  wavChannelSlice,
  type AudioWindow,
  type PcmRecording,
} from "./recording-audio";

const API = "https://api.openai.com/v1/audio/transcriptions";
type Segment = { speaker: string; text: string; start: number; end: number };
export type RecordingProgress = Record<string, Segment[]>;
export type RecordingCheckpoints = {
  before: (stage: string) => void;
  load: (fingerprint: string) => Promise<RecordingProgress>;
  save: (fingerprint: string, parts: RecordingProgress) => Promise<void>;
};

async function transcribeWindow(
  recording: PcmRecording,
  window: AudioWindow,
  channel: number,
  key: string,
  timeoutMs = 240_000,
): Promise<Segment[]> {
  const separateLegs = recording.channels === 2;
  const form = new FormData();
  form.append(
    "file",
    new Blob([wavChannelSlice(recording, channel, window.startFrame, window.endFrame)], {
      type: "audio/wav",
    }),
    "call.wav",
  );
  // Physical channel separation is stronger than inferring the speaker from a mixed track.
  form.append("model", separateLegs ? "whisper-1" : "gpt-4o-transcribe-diarize");
  form.append("response_format", separateLegs ? "verbose_json" : "diarized_json");
  form.append("language", "en");
  if (!separateLegs) form.append("chunking_strategy", "auto");
  const response = await fetch(API, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      `Speaker transcription failed [${response.status}]: ${error?.error?.message ?? "Please retry"}`,
    );
  }
  const json = (await response.json()) as {
    segments?: Array<{
      speaker?: string;
      text?: string;
      start?: number;
      end?: number;
      no_speech_prob?: number;
      avg_logprob?: number;
    }>;
  };
  if (!Array.isArray(json.segments)) throw new Error("Transcription returned no timed segments");
  const result: Segment[] = [];
  for (const segment of json.segments) {
    if (
      typeof segment.text !== "string" ||
      typeof segment.start !== "number" ||
      typeof segment.end !== "number" ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end) ||
      segment.start < 0 ||
      segment.end < segment.start
    )
      throw new Error("Transcription returned invalid timed segments");
    // Whisper can hallucinate speech over silent portions of an isolated channel.
    if (separateLegs && (segment.no_speech_prob ?? 0) > 0.6 && (segment.avg_logprob ?? 0) < -1)
      continue;
    const start = segment.start + window.offset;
    const end = segment.end + window.offset;
    const midpoint = (start + end) / 2;
    if (midpoint < window.keepFrom || midpoint >= window.keepUntil || !segment.text.trim())
      continue;
    if (
      !separateLegs &&
      (typeof segment.speaker !== "string" || !/^[A-Za-z0-9_-]+$/.test(segment.speaker))
    )
      throw new Error("Transcription returned no speaker labels");
    // Channel IDs stay stable across the whole call. Mixed-audio IDs are local to each part:
    // never pretend voice A in two independent diarization requests is the same person.
    result.push({
      speaker: separateLegs ? `Channel${channel + 1}` : `Part${window.part}_${segment.speaker}`,
      text: segment.text,
      start,
      end,
    });
  }
  return result;
}

async function downloadRecording(recordingUrl: string): Promise<PcmRecording> {
  const { accountSid, authToken } = twilioEnv();
  const media = new URL(recordingUrl);
  media.pathname = media.pathname.replace(/\.(mp3|wav|json)$/i, "") + ".wav";
  media.searchParams.set("RequestedChannels", "2");
  const headers = {
    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
  let response = await fetch(media, { signal: AbortSignal.timeout(60_000), headers });
  if (response.status === 400) {
    media.searchParams.set("RequestedChannels", "1");
    response = await fetch(media, { signal: AbortSignal.timeout(60_000), headers });
  }
  if (!response.ok) throw new Error(`Could not download recording [${response.status}]`);
  return readPcmWav(await response.arrayBuffer());
}

/** Read-only recording access; never changes the source audio or historical transcript. */
export async function transcribeRecording(
  recordingUrl: string,
  checkpoints?: RecordingCheckpoints,
): Promise<string> {
  const key = legalEnv["OPENAI_API_KEY"];
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const recording = await downloadRecording(recordingUrl);
  const fingerprint = createHash("sha256")
    .update("speaker-transcription-v1\n" + recordingUrl)
    .update(recording.bytes)
    .digest("hex");
  const parts = checkpoints ? await checkpoints.load(fingerprint) : {};
  const segments: Segment[] = [];
  const windows = recordingWindows(recording);
  for (const window of windows) {
    const partKey = (channel: number) => `${window.part}:${channel}`;
    const missingParts = Array.from({ length: recording.channels }, (_, channel) => channel).some(
      (channel) => !parts[partKey(channel)],
    );
    if (missingParts)
      checkpoints?.before(`Transcribing the call recording (${window.part} of ${windows.length})…`);
    // At most two API requests at a time and at most two small upload buffers.
    // Save successful channels even if the other channel needs another attempt.
    const results = await Promise.allSettled(
      Array.from({ length: recording.channels }, async (_, channel) => {
        const saved = parts[partKey(channel)];
        if (saved) return saved;
        const result = await transcribeWindow(
          recording,
          window,
          channel,
          key,
          checkpoints ? 90_000 : 240_000,
        );
        parts[partKey(channel)] = result;
        return result;
      }),
    );
    if (checkpoints && missingParts) await checkpoints.save(fingerprint, parts);
    const failed = results.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    for (const result of results) if (result.status === "fulfilled") segments.push(...result.value);
  }
  segments.sort((a, b) => a.start - b.start || a.end - b.end || a.speaker.localeCompare(b.speaker));
  if (!segments.length) throw new NoSpeechRecordingError();
  return formatSpeakerTranscript({ segments });
}

const recoverySchema = z.object({
  audioHash: z.string().regex(/^[a-f0-9]{64}$/),
  nextWindow: z.number().int().nonnegative(),
  totalWindows: z.number().int().positive(),
  segments: z.array(
    z.object({
      speaker: z.string().regex(/^[A-Za-z0-9_-]+$/),
      text: z.string(),
      start: z.number().finite().nonnegative(),
      end: z.number().finite().nonnegative(),
    }),
  ),
});
export type RecordingRecovery = z.infer<typeof recoverySchema>;

/** One small audio window per request; private checkpoints survive request/deploy interruptions. */
export async function transcribeRecordingStep(recordingUrl: string, checkpoint?: unknown) {
  const key = legalEnv["OPENAI_API_KEY"];
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const recording = await downloadRecording(recordingUrl);
  const audioHash = createHash("sha256").update(recording.bytes).digest("hex");
  const windows = recordingWindows(recording, 120);
  const parsed = recoverySchema.safeParse(checkpoint);
  const saved =
    parsed.success &&
    parsed.data.audioHash === audioHash &&
    parsed.data.totalWindows === windows.length &&
    parsed.data.nextWindow <= windows.length
      ? parsed.data
      : null;
  const nextWindow = saved?.nextWindow ?? 0;
  const segments = [...(saved?.segments ?? [])];
  const window = windows[nextWindow];
  if (window) {
    const results = await Promise.all(
      Array.from({ length: recording.channels }, (_, channel) =>
        transcribeWindow(recording, window, channel, key, 90_000),
      ),
    );
    for (const result of results) segments.push(...result);
  }
  const progress: RecordingRecovery = {
    audioHash,
    nextWindow: nextWindow + (window ? 1 : 0),
    totalWindows: windows.length,
    segments,
  };
  if (progress.nextWindow < windows.length) return { complete: false as const, progress };
  segments.sort((a, b) => a.start - b.start || a.end - b.end || a.speaker.localeCompare(b.speaker));
  if (!segments.length) throw new NoSpeechRecordingError();
  return { complete: true as const, transcript: formatSpeakerTranscript({ segments }) };
}
