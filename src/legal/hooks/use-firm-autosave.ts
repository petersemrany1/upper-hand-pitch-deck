// Ported from the Legal app (family-law-floater/src/hooks/use-firm-autosave.ts). Re-run the port script to refresh.
import { useEffect, useState, useSyncExternalStore } from "react";
import { createFirmAutosave, type FirmAnswers } from "@/legal/lib/firm-autosave";

type Store = ReturnType<typeof createFirmAutosave>;
const stores = new Map<string, Store>();

/** One queue per user/firm/form keeps closing and immediately reopening safe. */
export function useFirmAutosave(
  key: string,
  initial: FirmAnswers,
  save: (patch: FirmAnswers) => Promise<unknown>,
) {
  const [store] = useState(() => {
    const existing = stores.get(key);
    if (existing && existing.getSnapshot().status !== "saved") return existing;
    let storage: globalThis.Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* The UI reports when local recovery is unavailable. */
    }
    const created = createFirmAutosave({ key, initial, storage, save });
    stores.set(key, created);
    return created;
  });
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    const flush = () => {
      void store.flush();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      flush();
      window.removeEventListener("online", flush);
      window.removeEventListener("focus", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
      if (store.getSnapshot().status === "saved" && stores.get(key) === store) stores.delete(key);
    };
  }, [key, store]);
  return { ...snapshot, change: store.change, changeMany: store.changeMany, flush: store.flush };
}

export function firmSaveLabel(status: "saved" | "saving" | "retry", protectedDraft: boolean) {
  if (status === "saved") return "Saved";
  if (!protectedDraft)
    return status === "retry" ? "Not saved — retry" : "Saving… keep this tab open";
  return status === "retry" ? "Saved on this device · retry sync" : "Saving…";
}
