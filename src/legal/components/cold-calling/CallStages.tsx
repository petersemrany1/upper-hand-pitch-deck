// Ported from the Legal app (family-law-floater/src/components/cold-calling/CallStages.tsx). Re-run the port script to refresh.
import type { ReactNode } from "react";

import { CALL_STAGES, fillPlaceholders, type ScriptLine } from "@/legal/lib/cold-calling/script";
import { cn } from "@/legal/lib/utils";

function Line({ line, vars }: { line: ScriptLine; vars: { name: string; state: string } }) {
  const text = fillPlaceholders(line.text, vars);
  switch (line.kind) {
    case "you":
      return (
        <p className="rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3 text-[17px] leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      );
    case "them":
      return (
        <p className="px-4 text-[16px] italic leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {text}
        </p>
      );
    case "bullet":
      return (
        <p className="flex gap-2 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-2 text-[17px] leading-relaxed whitespace-pre-wrap">
          <span aria-hidden>•</span>
          <span>{text}</span>
        </p>
      );
    case "note":
      return <p className="px-4 text-sm font-semibold text-muted-foreground">{text}</p>;
    case "subheading":
      return (
        <p className="mt-2 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {text}
        </p>
      );
    default:
      return <p className="px-4 text-[17px] leading-relaxed whitespace-pre-wrap">{text}</p>;
  }
}

/** Stage buttons on the left, the selected stage's lines in big type. Word for word. */
export function CallStages({
  stageId,
  onSelect,
  vars,
  footers = {},
}: {
  stageId: string;
  onSelect: (id: string) => void;
  vars: { name: string; state: string };
  footers?: Record<string, ReactNode>;
}) {
  const stage = CALL_STAGES.find((s) => s.id === stageId) ?? CALL_STAGES[0]!;
  const index = CALL_STAGES.findIndex((s) => s.id === stage.id);
  return (
    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <ol className="flex flex-row flex-wrap gap-1.5 md:flex-col">
        {CALL_STAGES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-current={s.id === stage.id ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition",
                s.id === stage.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full text-center text-xs font-bold leading-6",
                  s.id === stage.id ? "bg-primary-foreground/20" : "bg-accent",
                )}
              >
                {i + 1}
              </span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
      <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">
          {index + 1}. {stage.title}
        </h2>
        {stage.lines.map((line, i) => (
          <Line key={i} line={line} vars={vars} />
        ))}
        {footers[stage.id] ?? null}
      </section>
    </div>
  );
}
