// Ported from the Legal app (family-law-floater/src/lib/call-notes.ts). Re-run the port script to refresh.
type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type CallNotesSnapshot = {
  notes: string;
  status: "saved" | "saving" | "error";
  protectedDraft: boolean;
};

/** A single client's write queue. Never let an older request overwrite newer notes. */
export function createCallNotesDraft({
  key,
  initial,
  storage,
  save,
  delay = 600,
}: {
  key: string;
  initial: string;
  storage: DraftStorage | null;
  save: (notes: string) => Promise<void>;
  delay?: number;
}) {
  let notes = initial;
  try {
    const draft: unknown = JSON.parse(storage?.getItem(key) ?? "null");
    if (typeof draft === "string") notes = draft;
  } catch {
    // A damaged or unavailable browser draft must not hide saved notes.
  }
  let saved = initial;
  let uncertain = false;
  let snapshot: CallNotesSnapshot = {
    notes,
    status: notes === saved ? "saved" : "saving",
    protectedDraft: true,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<CallNotesSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const persist = () => {
    try {
      if (!storage) return false;
      storage.setItem(key, JSON.stringify(snapshot.notes));
      return true;
    } catch {
      return false;
    }
  };
  const flush = (): Promise<void> => {
    clearTimeout(timer);
    if (inFlight) return inFlight;
    if (snapshot.status === "saved") return Promise.resolve();
    inFlight = Promise.resolve()
      .then(async () => {
        try {
          publish({ status: "saving" });
          while (snapshot.notes !== saved || uncertain) {
            const value = snapshot.notes;
            await save(value);
            saved = value;
            uncertain = false;
          }
          try {
            storage?.removeItem(key);
          } catch {
            // The server has the latest notes even if browser cleanup is unavailable.
          }
          publish({ status: "saved", protectedDraft: true });
        } catch (error) {
          uncertain = true;
          publish({ status: "error", protectedDraft: persist() });
          throw error;
        }
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setNotes: (value: string | ((previous: string) => string)) => {
      const next = typeof value === "function" ? value(snapshot.notes) : value;
      if (next === snapshot.notes) return;
      snapshot = { ...snapshot, notes: next };
      publish({ status: "saving", protectedDraft: persist() });
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush().catch(() => {});
      }, delay);
    },
    flush,
  };
}
