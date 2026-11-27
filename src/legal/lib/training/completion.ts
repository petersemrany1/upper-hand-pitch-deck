// Ported from the Legal app (family-law-floater/src/lib/training/completion.ts). Re-run the port script to refresh.
// Pure rules for training progress: what a module's saved `state` looks like, how a
// new watch position is merged in (and clamped if it's implausible), and whether a
// module's own evidence is good enough to mark it complete. The server function uses
// these; nothing here trusts the browser's word that a module is done.

import {
  FILE_PASS_RATIO,
  MAX_PLAYBACK_RATE,
  MODULE_VIDEOS,
  YOUTUBE_PASS_RATIO,
  isVideoModule,
  type TrainingVideo,
} from "./media";
import type { ModuleSlug } from "./registry";

export type WatchEntry = {
  furthest_s: number;
  duration_s: number;
  ended?: boolean;
  saved_at: string;
};

export type ModuleState = {
  /** Video (or call recording) id → how far it has genuinely been played. */
  watch?: Record<string, WatchEntry>;
  /** Read Along: indexes of the sections reached. */
  sections?: number[];
  /** Sales Framework: beats opened and Drill cards revealed. */
  seen_beats?: string[];
  revealed_cards?: string[];
  /** No longer used (Module 6 dropped its check questions on 11 Oct 2026); kept so old rows parse. */
  checks_passed?: string[];
};

export function parseState(raw: unknown): ModuleState {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as ModuleState) : {};
}

/** A first save may claim at most this much progress; later saves are limited by real time. */
export const FIRST_SAVE_ALLOWANCE_S = 30;
/** Slack for network delays and timer drift between saves. */
export const SAVE_TOLERANCE_S = 15;

/**
 * Merge a new watch report into the saved one. Progress never goes backwards, and it can
 * never run faster than real time × the maximum playback speed since the last save.
 */
export function mergeWatch(
  prev: WatchEntry | undefined,
  incoming: { furthest_s: number; duration_s: number; ended?: boolean | undefined },
  now: Date,
  knownDuration?: number,
): WatchEntry {
  const duration = knownDuration ?? Math.max(prev?.duration_s ?? 0, incoming.duration_s);
  let allowed: number;
  if (!prev) {
    allowed = FIRST_SAVE_ALLOWANCE_S;
  } else {
    const elapsed = Math.max(0, (now.getTime() - Date.parse(prev.saved_at)) / 1000);
    allowed = prev.furthest_s + elapsed * MAX_PLAYBACK_RATE + SAVE_TOLERANCE_S;
  }
  const claimed = Math.min(incoming.furthest_s, duration);
  const furthest = Math.max(prev?.furthest_s ?? 0, Math.min(claimed, allowed));
  // "Ended" only counts if the furthest point genuinely reached is near the end.
  const ended = !!prev?.ended || (!!incoming.ended && furthest >= duration * YOUTUBE_PASS_RATIO);
  return {
    furthest_s: Math.round(furthest * 10) / 10,
    duration_s: duration,
    ended,
    saved_at: now.toISOString(),
  };
}

export function watchPasses(video: TrainingVideo, entry: WatchEntry | undefined): boolean {
  if (!entry) return false;
  const duration = video.duration_s ?? entry.duration_s;
  if (!(duration > 0)) return false;
  const ratio = entry.furthest_s / duration;
  return video.kind === "youtube"
    ? ratio >= YOUTUBE_PASS_RATIO && !!entry.ended
    : ratio >= FILE_PASS_RATIO;
}

/** Facts about the current content the evidence check needs (counts and ids). */
export type ContentFacts = {
  readAlongSectionCount: number;
  salesFramework: { beatIds: readonly string[]; cardIds: readonly string[]; strict: boolean };
  /** Every example call, with its true length: a rep must hear each one all the way through. */
  callExamples: readonly { id: string; duration_s: number }[];
};

export type OtherEvidence = {
  quizPassed: boolean;
  /** Longest saved AI practice call in seconds, or null when there are none. */
  longestPracticeCallS: number | null;
  minPracticeCallS: number;
};

/**
 * Null when the module's own evidence is enough to complete it; otherwise the plain-English
 * reason shown to the rep.
 */
export function evidenceProblem(
  slug: ModuleSlug,
  state: ModuleState,
  facts: ContentFacts,
  other: OtherEvidence,
): string | null {
  if (isVideoModule(slug)) {
    const videos = MODULE_VIDEOS[slug];
    if (videos.length === 0) return "The video for this module isn't ready yet.";
    const missing = videos.filter((v) => !watchPasses(v, state.watch?.[v.id]));
    if (missing.length === 0) return null;
    return videos.length === 1
      ? "Finish the video first — we didn't see it play to the end."
      : `Finish every video first — ${missing.length} still to watch to the end.`;
  }
  switch (slug) {
    case "read-along": {
      const n = facts.readAlongSectionCount;
      if (n === 0) return "The Read Along isn't ready yet.";
      const reached = new Set(state.sections ?? []);
      for (let i = 0; i < n; i++) {
        if (!reached.has(i)) return "Step through every section to the end first.";
      }
      return null;
    }
    case "sales-framework": {
      const { beatIds, cardIds, strict } = facts.salesFramework;
      if (beatIds.length === 0) return "The Sales Framework isn't ready yet.";
      if (!strict) return null;
      const seen = new Set(state.seen_beats ?? []);
      if (beatIds.some((id) => !seen.has(id))) return "Open every beat in The Beats first.";
      const revealed = new Set(state.revealed_cards ?? []);
      const left = cardIds.filter((id) => !revealed.has(id)).length;
      if (left > 0) return `Reveal every Drill card once first — ${left} to go.`;
      return null;
    }
    case "sales-call-example": {
      const calls = facts.callExamples;
      if (calls.length === 0) return "The example calls aren't ready yet.";
      const left = calls.filter(
        (c) =>
          !watchPasses(
            { id: c.id, title: c.id, kind: "file", src: "", duration_s: c.duration_s },
            state.watch?.[c.id],
          ),
      ).length;
      if (left === 0) return null;
      return `Listen to every call all the way through — ${left} still to go.`;
    }
    case "knowledge-quiz":
      return other.quizPassed ? null : "Pass the quiz with 100% to complete this module.";
    case "ai":
      return other.longestPracticeCallS !== null &&
        other.longestPracticeCallS >= other.minPracticeCallS
        ? null
        : `Finish an AI practice call of at least ${Math.round(other.minPracticeCallS / 60)} minutes first.`;
    default:
      return "Unknown module.";
  }
}
