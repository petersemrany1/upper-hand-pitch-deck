// Ported from the Legal app (family-law-floater/src/lib/firm-autosave.ts). Re-run the port script to refresh.
export type FirmAnswers = Record<string, string>;
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
export type AutosaveSnapshot = {
  answers: FirmAnswers;
  status: "saved" | "saving" | "retry";
  protected: boolean;
};

/** Keep edits durable before starting a request, including edits made during a save. */
export function createFirmAutosave({
  key,
  initial,
  storage,
  save,
  delay = 350,
}: {
  key: string;
  initial: FirmAnswers;
  storage: Storage | null;
  save: (patch: FirmAnswers) => Promise<unknown>;
  delay?: number;
}) {
  let pending: FirmAnswers = {};
  try {
    const restored: unknown = JSON.parse(storage?.getItem(key) ?? "{}");
    if (restored && typeof restored === "object" && !Array.isArray(restored)) {
      pending = Object.fromEntries(
        Object.entries(restored).filter(
          ([k, v]) => k.length <= 80 && typeof v === "string" && v.length <= 12000,
        ),
      );
    }
  } catch {
    /* A missing or damaged browser draft must not prevent loading the firm. */
  }
  let snapshot: AutosaveSnapshot = {
    answers: { ...initial, ...pending },
    status: Object.keys(pending).length ? "saving" : "saved",
    protected: true,
  };
  let saving = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (update: Partial<AutosaveSnapshot>) => {
    snapshot = { ...snapshot, ...update };
    listeners.forEach((listener) => listener());
  };
  const persist = () => {
    try {
      if (!storage) return false;
      if (Object.keys(pending).length) storage.setItem(key, JSON.stringify(pending));
      else storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (saving || !Object.keys(pending).length) return;
    saving = true;
    const patch = { ...pending };
    publish({ status: "saving" });
    try {
      await save(patch);
      for (const [field, value] of Object.entries(patch)) {
        if (pending[field] === value) delete pending[field];
      }
      const hasPending = !!Object.keys(pending).length;
      const durable = persist();
      saving = false;
      publish({ status: hasPending ? "saving" : "saved", protected: !hasPending || durable });
      if (hasPending) await flush();
    } catch {
      saving = false;
      publish({ status: "retry", protected: persist() });
      // Mounted forms also retry on focus/reconnect. Never discard a failed patch.
      if (listeners.size) timer = setTimeout(() => void flush(), 5000);
    }
  };
  const changeMany = (patch: FirmAnswers) => {
    Object.assign(pending, patch);
    publish({
      answers: { ...snapshot.answers, ...patch },
      status: "saving",
      protected: persist(),
    });
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), delay);
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    change: (field: string, value: string) => changeMany({ [field]: value }),
    changeMany,
    flush,
  };
}
