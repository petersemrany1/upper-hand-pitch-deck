export type BlockDragKind = "move" | "start" | "end";

/** Snap the changed edge to a quarter hour; moving preserves the full length. */
export function projectBlockDrag(kind: BlockDragKind, from: number, until: number, delta: number) {
  const snap = (minute: number) => Math.round(minute / 15) * 15;
  if (kind === "start") return { from: Math.max(0, Math.min(until - 15, snap(from + delta))), until };
  if (kind === "end") return { from, until: Math.min(1440, Math.max(from + 15, snap(until + delta))) };
  const duration = until - from;
  const start = Math.max(0, Math.min(1440 - duration, snap(from + delta)));
  return { from: start, until: start + duration };
}
