// Ported from the Legal app (family-law-floater/src/lib/handover-check.server.ts). Re-run the port script to refresh.
import { generateVerifiedIntel } from "./ai-analysis.server";
import { handoverCheckSources, handoverCheckAssertions } from "./handover-check-fixture";
import { handoverWork, HandoverContinuation, retryableIntelError } from "./handover-work.server";
import { formatIntelNotes, renderIntelHtml } from "./handover-intel-format";
import type { IntelProgress } from "./intel-progress.server";
import type { HandoverIntelResult } from "./handover-stream";

export type HandoverCheckResult = HandoverIntelResult & {
  progress: IntelProgress;
  checks?: Array<{ label: string; passed: boolean }>;
  html?: string;
};

/** No database or delivery calls. Only fixed fictional sources reach the real AI providers. */
export async function runHandoverCheck(
  long: boolean,
  progress: IntelProgress,
): Promise<HandoverCheckResult> {
  try {
    const bullets = await generateVerifiedIntel(
      handoverCheckSources(long),
      "Taylor Sample",
      progress,
      async () => {},
      handoverWork(),
    );
    const notes = formatIntelNotes(bullets, "Taylor Sample");
    return {
      notes,
      progress,
      checks: handoverCheckAssertions(bullets, long),
      html: renderIntelHtml(notes),
    };
  } catch (error) {
    if (error instanceof HandoverContinuation)
      return { notes: null, pending: true, stage: error.stage, progress };
    return {
      notes: null,
      error: error instanceof Error ? error.message : String(error),
      retryable: retryableIntelError(error),
      progress,
    };
  }
}
