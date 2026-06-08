import { Fragment, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import {
  listRepTrainingProgress,
  type RepTrainingRow,
} from "@/lib/training-progress-admin.functions";
import { TRAINING_MODULES } from "@/lib/training-modules";

export function TrainingProgressSection() {
  const [rows, setRows] = useState<RepTrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const r = await listRepTrainingProgress();
      if (r.success) setRows(r.rows.filter((x) => x.email && x.is_active));
      else setError(r.error || "Failed to load training progress");
      setLoading(false);
    })();
  }, []);

  const totalModules = TRAINING_MODULES.length;

  return (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <GraduationCap className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Team Training Progress</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track which training modules each rep has completed.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : error ? (
        <div className="text-sm py-6 text-center border border-dashed border-destructive/40 rounded-lg text-destructive">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-lg">
          No active reps to display.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <th className="text-left px-4 py-2.5 font-semibold">Rep</th>
                <th className="text-left px-4 py-2.5 font-semibold">Progress</th>
                <th className="text-left px-4 py-2.5 font-semibold">Quiz</th>
                <th className="text-right px-4 py-2.5 font-semibold w-24">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const completed = r.completed_modules.length;
                const pct = Math.round((completed / totalModules) * 100);
                const isOpen = expanded === r.rep_id;
                return (
                  <Fragment key={r.rep_id}>
                    <tr className="border-t border-border">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[180px] h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground tabular-nums">
                            {completed}/{totalModules} ({pct}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.quiz_passed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-700 dark:text-green-400">
                            Passed · {r.quiz_best_score}%
                          </span>
                        ) : r.quiz_attempts > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            Best {r.quiz_best_score}% · {r.quiz_attempts} attempt{r.quiz_attempts === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not started</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpanded(isOpen ? null : r.rep_id)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {isOpen ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={4} className="px-4 py-3">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {TRAINING_MODULES.map((m) => {
                              const done = r.completed_modules.includes(m.slug);
                              return (
                                <li
                                  key={m.slug}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span
                                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                                      done
                                        ? "bg-green-500/20 text-green-700 dark:text-green-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {done ? "✓" : "·"}
                                  </span>
                                  <span className={done ? "text-foreground" : "text-muted-foreground"}>
                                    {m.title}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
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
    </section>
  );
}
