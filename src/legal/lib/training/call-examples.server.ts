// Ported from the Legal app (family-law-floater/src/lib/training/call-examples.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Admin tool for the Sales Call Example module: read a real call's timed transcript, then
// publish a cleaned copy of its audio (both legs mixed, sensitive moments silenced) to the
// private training-media bucket. Never changes the original recording or the call record.

import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import {
  readPcmWav,
  recordingWindows,
  wavChannelSlice,
  type AudioWindow,
  type PcmRecording,
} from "@/legal/lib/recording-audio";
import { twilioEnv } from "@/legal/lib/twilio.server";

import { mixedWavWithSilence, type SilenceRange } from "./call-audio";

/**
 * Only ever send the Twilio login to Twilio, for a recording in our own account — never to
 * whatever address happens to be stored on a call record.
 */
function twilioRecordingUrl(recordingUrl: string): URL {
  const { accountSid } = twilioEnv();
  const url = new URL(recordingUrl);
  const ours = `/2010-04-01/Accounts/${accountSid}/Recordings/`;
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.twilio.com" ||
    !url.pathname.startsWith(ours)
  ) {
    throw new Error("That call's recording isn't a Twilio recording in our account.");
  }
  return url;
}

async function callRecord(callRecordId: string) {
  const { data, error } = await supabaseAdmin
    .from("call_records")
    .select("id, recording_url, transcript, duration_seconds")
    .eq("id", callRecordId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.recording_url) throw new Error("That call has no recording.");
  return data as {
    id: string;
    recording_url: string;
    transcript: string | null;
    duration_seconds: number | null;
  };
}

export type TimedText = { speaker: string; text: string; start: number; end: number };

/** The call's original recording, or the cleaned copy reps will hear (to check the silencing). */
export type TranscriptSource = { callRecordId: string } | { exampleId: string };

async function sourceRecording(source: TranscriptSource): Promise<PcmRecording> {
  if ("exampleId" in source) {
    const { data, error } = await supabaseAdmin.storage
      .from("training-media")
      .download(`calls/${source.exampleId}.wav`);
    if (error || !data) throw new Error("That example hasn't been published yet.");
    return readPcmWav(await data.arrayBuffer());
  }
  const call = await callRecord(source.callRecordId);
  return readPcmWav(await downloadWav(call.recording_url, 2));
}

/**
 * One ~10-minute piece of the call, transcribed with a timing for every word so a name or a
 * card number can be silenced on its own rather than with the whole sentence around it. The
 * page asks for each piece in turn, so no single request runs into the gateway's time limit.
 * Read-only: nothing is saved and the call's own transcript is never touched.
 */
export async function transcriptPart(source: TranscriptSource, part: number) {
  const key = legalEnv["OPENAI_API_KEY"];
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const recording = await sourceRecording(source);
  const windows = recordingWindows(recording);
  const window = windows[part];
  if (!window) return { parts: windows.length, segments: [], words: [] };
  const results = await Promise.all(
    Array.from({ length: recording.channels }, (_, channel) =>
      timedWords(recording, window, channel, key),
    ),
  );
  return {
    parts: windows.length,
    segments: results.flatMap((r) => r.segments),
    words: results.flatMap((r) => r.words),
  };
}

async function timedWords(
  recording: PcmRecording,
  window: AudioWindow,
  channel: number,
  key: string,
): Promise<{ segments: TimedText[]; words: TimedText[] }> {
  const speaker = recording.channels === 2 ? `Channel${channel + 1}` : "Mixed";
  const form = new FormData();
  form.append(
    "file",
    new Blob([wavChannelSlice(recording, channel, window.startFrame, window.endFrame)], {
      type: "audio/wav",
    }),
    "call.wav",
  );
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("language", "en");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    signal: AbortSignal.timeout(240_000),
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`Transcription failed [${res.status}]: ${body?.error?.message ?? "retry"}`);
  }
  const json = (await res.json()) as {
    segments?: {
      text?: unknown;
      start?: unknown;
      end?: unknown;
      no_speech_prob?: number;
      avg_logprob?: number;
    }[];
    words?: { word?: unknown; start?: unknown; end?: unknown }[];
  };
  // Pieces overlap by two seconds: keep each line or word in the one piece it's centred in.
  const keep = (items: { text?: unknown; start?: unknown; end?: unknown }[]) =>
    items.flatMap((item) => {
      if (typeof item.text !== "string" || !item.text.trim()) return [];
      if (typeof item.start !== "number" || typeof item.end !== "number") return [];
      const start = item.start + window.offset;
      const end = item.end + window.offset;
      const middle = (start + end) / 2;
      if (middle < window.keepFrom || middle >= window.keepUntil) return [];
      return [{ speaker, text: item.text.trim(), start, end }];
    });
  // Whisper can invent speech over the quiet stretches of one leg (the other person talking).
  const heard = (json.segments ?? []).filter(
    (seg) => !((seg.no_speech_prob ?? 0) > 0.6 && (seg.avg_logprob ?? 0) < -1),
  );
  return {
    segments: keep(heard),
    words: keep((json.words ?? []).map((w) => ({ text: w.word, start: w.start, end: w.end }))),
  };
}

async function downloadWav(recordingUrl: string, channels: 1 | 2 = 1): Promise<ArrayBuffer> {
  const { accountSid, authToken } = twilioEnv();
  const media = twilioRecordingUrl(recordingUrl);
  media.pathname = media.pathname.replace(/\.(mp3|wav|json)$/i, "") + ".wav";
  // Publishing uses Twilio's own one-track mix (half the memory, and the server has a hard
  // cap). Transcribing wants the two legs apart; a call recorded in mono only has one.
  media.searchParams.set("RequestedChannels", String(channels));
  const headers = {
    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
  };
  let res = await fetch(media, { signal: AbortSignal.timeout(60_000), headers });
  if (res.status === 400 && channels === 2) {
    media.searchParams.set("RequestedChannels", "1");
    res = await fetch(media, { signal: AbortSignal.timeout(60_000), headers });
  }
  if (!res.ok) throw new Error(`Could not download the recording [${res.status}]`);
  return res.arrayBuffer();
}

/** Mix, silence and upload. Returns the bucket path and the true length for CALL_EXAMPLES. */
export async function publishExampleAudio(
  callRecordId: string,
  exampleId: string,
  silence: SilenceRange[],
) {
  const call = await callRecord(callRecordId);
  const recording = readPcmWav(await downloadWav(call.recording_url));
  const length = recording.frames / recording.sampleRate;
  const bad = silence.find((r) => r.end <= r.start || r.start >= length);
  if (bad) {
    throw new Error(
      `The range ${bad.start}-${bad.end} isn't inside this ${Math.round(length)}-second call.`,
    );
  }
  const wav = mixedWavWithSilence(recording, silence);
  const path = `calls/${exampleId}.wav`;
  const { error } = await supabaseAdmin.storage
    .from("training-media")
    .upload(path, wav, { contentType: "audio/wav", upsert: true });
  if (error) throw new Error(error.message);
  return {
    path,
    duration_s: Math.round(length),
    silencedSeconds: Math.round(silencedSeconds(silence, length)),
  };
}

/** Total seconds silenced, counting overlaps once and stopping at the end of the call. */
function silencedSeconds(ranges: SilenceRange[], length: number): number {
  const sorted = ranges
    .map((r) => ({ start: Math.max(0, r.start), end: Math.min(length, r.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  let total = 0;
  let reach = 0;
  for (const r of sorted) {
    const start = Math.max(r.start, reach);
    if (r.end > start) total += r.end - start;
    reach = Math.max(reach, r.end);
  }
  return total;
}
