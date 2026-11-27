// Ported from the Legal app (family-law-floater/src/components/settings/training-card.tsx). Re-run the port script to refresh.
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/legal/components/ui/card";
import { supabase } from "@/legal/integrations/supabase/client";
import { formatSydney } from "@/legal/lib/timezone";
import { TRAINING_MODULES } from "@/legal/lib/training/registry";

type StaffProgress = {
  userId: string;
  name: string;
  role: string;
  done: Record<string, string | null>;
  lastActivity: string | null;
  quiz: { passed: boolean; best: number; total: number; attempts: number } | null;
};

async function loadTeamProgress(): Promise<StaffProgress[]> {
  const [staff, progress, quiz] = await Promise.all([
    supabase
      .from("sales_reps")
      .select("user_id, name, email, role")
      .eq("is_active", true)
      .not("user_id", "is", null)
      .order("name"),
    supabase
      .from("rep_module_progress")
      .select("user_id, module_slug, module_complete, completed_at, updated_at"),
    supabase
      .from("rep_quiz_progress")
      .select("user_id, passed, best_score, total, attempts, updated_at"),
  ]);
  if (staff.error) throw staff.error;
  if (progress.error) throw progress.error;
  if (quiz.error) throw quiz.error;

  return (staff.data ?? []).map((s) => {
    const rows = (progress.data ?? []).filter((r) => r.user_id === s.user_id);
    const q = (quiz.data ?? []).find((r) => r.user_id === s.user_id) ?? null;
    const done: Record<string, string | null> = {};
    for (const r of rows) if (r.module_complete) done[r.module_slug] = r.completed_at;
    if (q?.passed && !("knowledge-quiz" in done)) done["knowledge-quiz"] = null;
    const times = [...rows.map((r) => r.updated_at), ...(q ? [q.updated_at] : [])].sort();
    return {
      userId: s.user_id!,
      name: s.name || s.email || "Unnamed",
      role: s.role,
      done,
      lastActivity: times.at(-1) ?? null,
      quiz: q
        ? { passed: q.passed, best: q.best_score, total: q.total, attempts: q.attempts }
        : null,
    };
  });
}

function quizLabel(q: StaffProgress["quiz"]) {
  if (!q || q.attempts === 0) return "Not started";
  const tries = `${q.attempts} attempt${q.attempts === 1 ? "" : "s"}`;
  return q.passed
    ? `Passed · ${q.best}/${q.total} · ${tries}`
    : `Best ${q.best}/${q.total} · ${tries}`;
}

/** Admin: open Training to reps, and see every rep's progress through the journey. */
export function TrainingCard() {
  const team = useQuery({ queryKey: ["team-training-progress"], queryFn: loadTeamProgress });
  const [open, setOpen] = useState<string | null>(null);

  const total = TRAINING_MODULES.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Training Progress</CardTitle>
        <CardDescription>
          Track the Training Journey. Choose who can open Training using each person’s tab access
          above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {team.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : team.error ? (
          <p className="text-sm text-destructive">
            Couldn't load progress — has the training migration been run? (
            {(team.error as Error).message})
          </p>
        ) : (team.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No active reps to display.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Rep</th>
                  <th className="py-2 pr-3 font-medium">Progress</th>
                  <th className="py-2 pr-3 font-medium">Quiz</th>
                  <th className="py-2 pr-3 font-medium">Last activity</th>
                  <th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {(team.data ?? []).map((p) => {
                  const doneCount = TRAINING_MODULES.filter((m) => m.slug in p.done).length;
                  const isOpen = open === p.userId;
                  return (
                    <Fragment key={p.userId}>
                      <tr className="border-b align-middle">
                        <td className="py-2 pr-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs capitalize text-muted-foreground">{p.role}</div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${(doneCount / total) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {doneCount}/{total}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-xs">{quizLabel(p.quiz)}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">
                          {p.lastActivity ? formatSydney(p.lastActivity) : "—"}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : p.userId)}
                            className="inline-flex items-center gap-1 text-xs text-primary"
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3" />
                            ) : (
                              <ChevronRight className="size-3" />
                            )}
                            {isOpen ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b bg-muted/30">
                          <td colSpan={5} className="px-3 py-2">
                            <ol className="space-y-1 text-xs">
                              {TRAINING_MODULES.map((m, i) => (
                                <li key={m.slug} className="flex justify-between gap-3">
                                  <span>
                                    {i + 1}. {m.title}
                                  </span>
                                  <span
                                    className={
                                      m.slug in p.done ? "text-green-700" : "text-muted-foreground"
                                    }
                                  >
                                    {m.slug in p.done
                                      ? p.done[m.slug]
                                        ? `Done ${formatSydney(p.done[m.slug]!, { dateStyle: "medium" })}`
                                        : "Done"
                                      : "—"}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
