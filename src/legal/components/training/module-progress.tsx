// Ported from the Legal app (family-law-floater/src/components/training/module-progress.tsx). Re-run the port script to refresh.
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@/legal/runtime/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { cn } from "@/legal/lib/utils";
import { loadModuleStatus, TRAINING_STATUS_KEY } from "@/legal/lib/training/progress";
import {
  awaitingContent,
  blockingModule,
  moduleBySlug,
  moduleNumber,
  nextModule,
  unlockedSlugs,
  type ModuleSlug,
} from "@/legal/lib/training/registry";
import { settled } from "@/legal/lib/training/save-queue";
import { completeTrainingModuleFn } from "@/legal/lib/training/training.functions";

export function useTrainingStatus() {
  return useQuery({ queryKey: TRAINING_STATUS_KEY, queryFn: loadModuleStatus });
}

/**
 * Wraps a module page. Shows the locked notice until the module is unlocked — the same
 * strictly-in-order rule the server enforces (admins always get in). Hooks belong in the
 * children, which render only when unlocked.
 */
export function ModuleGate({ slug, children }: { slug: ModuleSlug; children: ReactNode }) {
  const status = useTrainingStatus();
  if (status.isLoading || !status.data) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (unlockedSlugs(status.data).has(slug)) return <>{children}</>;
  const blocker = blockingModule(status.data, slug);

  return (
    <div className="flex min-h-full items-center justify-center bg-muted/40 p-6">
      <div className="max-w-[480px] rounded-2xl border bg-background p-8 text-center">
        <Lock className="mx-auto mb-3.5 size-10 text-primary" />
        <h1 className="mb-2 text-[22px] font-bold text-foreground">This module is locked</h1>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          Finish <strong className="text-foreground">{blocker?.title}</strong> first to unlock this
          module.
        </p>
        {blocker && (
          <Link
            to={blocker.url}
            className="inline-block rounded-[10px] bg-primary px-[22px] py-3 text-sm font-bold text-primary-foreground"
          >
            Go to {blocker.title} →
          </Link>
        )}
        <div className="mt-3.5">
          <Link to="/training" className="text-[13px] text-muted-foreground">
            ← Back to training
          </Link>
        </div>
      </div>
    </div>
  );
}

/** The standard module page: back link, heading, subtitle, content. */
export function ModulePage({
  slug,
  subtitle,
  title,
  wide,
  children,
}: {
  slug: ModuleSlug;
  /** Shown after "Module {n} — ". */
  subtitle: string;
  title?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("mx-auto w-full px-5 py-8 sm:px-8", wide ? "max-w-[1100px]" : "max-w-[960px]")}
    >
      <Link
        to="/training"
        className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-base">‹</span>
        <span>Back to Training</span>
      </Link>
      <h1 className="mb-2 text-[28px] font-bold text-foreground">
        {title ?? moduleBySlug(slug).title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Module {moduleNumber(slug)} — {subtitle}
      </p>
      {children}
    </div>
  );
}

/**
 * Sticky bottom bar. "Mark as complete" stays off until canComplete (admins can always
 * complete). The server re-checks before anything is saved; a refusal shows its reason.
 */
export function CompleteModuleBar({
  slug,
  canComplete,
  notReadyHint,
  beforeComplete,
}: {
  slug: ModuleSlug;
  canComplete: boolean;
  notReadyHint?: string;
  /** Runs first, e.g. to re-send any progress save that failed. */
  beforeComplete?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const status = useTrainingStatus();
  const complete = useServerFn(completeTrainingModuleFn);
  const next = nextModule(slug);

  const isAdmin = status.data?.isAdmin ?? false;
  const isDone = status.data?.completed[slug] === true;
  // Content not made yet: reps can't complete it, so they move straight on.
  const canSkip = !isDone && awaitingContent().has(slug);
  const effectiveCanComplete = canComplete || isAdmin;

  const mutation = useMutation({
    mutationFn: async () => {
      beforeComplete?.();
      // Progress saves still in flight must land before the server checks them.
      await settled(slug);
      return complete({ data: { slug } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TRAINING_STATUS_KEY }),
    onError: (e: Error) => toast.error(e.message),
  });
  const busy = mutation.isPending;
  const disabled = !isDone && (!effectiveCanComplete || busy);

  return (
    <div className="sticky bottom-0 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border-t bg-background px-5 py-3.5 shadow-[0_-4px_14px_rgba(0,0,0,0.04)]">
      <div className="text-[13px] text-muted-foreground">
        {isDone ? (
          <span className="inline-flex items-center gap-1.5 font-bold text-green-600">
            <CheckCircle2 className="size-4" /> Module complete
          </span>
        ) : canSkip && !isAdmin ? (
          <span>This module isn't ready yet — carry on to the next one for now.</span>
        ) : effectiveCanComplete ? (
          <span>
            {isAdmin && !canComplete
              ? "Admin override — you can mark this complete anytime."
              : "You're cleared to mark this module complete."}
          </span>
        ) : (
          <span>{notReadyHint ?? "Reach the end of the content to enable this."}</span>
        )}
      </div>
      <div className="flex gap-2.5">
        {!isDone && !(canSkip && !isAdmin) && (
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={disabled}
            className={cn(
              "rounded-[10px] px-5 py-[11px] text-sm font-bold text-primary-foreground",
              disabled ? "cursor-not-allowed bg-primary/30" : "bg-primary",
            )}
          >
            {busy ? "Saving…" : "Mark as complete"}
          </button>
        )}
        {(isDone || canSkip) && next && (
          <button
            type="button"
            onClick={() => navigate({ to: next.url })}
            className="rounded-[10px] bg-primary px-5 py-[11px] text-sm font-bold text-primary-foreground"
          >
            Next: {next.title} →
          </button>
        )}
        {isDone && !next && (
          <Link
            to="/training"
            className="inline-block rounded-[10px] bg-foreground px-5 py-[11px] text-sm font-bold text-background"
          >
            Back to training
          </Link>
        )}
      </div>
    </div>
  );
}
