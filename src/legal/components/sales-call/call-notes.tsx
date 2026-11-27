// Ported from the Legal app (family-law-floater/src/components/sales-call/call-notes.tsx). Re-run the port script to refresh.
import { useId } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, NotebookPen } from "lucide-react";
import { Textarea } from "@/legal/components/ui/textarea";
import type { CallNotesSnapshot } from "@/legal/lib/call-notes";

export function CallNotes({
  notes,
  status,
  protectedDraft,
  open,
  onOpenChange,
  onChange,
  onSave,
}: CallNotesSnapshot & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (notes: string) => void;
  onSave: () => Promise<void>;
}) {
  const id = useId();
  const save = () => {
    void onSave().catch(() => {});
  };
  const label = status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Retry save";
  return (
    <section aria-label="Call notes" className="shrink-0 border-t bg-card px-4 py-2.5">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={() => onOpenChange(!open)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded py-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <NotebookPen aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
            <span className="shrink-0">Call notes</span>
            <span className="hidden truncate text-xs font-normal text-muted-foreground sm:block">
              {open
                ? "Your typed notes · autosaved"
                : notes.trim() || "Jot things down as you go"}
            </span>
            {open ? (
              <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />
            ) : (
              <ChevronUp aria-hidden="true" className="ml-auto h-4 w-4 shrink-0" />
            )}
          </button>
          <span aria-live="polite" className="shrink-0 text-xs text-muted-foreground">
            {status === "error" ? (
              <button
                type="button"
                onClick={save}
                className="rounded font-medium text-destructive underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {label}
              </button>
            ) : (
              <span className="flex items-center gap-1">
                {status === "saving" ? (
                  <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
                ) : (
                  <Check aria-hidden="true" className="h-3 w-3" />
                )}
                {label}
              </span>
            )}
          </span>
        </div>
        <div id={`${id}-panel`} hidden={!open}>
          <Textarea
            aria-label="Call notes"
            value={notes}
            onChange={(event) => onChange(event.target.value)}
            onBlur={save}
            rows={4}
            className="mt-2 h-[clamp(5rem,16dvh,9rem)] resize-none bg-background leading-relaxed"
            placeholder="Their situation, exact words, what matters most…"
          />
        </div>
        {status !== "saved" && (status === "error" || !protectedDraft) && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {protectedDraft
              ? "Not synced yet. Your notes are saved on this device."
              : "Notes aren’t saved yet. Keep this page open until they save."}
          </p>
        )}
      </div>
    </section>
  );
}
