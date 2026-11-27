// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/index.tsx). Re-run the port script to refresh.
import { Link, useNavigate } from "@/legal/runtime/router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Lock } from "lucide-react";

import { useTrainingStatus } from "@/legal/components/training/module-progress";
import { cn } from "@/legal/lib/utils";
import {
  awaitingContent,
  currentSlug,
  moduleDesc,
  TRAINING_MODULES,
  unlockedSlugs,
} from "@/legal/lib/training/registry";
import { getQuizTotalFn } from "@/legal/lib/training/training.functions";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { TrainingPage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Training — Legal Group Portal" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  const navigate = useNavigate();
  const status = useTrainingStatus();
  const quizTotalFn = useServerFn(getQuizTotalFn);
  const quizTotal = useQuery({
    queryKey: ["training-quiz-total"],
    queryFn: () => quizTotalFn(),
    staleTime: 5 * 60_000,
  });

  const total = TRAINING_MODULES.length;
  const s = status.data;
  const unlocked = s ? unlockedSlugs(s) : new Set<string>();
  const completed = s?.completed ?? {};
  const doneCount = TRAINING_MODULES.filter((m) => completed[m.slug]).length;
  const current = s ? currentSlug(s) : null;
  const notReady = awaitingContent();
  const questions = quizTotal.data?.total || 56;

  return (
    <div className="mx-auto max-w-[880px] px-5 py-8 sm:px-7">
      <h1 className="mb-1.5 text-[28px] font-bold tracking-tight text-foreground">
        Your Training Journey
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {s ? `${doneCount} of ${total} modules complete` : " "}
      </p>
      <div className="mb-7 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>

      <div className="flex flex-col gap-3">
        {TRAINING_MODULES.map((m, i) => {
          if (!s) {
            return <div key={m.slug} className="h-[78px] animate-pulse rounded-[10px] bg-muted" />;
          }
          const isUnlocked = unlocked.has(m.slug);
          const isComplete = !!completed[m.slug];
          const isCurrent = m.slug === current;

          const card = (
            <div
              className={cn(
                "group flex items-center gap-4 rounded-[10px] border px-5 py-[18px] transition-[border-color,box-shadow]",
                isCurrent ? "border-foreground" : "border-border",
                isUnlocked
                  ? "cursor-pointer bg-background hover:shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
                  : "cursor-not-allowed bg-muted/50 opacity-70",
                isUnlocked && !isCurrent && "hover:border-primary",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                  isComplete
                    ? "bg-green-600 text-white"
                    : isCurrent
                      ? "bg-foreground text-background"
                      : isUnlocked
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted text-muted-foreground/70",
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : isUnlocked ? (
                  i + 1
                ) : (
                  <Lock className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[15px] font-bold",
                      isUnlocked ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {m.title}
                  </span>
                  {isComplete && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      Done
                    </span>
                  )}
                  {isUnlocked && !isComplete && notReady.has(m.slug) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      Coming soon — skip for now
                    </span>
                  )}
                  {isCurrent && !isComplete && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      Current
                    </span>
                  )}
                  {!isUnlocked && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                      Locked
                    </span>
                  )}
                </div>
                <p className="m-0 text-[13px] leading-normal text-muted-foreground">
                  {moduleDesc(m, questions)}
                </p>
              </div>
              {m.slug === "sales-framework" && isUnlocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate({ to: "/training/sales-framework", search: { step: "drill" } });
                  }}
                  className="shrink-0 whitespace-nowrap rounded-full border border-primary bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary"
                  title="Jump straight to the 2-minute drill"
                >
                  ⚡ 2-min warm-up
                </button>
              )}
              <span className="shrink-0 text-lg text-muted-foreground/50">›</span>
            </div>
          );

          return isUnlocked ? (
            <Link key={m.slug} to={m.url} className="no-underline">
              {card}
            </Link>
          ) : (
            <div key={m.slug} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
