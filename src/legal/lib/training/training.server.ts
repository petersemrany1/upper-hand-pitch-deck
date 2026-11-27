// Ported from the Legal app (family-law-floater/src/lib/training/training.server.ts). Re-run the port script to refresh.
// Server side of the Training Journey. Every write to rep_module_progress and
// rep_quiz_progress happens here, with the service role, after checking that the
// modules are done in order and that the module's own evidence is real.

import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import type { Json } from "@/legal/integrations/supabase/types";

import { CALL_EXAMPLES } from "./call-examples";
import { evidenceProblem, mergeWatch, parseState, type ModuleState } from "./completion";
import { contentFacts, MIN_PRACTICE_CALL_S } from "./content-facts";
import { MODULE_VIDEOS, isVideoModule } from "./media";
import { blockingModule, type ModuleSlug, type ModuleStatus } from "./registry";
import { DRILL_CARDS, SALES_BEATS } from "./sales-framework";
import { READ_ALONG_SECTIONS } from "./read-along";

export type StateUpdate =
  | {
      kind: "watch";
      videoId: string;
      furthest_s: number;
      duration_s: number;
      ended?: boolean | undefined;
    }
  | { kind: "section"; index: number }
  | { kind: "beat"; id: string }
  | { kind: "card"; id: string };

type ProgressRow = {
  module_slug: string;
  module_complete: boolean;
  completed_at: string | null;
  state: Json;
};

async function isActiveAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("sales_reps")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role === "admin";
}

export async function loadProgress(userId: string) {
  const [progress, quiz, isAdmin] = await Promise.all([
    supabaseAdmin
      .from("rep_module_progress")
      .select("module_slug, module_complete, completed_at, state")
      .eq("user_id", userId),
    supabaseAdmin.from("rep_quiz_progress").select("passed").eq("user_id", userId).maybeSingle(),
    isActiveAdmin(userId),
  ]);
  if (progress.error) throw new Error(progress.error.message);
  if (quiz.error) throw new Error(quiz.error.message);
  const rows = (progress.data ?? []) as ProgressRow[];
  const completed: Record<string, boolean> = {};
  for (const r of rows) if (r.module_complete) completed[r.module_slug] = true;
  const quizPassed = quiz.data?.passed === true;
  if (quizPassed) completed["knowledge-quiz"] = true;
  const status: ModuleStatus = { completed, quizPassed, isAdmin };
  return { rows, status };
}

export function assertUnlocked(status: ModuleStatus, slug: ModuleSlug) {
  const blocker = blockingModule(status, slug);
  if (blocker) throw new Error(`This module is locked — finish ${blocker.title} first.`);
}

/** Longest saved AI practice call, in seconds. */
async function longestPracticeCallS(userId: string): Promise<number | null> {
  const { longestPracticeCall } = await import("./practice.server");
  return longestPracticeCall(userId);
}

/** Mark a module complete after re-checking order and evidence. Admins bypass both checks. */
export async function completeModule(userId: string, slug: ModuleSlug) {
  const { rows, status } = await loadProgress(userId);
  if (status.completed[slug]) return { completed: true as const };

  if (!status.isAdmin) {
    assertUnlocked(status, slug);
    const row = rows.find((r) => r.module_slug === slug);
    const problem = evidenceProblem(slug, parseState(row?.state), contentFacts(), {
      quizPassed: status.quizPassed,
      longestPracticeCallS: slug === "ai" ? await longestPracticeCallS(userId) : null,
      minPracticeCallS: MIN_PRACTICE_CALL_S,
    });
    if (problem) throw new Error(problem);
  }

  const { error } = await supabaseAdmin.from("rep_module_progress").upsert(
    {
      user_id: userId,
      module_slug: slug,
      module_complete: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_slug" },
  );
  if (error) throw new Error(error.message);
  return { completed: true as const };
}

function addUnique<T>(list: T[] | undefined, item: T): T[] {
  const out = list ? [...list] : [];
  if (!out.includes(item)) out.push(item);
  return out;
}

/** Validate an update against the module's real content, then merge it into the saved state. */
export function applyStateUpdate(
  slug: ModuleSlug,
  state: ModuleState,
  update: StateUpdate,
  now: Date,
): ModuleState {
  switch (update.kind) {
    case "watch": {
      let knownDuration: number | undefined;
      if (isVideoModule(slug)) {
        const video = MODULE_VIDEOS[slug].find((v) => v.id === update.videoId);
        if (!video) throw new Error("Unknown video for this module.");
        knownDuration = video.duration_s;
      } else if (slug === "sales-call-example") {
        const call = CALL_EXAMPLES.find((c) => c.id === update.videoId);
        if (!call) throw new Error("Unknown call for this module.");
        knownDuration = call.duration_s;
      } else {
        throw new Error("This module has no videos.");
      }
      const watch = { ...(state.watch ?? {}) };
      watch[update.videoId] = mergeWatch(watch[update.videoId], update, now, knownDuration);
      return { ...state, watch };
    }
    case "section": {
      if (slug !== "read-along") throw new Error("Only the Read Along has sections.");
      if (update.index < 0 || update.index >= READ_ALONG_SECTIONS.length) {
        throw new Error("Unknown section.");
      }
      // Sections are reached in order: no skipping ahead past one never seen.
      const reached = state.sections ?? [];
      const nextAllowed = reached.length === 0 ? 0 : Math.max(...reached) + 1;
      if (update.index > nextAllowed) throw new Error("Read the sections in order.");
      return { ...state, sections: addUnique(reached, update.index).sort((a, b) => a - b) };
    }
    case "beat": {
      if (slug !== "sales-framework" || !SALES_BEATS.some((b) => b.id === update.id)) {
        throw new Error("Unknown beat.");
      }
      return { ...state, seen_beats: addUnique(state.seen_beats, update.id) };
    }
    case "card": {
      if (slug !== "sales-framework" || !DRILL_CARDS.some((c) => c.id === update.id)) {
        throw new Error("Unknown card.");
      }
      return { ...state, revealed_cards: addUnique(state.revealed_cards, update.id) };
    }
  }
}

/** Save progress inside a module (never completes it). */
export async function saveModuleState(userId: string, slug: ModuleSlug, update: StateUpdate) {
  const { rows, status } = await loadProgress(userId);
  assertUnlocked(status, slug);
  const row = rows.find((r) => r.module_slug === slug);
  const next = applyStateUpdate(slug, parseState(row?.state), update, new Date());
  const { error } = await supabaseAdmin
    .from("rep_module_progress")
    .upsert(
      { user_id: userId, module_slug: slug, state: next as unknown as Json },
      { onConflict: "user_id,module_slug" },
    );
  if (error) throw new Error(error.message);
  return { state: next };
}
