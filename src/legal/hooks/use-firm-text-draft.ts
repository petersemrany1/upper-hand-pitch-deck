// Ported from the Legal app (family-law-floater/src/hooks/use-firm-text-draft.ts). Re-run the port script to refresh.
import { useRef, useState } from "react";

type Attempt = { id: string; body: string } | null;
type Draft = { draft: string; attempt: Attempt };

/** Drafts are saved locally; sending remains an explicit action. Retain its idempotency key. */
export function useFirmTextDraft(key: string | null) {
  const [state, setState] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(key ? (window.localStorage.getItem(key) ?? "null") : "null");
      if (saved && typeof saved.draft === "string" && saved.draft.length <= 1600) {
        const attempt = saved.attempt;
        return {
          draft: saved.draft,
          attempt:
            attempt &&
            typeof attempt.id === "string" &&
            /^[0-9a-f-]{36}$/i.test(attempt.id) &&
            typeof attempt.body === "string" &&
            attempt.body.length <= 1600
              ? { id: attempt.id, body: attempt.body }
              : null,
        };
      }
    } catch {
      /* Fresh draft when browser storage is unavailable. */
    }
    return { draft: "", attempt: null };
  });
  const current = useRef(state);
  const [protectedDraft, setProtected] = useState(!!key);
  const update = (patch: Partial<Draft>) => {
    current.current = { ...current.current, ...patch };
    let durable = false;
    try {
      if (key) {
        if (current.current.draft || current.current.attempt)
          window.localStorage.setItem(key, JSON.stringify(current.current));
        else window.localStorage.removeItem(key);
        durable = true;
      }
    } catch {
      /* Preserve the existing unsaved-change guard when storage fails. */
    }
    setProtected(durable);
    setState(current.current);
  };
  return {
    ...state,
    protectedDraft,
    setDraft: (draft: string) => update({ draft }),
    setAttempt: (attempt: Attempt) => update({ attempt }),
  };
}
