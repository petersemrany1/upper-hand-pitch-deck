// Ported from the Legal app (family-law-floater/src/lib/training/call-examples.ts). Re-run the port script to refresh.
// Module 6 — Sales Call Example: Peter's six most recent clean calls that booked and took the
// $75 on the call, most recent first. Names, places, card details and other private moments
// are silenced in the audio. Reps listen to every call all the way through; there are no notes
// or questions (Peter, 11 Oct 2026). How the calls were chosen and cleaned:
// docs/training/module-6-calls.md.

export type CallExample = {
  id: string;
  /** The client's first name — how each call is labelled (Peter, 11 Oct 2026). */
  name: string;
  /** Path in the private training-media bucket. */
  audioPath: string;
  /** True length in seconds. */
  duration_s: number;
};

export const CALL_EXAMPLES: CallExample[] = [
  { id: "call-f", name: "Parth", audioPath: "calls/call-f.wav", duration_s: 259 },
  { id: "call-a", name: "Ben", audioPath: "calls/call-a.wav", duration_s: 1511 },
  { id: "call-b", name: "Rachael", audioPath: "calls/call-b.wav", duration_s: 1860 },
  { id: "call-c", name: "Luke", audioPath: "calls/call-c.wav", duration_s: 1245 },
  { id: "call-d", name: "Barbara", audioPath: "calls/call-d.wav", duration_s: 1601 },
  { id: "call-e", name: "Karen", audioPath: "calls/call-e.wav", duration_s: 1417 },
];
