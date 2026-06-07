import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string): Promise<void> {
  const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !u?.user?.email) throw new Error("Could not verify caller");
  const { data: rep } = await supabaseAdmin
    .from("sales_reps")
    .select("role")
    .ilike("email", u.user.email)
    .maybeSingle();
  if (rep?.role !== "admin") throw new Error("Forbidden: admin only");
}

export type RepTrainingRow = {
  rep_id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  completed_modules: string[];
  quiz_passed: boolean;
  quiz_best_score: number;
  quiz_attempts: number;
  quiz_passed_at: string | null;
};

export const listRepTrainingProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ success: true; rows: RepTrainingRow[] } | { success: false; error: string; rows: [] }> => {
    try { await assertAdmin(context.userId); } catch (e) {
      return { success: false as const, error: (e as Error).message, rows: [] };
    }

    // Get all reps
    const { data: reps, error: repsErr } = await supabaseAdmin
      .from("sales_reps")
      .select("id, name, email, role, is_active")
      .order("name", { ascending: true });
    if (repsErr) return { success: false as const, error: repsErr.message, rows: [] };

    // Get all auth users so we can map email -> auth uid (progress is keyed on auth uid)
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const emailToAuthId = new Map<string, string>();
    for (const u of usersList?.users ?? []) {
      if (u.email) emailToAuthId.set(u.email.toLowerCase(), u.id);
    }

    // Pull all progress rows in two queries
    const [{ data: modProgress }, { data: quizProgress }] = await Promise.all([
      supabaseAdmin.from("rep_module_progress").select("user_id, module_slug, module_complete"),
      supabaseAdmin.from("rep_quiz_progress").select("user_id, passed, best_score, attempts, passed_at"),
    ]);

    const completedByUser = new Map<string, string[]>();
    for (const r of modProgress ?? []) {
      if (!r.module_complete) continue;
      const arr = completedByUser.get(r.user_id) ?? [];
      arr.push(r.module_slug);
      completedByUser.set(r.user_id, arr);
    }
    const quizByUser = new Map<string, { passed: boolean; best_score: number; attempts: number; passed_at: string | null }>();
    for (const q of quizProgress ?? []) {
      quizByUser.set(q.user_id, {
        passed: !!q.passed,
        best_score: q.best_score ?? 0,
        attempts: q.attempts ?? 0,
        passed_at: q.passed_at,
      });
    }

    const rows: RepTrainingRow[] = (reps ?? []).map((rep) => {
      // Match by sales_reps.id first, then by email -> auth uid.
      const authId = rep.email ? emailToAuthId.get(rep.email.toLowerCase()) : undefined;
      const completed =
        completedByUser.get(rep.id) ??
        (authId ? completedByUser.get(authId) : undefined) ??
        [];
      const quiz =
        quizByUser.get(rep.id) ??
        (authId ? quizByUser.get(authId) : undefined) ??
        { passed: false, best_score: 0, attempts: 0, passed_at: null };
      const completedSet = new Set(completed);
      if (quiz.passed) completedSet.add("knowledge-quiz");
      return {
        rep_id: rep.id,
        name: rep.name,
        email: rep.email,
        role: rep.role,
        is_active: rep.is_active !== false,
        completed_modules: Array.from(completedSet),
        quiz_passed: quiz.passed,
        quiz_best_score: quiz.best_score,
        quiz_attempts: quiz.attempts,
        quiz_passed_at: quiz.passed_at,
      };
    });

    return { success: true as const, rows };
  });
