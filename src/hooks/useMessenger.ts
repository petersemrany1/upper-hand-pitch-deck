import { useEffect, useState } from "react";

// Lightweight module-level pub/sub so any component can open the mini
// messenger without prop drilling or a context provider.
type State = { open: boolean; threadId: string | null };
let state: State = { open: false, threadId: null };
const listeners = new Set<(s: State) => void>();

function emit() {
  for (const l of listeners) l(state);
}

export function openMessenger(threadId?: string | null) {
  state = { open: true, threadId: threadId ?? state.threadId ?? null };
  emit();
}

export function closeMessenger() {
  state = { ...state, open: false };
  emit();
}

export function toggleMessenger() {
  state = { ...state, open: !state.open };
  emit();
}

export function setMessengerThread(threadId: string | null) {
  state = { ...state, threadId };
  emit();
}

export function useMessenger(): State {
  const [s, setS] = useState<State>(state);
  useEffect(() => {
    listeners.add(setS);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}
