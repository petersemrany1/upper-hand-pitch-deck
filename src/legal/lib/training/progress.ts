// Ported from the Legal app (family-law-floater/src/lib/training/progress.ts). Re-run the port script to refresh.
// Browser-side reads of training progress. Reps can read their own rows (admins read
// everyone's); every write goes through the server functions in training.functions.ts.

import { supabase } from "@/legal/integrations/supabase/client";

import { parseState, type ModuleState } from "./completion";
import type { ModuleSlug, ModuleStatus } from "./registry";

export const TRAINING_STATUS_KEY = ["training-status"] as const;
export const moduleStateKey = (slug: ModuleSlug) => ["training-state", slug] as const;

export async function loadIsAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc("is_admin_user");
  return data === true;
}

export async function loadModuleStatus(): Promise<ModuleStatus> {
  const empty: ModuleStatus = { completed: {}, quizPassed: false, isAdmin: false };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return empty;

  const [progress, quiz, isAdmin] = await Promise.all([
    supabase.from("rep_module_progress").select("module_slug, module_complete").eq("user_id", uid),
    supabase.from("rep_quiz_progress").select("passed").eq("user_id", uid).maybeSingle(),
    loadIsAdmin(),
  ]);
  const completed: Record<string, boolean> = {};
  for (const row of progress.data ?? []) if (row.module_complete) completed[row.module_slug] = true;
  // Passing the quiz completes the quiz module.
  if (quiz.data?.passed) completed["knowledge-quiz"] = true;
  return { completed, quizPassed: !!quiz.data?.passed, isAdmin };
}

/** The saved in-module progress (watch positions, sections reached…). */
export async function loadModuleState(slug: ModuleSlug): Promise<ModuleState> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return {};
  const { data } = await supabase
    .from("rep_module_progress")
    .select("state")
    .eq("user_id", uid)
    .eq("module_slug", slug)
    .maybeSingle();
  return parseState(data?.state);
}

export type TrainingSettings = { reps_can_see: boolean };

export async function loadTrainingSettings(): Promise<TrainingSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "training")
    .maybeSingle();
  const value = data?.value as { reps_can_see?: unknown } | null;
  return { reps_can_see: value?.reps_can_see === true };
}

export async function saveTrainingSettings(settings: TrainingSettings): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "training", value: settings }, { onConflict: "key" });
  if (error) throw error;
}
