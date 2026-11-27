// Ported from the Legal app (family-law-floater/src/hooks/use-call-notes.ts). Re-run the port script to refresh.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createCallNotesDraft, type CallNotesSnapshot } from "@/legal/lib/call-notes";
import { saveCallNotes, type CallLead } from "@/legal/lib/sales-call";

const drafts = new Map<string, ReturnType<typeof createCallNotesDraft>>();
const empty: CallNotesSnapshot = { notes: "", status: "saved", protectedDraft: true };
const subscribeEmpty = () => () => {};
const emptySnapshot = () => empty;

export function useCallNotes(
  lead: Pick<CallLead, "id" | "rep_notes"> | null,
  repId: string | undefined,
) {
  // Keep the rep’s open/closed choice across clients and sales steps.
  const [open, setOpen] = useState(true);
  const queryClient = useQueryClient();
  const leadId = lead?.id;
  const key = leadId && repId ? `sales-rep-notes:v1:${repId}:${leadId}` : null;
  const store = useMemo(() => {
    if (!key || !leadId) return null;
    const existing = drafts.get(key);
    if (existing && existing.getSnapshot().status !== "saved") return existing;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* UI reports unprotected drafts. */
    }
    const created = createCallNotesDraft({
      key,
      // Legacy call_notes and their browser drafts may contain AI output.
      initial: lead?.rep_notes ?? "",
      storage,
      save: async (notes) => {
        await saveCallNotes(leadId, notes);
        queryClient.setQueryData<CallLead | null>(["call-lead", leadId], (current) =>
          current ? { ...current, rep_notes: notes } : current,
        );
      },
    });
    drafts.set(key, created);
    return created;
    // Hydrate once per client. Background refetches must not replace an active draft.
  }, [key, leadId, queryClient]);
  const snapshot = useSyncExternalStore(
    store?.subscribe ?? subscribeEmpty,
    store?.getSnapshot ?? emptySnapshot,
    store?.getSnapshot ?? emptySnapshot,
  );

  useEffect(() => {
    if (!store || !key) return;
    const flush = () => {
      void store.flush().catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const current = store.getSnapshot();
      if (current.status !== "saved" && !current.protectedDraft) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      void store
        .flush()
        .then(() => {
          if (drafts.get(key) === store && store.getSnapshot().status === "saved")
            drafts.delete(key);
        })
        .catch(() => {});
      window.removeEventListener("online", flush);
      window.removeEventListener("focus", flush);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [key, store]);

  return {
    ...snapshot,
    open,
    setOpen,
    setNotes: (value: string | ((previous: string) => string)) => store?.setNotes(value),
    flush: () => store?.flush() ?? Promise.resolve(),
  };
}
