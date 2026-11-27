// Ported from the Legal app (family-law-floater/src/lib/training/quiz.server.ts). Re-run the port script to refresh.
// Knowledge Quiz on the server: questions go out without the answer key, answers come
// back and are graded here. 100% to pass, unlimited retries, the pass is sticky.

import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";

import { QUIZ_BANK, type QuizSection } from "./quiz-bank.server";
import { assertUnlocked, loadProgress } from "./training.server";

export type PublicQuizQuestion = {
  id: string;
  section: QuizSection;
  question: string;
  options: { id: string; text: string }[];
};

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

async function assertQuizOpen(userId: string) {
  const { status } = await loadProgress(userId);
  assertUnlocked(status, "knowledge-quiz");
  const { data, error } = await supabaseAdmin
    .from("rep_quiz_progress")
    .select("passed, best_score, attempts, passed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { quiz: data };
}

/** A freshly shuffled quiz (questions and options), with no answer key. */
export async function getQuiz(userId: string) {
  const { quiz } = await assertQuizOpen(userId);
  const questions: PublicQuizQuestion[] = shuffle(QUIZ_BANK).map((q) => ({
    id: q.id,
    section: q.section,
    question: q.question,
    options: shuffle(q.options).map((o) => ({ id: o.id, text: o.text })),
  }));
  return { total: QUIZ_BANK.length, alreadyPassed: quiz?.passed === true, questions };
}

/** Grade one attempt and record it. Returns only the score and which questions were missed. */
export async function submitQuiz(userId: string, answers: Record<string, string>) {
  const { quiz } = await assertQuizOpen(userId);
  const total = QUIZ_BANK.length;
  if (total === 0) throw new Error("The quiz isn't ready yet.");

  const known = new Set(QUIZ_BANK.map((q) => q.id));
  for (const id of Object.keys(answers)) {
    if (!known.has(id))
      throw new Error("That quiz is out of date — reload the page and try again.");
  }
  const wrong: { id: string; question: string }[] = [];
  for (const q of QUIZ_BANK) {
    const chosen = answers[q.id];
    if (!chosen) throw new Error("Answer every question before you submit.");
    if (!q.options.some((o) => o.id === chosen)) {
      throw new Error("That quiz is out of date — reload the page and try again.");
    }
    if (!q.options.find((o) => o.id === chosen)?.correct)
      wrong.push({ id: q.id, question: q.question });
  }
  const score = total - wrong.length;
  const passed = score === total;
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("rep_quiz_progress").upsert(
    {
      user_id: userId,
      attempts: (quiz?.attempts ?? 0) + 1,
      best_score: Math.max(quiz?.best_score ?? 0, score),
      total,
      passed: quiz?.passed === true || passed,
      passed_at: quiz?.passed_at ?? (passed ? now : null),
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);

  if (passed) {
    const { data: row } = await supabaseAdmin
      .from("rep_module_progress")
      .select("module_complete")
      .eq("user_id", userId)
      .eq("module_slug", "knowledge-quiz")
      .maybeSingle();
    if (!row?.module_complete) {
      const { error: moduleError } = await supabaseAdmin.from("rep_module_progress").upsert(
        {
          user_id: userId,
          module_slug: "knowledge-quiz",
          module_complete: true,
          completed_at: now,
        },
        { onConflict: "user_id,module_slug" },
      );
      if (moduleError) throw new Error(moduleError.message);
    }
  }
  return { score, total, passed, wrong };
}

/** Bank size, for "{total}-question" copy. Safe to share: no questions, no answers. */
export function quizTotal() {
  return QUIZ_BANK.length;
}
