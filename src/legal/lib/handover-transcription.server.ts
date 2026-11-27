// Ported from the Legal app (family-law-floater/src/lib/handover-transcription.server.ts). Re-run the port script to refresh.
import { transcribeRecording, type RecordingProgress } from "./recording-transcription.server";
import type { HandoverWork } from "./handover-work.server";

/** Completed audio parts survive retries, disconnects and different server instances. */
export async function transcribeHandoverRecording(
  callId: string,
  recordingUrl: string,
  work: HandoverWork,
): Promise<string> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const key = `handover_transcription:${callId}`;
  return transcribeRecording(recordingUrl, {
    before: work.before,
    async load(fingerprint) {
      const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .abortSignal(AbortSignal.timeout(10_000))
        .maybeSingle();
      if (error) throw new Error("Could not load saved transcription progress", { cause: error });
      const saved = data?.value as { fingerprint?: string; parts?: RecordingProgress } | null;
      if (saved?.fingerprint !== fingerprint || !saved.parts || typeof saved.parts !== "object")
        return {};
      return Object.fromEntries(
        Object.entries(saved.parts).filter(
          ([key, segments]) =>
            /^\d+:[01]$/.test(key) &&
            Array.isArray(segments) &&
            segments.every(
              (segment) =>
                segment &&
                typeof segment.text === "string" &&
                typeof segment.speaker === "string" &&
                Number.isFinite(segment.start) &&
                Number.isFinite(segment.end) &&
                segment.end >= segment.start,
            ),
        ),
      );
    },
    async save(fingerprint, parts) {
      const { error } = await supabaseAdmin
        .from("app_settings")
        .upsert({ key, value: { fingerprint, parts } }, { onConflict: "key" })
        .abortSignal(AbortSignal.timeout(10_000));
      if (error) throw new Error("Could not save transcription progress", { cause: error });
    },
  });
}
