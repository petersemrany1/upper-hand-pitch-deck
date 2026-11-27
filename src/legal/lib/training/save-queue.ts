// Ported from the Legal app (family-law-floater/src/lib/training/save-queue.ts). Re-run the port script to refresh.
// One progress save at a time per module. The server reads the saved state, merges the
// update and writes it back; two saves for the same module in flight together would
// overwrite each other (fast clicks through beats, two videos playing at once).

type Save<T> = () => Promise<T>;

const chains = new Map<string, Promise<unknown>>();

/** Run `save` after every earlier save for this module has finished (success or failure). */
export function queuedSave<T>(slug: string, save: Save<T>): Promise<T> {
  const previous = chains.get(slug) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(save);
  chains.set(
    slug,
    next.catch(() => undefined),
  );
  return next;
}

/** Resolves once every save queued so far for this module has finished. */
export function settled(slug: string): Promise<void> {
  return (chains.get(slug) ?? Promise.resolve()).then(() => undefined);
}

/** Retry a save with a growing pause (2s, 4s, 8s…) before giving up. */
export async function withRetry<T>(save: Save<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await save();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw lastError;
}
