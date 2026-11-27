// Ported from the Legal app (family-law-floater/src/hooks/use-client-assets.ts). Re-run the port script to refresh.
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createAssetDraft } from "@/legal/lib/client-assets-draft";
import { saveClientAssets } from "@/legal/lib/client-assets-api";
import type { SavedAssetCalculation } from "@/legal/lib/client-assets";

const drafts = new Map<string, ReturnType<typeof createAssetDraft>>();
const activeStores = new Map<ReturnType<typeof createAssetDraft>, number>();

export function useClientAssetDraft(
  leadId: string,
  repId: string,
  initial: SavedAssetCalculation | null,
) {
  const queryClient = useQueryClient();
  const key = `client-assets:v1:${repId}:${leadId}`;
  const store = useMemo(() => {
    const existing = drafts.get(key);
    if (existing) return existing;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Unsaved changes remain in memory. */
    }
    const created = createAssetDraft({
      key,
      initial,
      storage,
      save: async (calculation, revision) => {
        const saved = await saveClientAssets(leadId, calculation, revision);
        queryClient.setQueryData(["client-assets", leadId], saved);
        return saved;
      },
    });
    drafts.set(key, created);
    return created;
    // Initialise once per client, never replace an active draft after a refetch.
  }, [key, leadId, queryClient]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    store.refresh(initial);
  }, [initial, store, snapshot.status]);
  useEffect(() => {
    activeStores.set(store, (activeStores.get(store) ?? 0) + 1);
    const flush = () => {
      void store.flush();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (store.getSnapshot().status !== "saved") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    flush();
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      activeStores.set(store, Math.max(0, (activeStores.get(store) ?? 1) - 1));
      void store.flush().then(() => {
        if (
          !activeStores.get(store) &&
          drafts.get(key) === store &&
          store.getSnapshot().status === "saved"
        ) {
          drafts.delete(key);
          activeStores.delete(store);
        }
      });
      window.removeEventListener("online", flush);
      window.removeEventListener("pagehide", flush);
      if (store.getSnapshot().status === "saved")
        window.removeEventListener("beforeunload", beforeUnload);
      else {
        // A client switch must not remove protection for an unsaved prior client.
        const unsubscribe = store.subscribe(() => {
          if (store.getSnapshot().status === "saved") {
            window.removeEventListener("beforeunload", beforeUnload);
            unsubscribe();
          }
        });
      }
    };
  }, [key, store]);
  return {
    ...snapshot,
    setCalculation: store.setCalculation,
    flush: store.flush,
    resolve: store.resolve,
  };
}
