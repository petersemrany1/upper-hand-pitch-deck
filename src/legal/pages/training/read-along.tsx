// Ported from the Legal app (family-law-floater/src/routes/_authenticated/training/read-along.tsx). Re-run the port script to refresh.
import { Link } from "@/legal/runtime/router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CompleteModuleBar, ModuleGate } from "@/legal/components/training/module-progress";
import { useModuleState } from "@/legal/components/training/training-video";
import { cn } from "@/legal/lib/utils";
import {
  CONTENT_CURRENT_AS_AT,
  READ_ALONG_INTRO,
  READ_ALONG_SECTIONS,
} from "@/legal/lib/training/read-along";
import { moduleNumber } from "@/legal/lib/training/registry";
import { queuedSave, withRetry } from "@/legal/lib/training/save-queue";
import { saveModuleStateFn } from "@/legal/lib/training/training.functions";

const LegalRoutePage = () => (
    <ModuleGate slug="read-along">
      <ReadAlong />
    </ModuleGate>
  );

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { LegalRoutePage as LegalPage };
export const Route = legalRoute({
  head: () => ({ meta: [{ title: "Read Along — Legal Group Portal" }] }),
  component: LegalRoutePage,
});

function ReadAlong() {
  const sections = READ_ALONG_SECTIONS;
  const total = sections.length;
  const state = useModuleState("read-along");
  const save = useServerFn(saveModuleStateFn);
  const [index, setIndex] = useState<number | null>(null);
  const [reached, setReached] = useState<Set<number>>(new Set());
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  /** Sections the server has confirmed. The server only accepts them in order. */
  const savedRef = useRef<Set<number>>(new Set());
  const firstRender = useRef(true);

  // Resume at the furthest section reached.
  useEffect(() => {
    if (index !== null || state.isLoading) return;
    const saved = new Set(state.data?.sections ?? []);
    savedRef.current = new Set(saved);
    setReached(saved);
    const furthest = saved.size ? Math.max(...saved) : 0;
    setIndex(Math.min(furthest, Math.max(0, total - 1)));
  }, [state.isLoading, state.data, index, total]);

  // Save every reached section the server hasn't confirmed, in order, one at a time.
  // A failed save is retried with a pause; anything still missing is sent again on the
  // next section and just before "Mark as complete".
  const syncUpTo = useCallback(
    (upTo: number) => {
      void queuedSave("read-along", async () => {
        for (let i = 0; i <= upTo; i++) {
          if (savedRef.current.has(i)) continue;
          await withRetry(() =>
            save({ data: { slug: "read-along", update: { kind: "section", index: i } } }),
          );
          savedRef.current.add(i);
        }
      }).catch(() => {});
    },
    [save],
  );

  useEffect(() => {
    if (index === null || total === 0) return;
    setReached((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    syncUpTo(index);
  }, [index, syncUpTo, total]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index]);

  const allReached = total > 0 && reached.size >= total;

  return (
    <div className="mx-auto max-w-[760px] px-5 pb-14 pt-6 text-foreground antialiased sm:px-7">
      <Link
        to="/training" search={{ biz: "legal" } as never}
        className="mb-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-base">‹</span>
        <span>Back to Training</span>
      </Link>
      <h1 className="mb-1.5 text-[21px] font-bold tracking-tight">
        Read Along — Family Law Product Knowledge
      </h1>
      <p className="mb-3.5 text-[13px] text-muted-foreground">
        Module {moduleNumber("read-along")} — The full written deep-dive. Read this alongside the
        videos.
      </p>

      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-10 text-center">
          <BookOpen className="size-10 text-muted-foreground" />
          <p className="text-sm font-bold">The Read Along is being written.</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Every legal statement in it is checked against official sources before it goes live.
          </p>
        </div>
      ) : index === null || !sections[index] ? (
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      ) : (
        <>
          {index === 0 && (
            <p className="mb-[18px] text-sm italic leading-[1.7] text-muted-foreground">
              Built on one spine: why you're here → understand the client one level deeper than they
              do → the one idea that explains everything → the solution → the alternatives → the
              barriers, one by one → how you say it. {READ_ALONG_INTRO}
            </p>
          )}

          <div className="mb-3.5">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>
                Section {index + 1} of {total}
              </span>
              <span>{Math.round(((index + 1) / total) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.round(((index + 1) / total) * 100)}%` }}
              />
            </div>
          </div>

          <section className="rounded-xl border bg-background px-[26px] py-6">
            <h2 ref={headingRef} className="mb-3.5 scroll-mt-4 text-xl font-bold tracking-tight">
              {sections[index]!.title}
            </h2>
            {sections[index]!.paragraphs.map((p, i) =>
              p.startsWith("How to say it:") ? (
                <p
                  key={i}
                  className="mb-4 rounded-md border-l-[3px] border-primary bg-primary/5 px-3.5 py-3 text-[17px] italic leading-[1.85] text-foreground/90"
                >
                  {p}
                </p>
              ) : (
                <p key={i} className="mb-4 text-[17px] leading-[1.85] text-foreground/90">
                  {p}
                </p>
              ),
            )}
          </section>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, (i ?? 0) - 1))}
              disabled={index === 0}
              className={cn(
                "rounded-lg border bg-background px-[18px] py-2.5 text-sm",
                index === 0 ? "cursor-not-allowed text-muted-foreground/60" : "text-foreground",
              )}
            >
              ‹ Back
            </button>
            {index < total - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(total - 1, (i ?? 0) + 1))}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Next ›
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Last section</span>
            )}
          </div>
        </>
      )}

      {total > 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Content current as at {CONTENT_CURRENT_AS_AT}. General information for training only —
          never legal advice.
        </p>
      ) : null}

      <CompleteModuleBar
        slug="read-along"
        canComplete={allReached}
        notReadyHint="Step through to the final section to enable this."
        beforeComplete={() => syncUpTo(total - 1)}
      />
    </div>
  );
}
