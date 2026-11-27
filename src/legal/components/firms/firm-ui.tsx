// Ported from the Legal app (family-law-floater/src/components/firms/firm-ui.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { Mail, MoreHorizontal, Phone, StickyNote } from "lucide-react";

import {
  STAGES,
  type FirmApplication,
  type NoteSummary,
  type StageValue,
  daysWaiting,
  displayName,
  formatDateTime,
  personName,
  relativeTime,
} from "@/legal/lib/firm-applications";
import { cn } from "@/legal/lib/utils";
import { FirmCalendlyBooking } from "./FirmCalendlyBooking";
import { FirmDuplicateBadge } from "./FirmDuplicateNotice";

export function stageVar(stage: string): string {
  return `var(--stage-${stage.replace(/_/g, "-")})`;
}

export function StageDot({ stage, className }: { stage: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: stageVar(stage) }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3">
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-2.5 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function MoveMenu({
  current,
  onMove,
}: {
  current: string;
  onMove: (stage: StageValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Card actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-sm"
        >
          <p className="px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Move to
          </p>
          {STAGES.map((stage) => (
            <button
              key={stage.value}
              type="button"
              role="menuitem"
              disabled={stage.value === current}
              onClick={() => {
                setOpen(false);
                onMove(stage.value);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-muted disabled:opacity-40 focus-visible:bg-muted focus-visible:outline-none"
            >
              <StageDot stage={stage.value} />
              <span className="truncate">{stage.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FirmCard({
  app,
  summary,
  onOpen,
  onMove,
  draggable = false,
  duplicateCount = 0,
}: {
  app: FirmApplication;
  summary?: NoteSummary | undefined;
  onOpen: () => void;
  onMove: (stage: StageValue) => void;
  draggable?: boolean;
  duplicateCount?: number;
}) {
  const person = personName(app);
  const title = displayName(app);
  const waiting = app.stage === "new" ? daysWaiting(app.created_at) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/firm-id", app.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="group cursor-pointer rounded-lg border border-border/70 bg-card p-3 transition hover:border-border hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight">{title}</p>
          {person !== "—" && person !== title && (
            <p className="truncate text-xs text-muted-foreground">{person}</p>
          )}
        </div>
        <MoveMenu current={app.stage} onMove={onMove} />
      </div>

      {duplicateCount > 0 && (
        <div className="mt-2">
          <FirmDuplicateBadge count={duplicateCount} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {app.phone && (
          <a
            href={`tel:${app.phone}`}
            onClick={(event) => {
              event.stopPropagation();
              if (duplicateCount > 0) {
                event.preventDefault();
                onOpen();
              }
            }}
            className="inline-flex items-center gap-1.5 py-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Phone className="h-3 w-3" /> <span className="truncate">{app.phone}</span>
          </a>
        )}
        {app.email && (
          <a
            href={`mailto:${app.email}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex max-w-full items-center gap-1.5 py-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{app.email}</span>
          </a>
        )}
      </div>

      <FirmCalendlyBooking app={app} />

      {summary?.latest && (
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <StickyNote className="h-3 w-3 shrink-0" />
          <span className="truncate">{summary.latest}</span>
          {summary.count > 1 && <span className="shrink-0 tabular-nums">· {summary.count}</span>}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span title={formatDateTime(app.created_at)} className="shrink-0">
          {relativeTime(app.created_at)}
        </span>
        {app.campaign_name && (
          <span className="truncate rounded border border-border/70 px-1.5 py-0.5">
            {app.campaign_name}
          </span>
        )}
        {waiting >= 1 && (
          <span
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-medium"
            style={{
              color: "var(--stage-waiting)",
              backgroundColor: "color-mix(in oklab, var(--stage-waiting) 14%, transparent)",
            }}
          >
            waiting {waiting}d
          </span>
        )}
      </div>
    </div>
  );
}
