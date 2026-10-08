export type BlockDragKind = "move" | "start" | "end";

/** Scroll only towards the pointer's movement, within the calendar viewport. */
export function blockDragScrollDelta(point: { x: number; y: number; directionX: number; directionY: number }, bounds: { left: number; right: number; top: number; bottom: number }, kind: BlockDragKind) {
  const edge = 28;
  const speed = (distance: number) => Math.min(4, Math.max(0, (edge - distance) / edge * 4));
  if (bounds.bottom <= bounds.top || bounds.right <= bounds.left) return { x: 0, y: 0 };
  const x = kind !== "move" || point.y < bounds.top || point.y > bounds.bottom ? 0
    : point.directionX < 0 ? -speed(point.x - bounds.left)
    : point.directionX > 0 ? speed(bounds.right - point.x) : 0;
  const y = point.x < bounds.left || point.x > bounds.right ? 0
    : point.directionY < 0 ? -speed(point.y - bounds.top)
    : point.directionY > 0 ? speed(bounds.bottom - point.y) : 0;
  return { x: x || 0, y: y || 0 };
}

/** Snap the changed edge to a quarter hour; moving preserves the full length. */
export function projectBlockDrag(kind: BlockDragKind, from: number, until: number, delta: number) {
  const snap = (minute: number) => Math.round(minute / 15) * 15;
  if (kind === "start") return { from: Math.max(0, Math.min(until - 15, snap(from + delta))), until };
  if (kind === "end") return { from, until: Math.min(1440, Math.max(from + 15, snap(until + delta))) };
  const duration = until - from;
  const start = Math.max(0, Math.min(1440 - duration, snap(from + delta)));
  return { from: start, until: start + duration };
}
