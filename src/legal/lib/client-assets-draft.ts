// Ported from the Legal app (family-law-floater/src/lib/client-assets-draft.ts). Re-run the port script to refresh.
import {
  assetCalculationSchema,
  AssetSaveConflict,
  calculateClientAssets,
  emptyAssetCalculation,
  type AssetCalculation,
  type SavedAssetCalculation,
} from "./client-assets";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AssetDraftSnapshot = {
  calculation: AssetCalculation;
  status: "saved" | "saving" | "error" | "conflict" | "invalid";
  protectedDraft: boolean;
  updatedAt: string | null;
};

/** One ordered write queue per advisor/client, also retained while the panel is closed. */
export function createAssetDraft({
  key,
  initial,
  storage,
  save,
  delay = 700,
}: {
  key: string;
  initial: SavedAssetCalculation | null;
  storage: StorageLike | null;
  save: (calculation: AssetCalculation, revision: number) => Promise<SavedAssetCalculation>;
  delay?: number;
}) {
  let revision = initial?.revision ?? 0;
  let calculation = assetCalculationSchema.parse(initial?.calculation ?? emptyAssetCalculation());
  let saved = JSON.stringify(calculation);
  let conflict = false;
  try {
    const local = JSON.parse(storage?.getItem(key) ?? "null");
    const parsed = assetCalculationSchema.safeParse(local?.calculation);
    if (parsed.success && Number.isInteger(local.revision) && local.revision >= 0) {
      calculation = parsed.data;
      if (JSON.stringify(calculation) !== saved) {
        conflict = local.revision !== revision;
        revision = local.revision;
      } else storage?.removeItem(key);
    }
  } catch {
    /* A broken local draft cannot hide the saved client record. */
  }
  let snapshot: AssetDraftSnapshot = {
    calculation,
    status: conflict ? "conflict" : JSON.stringify(calculation) === saved ? "saved" : "saving",
    protectedDraft: true,
    updatedAt: initial?.updatedAt ?? null,
  };
  let inFlight: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<AssetDraftSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const persist = () => {
    try {
      if (!storage) return false;
      storage.setItem(key, JSON.stringify({ calculation: snapshot.calculation, revision }));
      return true;
    } catch {
      return false;
    }
  };
  const flush = (): Promise<void> => {
    clearTimeout(timer);
    if (inFlight) return inFlight;
    if (snapshot.status === "saved" || snapshot.status === "conflict") return Promise.resolve();
    if (calculateClientAssets(snapshot.calculation).invalid) {
      publish({ status: "invalid" });
      return Promise.resolve();
    }
    inFlight = Promise.resolve()
      .then(async () => {
        try {
          publish({ status: "saving" });
          while (JSON.stringify(snapshot.calculation) !== saved) {
            if (calculateClientAssets(snapshot.calculation).invalid) {
              publish({ status: "invalid" });
              return;
            }
            const value = snapshot.calculation;
            const result = await save(value, revision);
            revision = result.revision;
            saved = JSON.stringify(value);
            publish({ updatedAt: result.updatedAt, protectedDraft: persist() });
          }
          try {
            storage?.removeItem(key);
          } catch {
            /* The server has the latest version. */
          }
          publish({ status: "saved", protectedDraft: true });
        } catch (error) {
          publish({
            status: error instanceof AssetSaveConflict ? "conflict" : "error",
            protectedDraft: persist(),
          });
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
    setCalculation: (next: AssetCalculation) => {
      const calculation = assetCalculationSchema.parse(next);
      snapshot = { ...snapshot, calculation };
      publish({
        status:
          snapshot.status === "conflict"
            ? "conflict"
            : calculateClientAssets(next).invalid
              ? "invalid"
              : "saving",
        protectedDraft: persist(),
      });
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, delay);
    },
    flush,
    refresh: (latest: SavedAssetCalculation | null) => {
      // Background reads may refresh a clean view, but never replace local edits
      // or roll back a save whose read response arrived out of order.
      if (snapshot.status !== "saved" || !latest || latest.revision <= revision) return;
      revision = latest.revision;
      const calculation = assetCalculationSchema.parse(latest.calculation);
      saved = JSON.stringify(calculation);
      publish({ calculation, updatedAt: latest.updatedAt });
    },
    /** Explicitly called only after the rep reviews a conflict. */
    resolve: (latest: SavedAssetCalculation | null, keepDraft: boolean) => {
      revision = latest?.revision ?? 0;
      const calculation = assetCalculationSchema.parse(
        latest?.calculation ?? emptyAssetCalculation(),
      );
      saved = JSON.stringify(calculation);
      if (!keepDraft) snapshot = { ...snapshot, calculation };
      publish({
        status: JSON.stringify(snapshot.calculation) === saved ? "saved" : "saving",
        updatedAt: latest?.updatedAt ?? null,
        protectedDraft: persist(),
      });
      if (snapshot.status === "saved") {
        try {
          storage?.removeItem(key);
        } catch {
          /* Best effort. */
        }
      }
      return flush();
    },
  };
}
