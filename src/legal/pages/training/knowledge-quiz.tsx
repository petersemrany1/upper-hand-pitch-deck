// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/knowledge-quiz.tsx). Re-run the port script to refresh.
import { Link, useNavigate } from "@/legal/runtime/router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ListChecks } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ModuleGate } from "@/legal/components/training/module-progress";
import { cn } from "@/legal/lib/utils";
import { TRAINING_STATUS_KEY } from "@/legal/lib/training/progress";
import { moduleNumber, nextModule } from "@/legal/lib/training/registry";
import { getQuizFn, submitQuizFn } from "@/legal/lib/training/training.functions";

const LegalRoutePage = () => (
    <ModuleGate slug="knowledge-quiz">
      <KnowledgeQuiz />
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Knowledge Quiz — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

type Question = Awaited<ReturnType<typeof getQuizFn>>["questions"][number];

const SECTION_LABEL: Record<Question["section"], string> = {
  framework: "Framework",
  product: "Product",
  skills: "Skills",
  process: "Process",
};

function KnowledgeQuiz() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getQuiz = useServerFn(getQuizFn);
  const submitQuiz = useServerFn(submitQuizFn);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
    wrong: { id: string; question: string }[];
  } | null>(null);

  // Every load (and every "Try again") reshuffles questions and options on the server.
  const loadAndShuffle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    setCurrent(0);
    try {
      const quiz = await getQuiz();
      setQuestions(quiz.questions);
      setAlreadyPassed(quiz.alreadyPassed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the quiz.");
    } finally {
      setLoading(false);
    }
  }, [getQuiz]);

  useEffect(() => {
    void loadAndShuffle();
  }, [loadAndShuffle]);

  const total = questions.length;
  const q = questions[current];
  const selected = q ? answers[q.id] : undefined;
  const allAnswered = total > 0 && questions.every((x) => answers[x.id]);
  const isLast = current === total - 1;
  const next = nextModule("knowledge-quiz");

  const submit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    try {
      const r = await submitQuiz({ data: { answers } });
      setResult(r);
      if (r.passed) {
        setAlreadyPassed(true);
        await queryClient.invalidateQueries({ queryKey: TRAINING_STATUS_KEY });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit the quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <div className="mx-auto max-w-[720px] px-6 pt-6">
      <Link
        to="/training" search={{ biz: "legal" } as never}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-base">‹</span>
        <span>Back to Training</span>
      </Link>
      <h1 className="mt-2 text-[22px] font-bold">Knowledge Quiz</h1>
      <p className="text-[13px] text-muted-foreground">
        Module {moduleNumber("knowledge-quiz")} — {total || "Every"} questions. You need 100% to
        pass. You can retake it as many times as you need.
      </p>
    </div>
  );

  if (loading) {
    return (
      <>
        {header}
        <div className="p-10 text-center text-sm text-muted-foreground">Loading quiz…</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-[640px] p-6 text-sm text-destructive">{error}</div>
      </>
    );
  }

  if (total === 0) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-[640px] px-6 py-10">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-10 text-center">
            <ListChecks className="size-10 text-muted-foreground" />
            <p className="text-sm font-bold">The quiz is being written.</p>
            <p className="max-w-md text-xs text-muted-foreground">
              It tests only what Modules 1–6 teach, so it goes live once they do.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (result) {
    // Misses are numbered by where they appeared in this attempt.
    const position = (id: string) => questions.findIndex((x) => x.id === id) + 1;
    const wrong = [...result.wrong].sort((a, b) => position(a.id) - position(b.id));
    return (
      <>
        {header}
        <div className="mx-auto max-w-[640px] px-6 py-10">
          {result.passed ? (
            <div className="rounded-2xl border bg-background p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 size-14 text-green-600" />
              <h2 className="mb-1.5 text-[26px] font-bold">Passed — Knowledge Quiz complete</h2>
              <p className="mb-6 text-muted-foreground">
                You scored {result.score}/{result.total}.
              </p>
              {next && (
                <button
                  type="button"
                  onClick={() => navigate({ to: next.url })}
                  className="rounded-[10px] bg-primary px-[22px] py-3.5 text-[15px] font-bold text-primary-foreground"
                >
                  Next: {next.title} →
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border bg-background p-8">
              <h2 className="mb-2 text-2xl font-bold">
                You got {result.score}/{result.total}
              </h2>
              <p className="mb-[18px] text-muted-foreground">
                100% is needed to continue. Review the questions below, then try again.
              </p>
              <div className="mb-[22px] rounded-[10px] border border-orange-200 bg-orange-50 p-4">
                <div className="mb-2.5 text-[13px] font-bold text-orange-800">
                  Questions you got wrong:
                </div>
                <div className="flex flex-col gap-2.5">
                  {wrong.map((w) => (
                    <div key={w.id} className="text-sm leading-snug text-orange-900">
                      <span className="font-bold">Q{position(w.id)}:</span> {w.question}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => void loadAndShuffle()}
                  className="rounded-[10px] bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/training" })}
                  className="rounded-[10px] border bg-background px-5 py-3 text-sm font-bold"
                >
                  Back to training
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  if (!q) return null;
  const progressPct = ((current + (selected ? 1 : 0)) / total) * 100;

  return (
    <>
      {header}
      <div className="mx-auto max-w-[720px] px-6 pb-[60px] pt-7">
        {alreadyPassed && (
          <div className="mb-[18px] rounded-[10px] border border-green-200 bg-green-50 px-3.5 py-2.5 text-[13px] text-green-800">
            You've already passed this quiz. Retaking it won't lock you out.
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted-foreground">
            Question {current + 1} of {total}
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-[3px] text-[11px] font-bold uppercase tracking-wide text-primary">
            {SECTION_LABEL[q.section]}
          </span>
        </div>
        <div className="mb-7 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <h2 className="mb-[22px] text-[22px] font-bold leading-snug">{q.question}</h2>

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl border-[1.5px] px-[18px] py-4 text-left text-[15px] transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-background",
                )}
              >
                <span
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 bg-background",
                  )}
                >
                  {isSelected && <span className="size-2 rounded-full bg-background" />}
                </span>
                <span className="flex-1 leading-snug">{opt.text}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex justify-between">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className={cn(
              "rounded-[10px] border bg-background px-5 py-3 text-sm font-bold",
              current === 0 && "cursor-not-allowed text-muted-foreground/50",
            )}
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!allAnswered || submitting}
              className={cn(
                "rounded-[10px] px-6 py-3 text-sm font-bold text-primary-foreground",
                allAnswered && !submitting ? "bg-primary" : "cursor-not-allowed bg-primary/30",
              )}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              disabled={!selected}
              className={cn(
                "rounded-[10px] px-6 py-3 text-sm font-bold text-primary-foreground",
                selected ? "bg-primary" : "cursor-not-allowed bg-primary/30",
              )}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </>
  );
}
