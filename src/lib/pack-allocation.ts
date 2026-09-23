/**
 * How a clinic's shows fill its packs. Pure, so the portal card and its tests
 * agree on every edge: packs are filled oldest first (same order the database
 * uses to price a show: date paid, then purchase date, then creation), the
 * pack the clinic is working through right now is the first one not fully
 * delivered, and bookings that don't fit in it spill into the packs behind.
 *
 * Free-trial packs sit outside the balance: those consults are shown as free,
 * not as credits, so they are listed but never filled.
 */

export type PackLike = {
  id: string;
  pack_size: number;
  purchased_at: string;
  created_at?: string | null;
  date_paid?: string | null;
  pack_type: string;
};

export type PackFill<P extends PackLike> = {
  pack: P;
  /** Position among the packs that count, 1-based. */
  number: number;
  delivered: number;
  booked: number;
  open: number;
  state: "complete" | "current" | "queued";
};

export type PackAllocation<P extends PackLike> = {
  /** Packs that count towards the balance, oldest first, with their fill. */
  fills: PackFill<P>[];
  /** The pack the clinic is working through: first not fully delivered, else the last one. */
  current: PackFill<P> | null;
  /** The next pack with room after the current one, if any. */
  next: PackFill<P> | null;
  /** Bookings that don't fit in any pack. */
  overflowBooked: number;
  /** free = shows in the balance that were not paid for (goodwill, guarantee credits); trial = free-trial consults, which sit outside the balance. */
  totals: { bought: number; free: number; trial: number; delivered: number; booked: number; open: number };
};

export const packOrder = (a: PackLike, b: PackLike): number =>
  (a.date_paid ?? a.purchased_at.slice(0, 10)).localeCompare(b.date_paid ?? b.purchased_at.slice(0, 10)) ||
  (a.created_at ?? "").localeCompare(b.created_at ?? "");

export function allocatePacks<P extends PackLike>(packs: P[], delivered: number, upcoming: number): PackAllocation<P> {
  const counted = packs.filter((p) => p.pack_type !== "free_trial" && p.pack_size > 0).sort(packOrder);
  let toDeliver = Math.max(0, delivered);
  let toBook = Math.max(0, upcoming);
  const fills: PackFill<P>[] = counted.map((pack, i) => {
    const d = Math.min(pack.pack_size, toDeliver); toDeliver -= d;
    const b = Math.min(pack.pack_size - d, toBook); toBook -= b;
    const open = pack.pack_size - d - b;
    return { pack, number: i + 1, delivered: d, booked: b, open, state: d >= pack.pack_size ? "complete" : "queued" };
  });
  const currentIdx = fills.findIndex((f) => f.state !== "complete");
  const current = currentIdx >= 0 ? fills[currentIdx] : fills.length ? fills[fills.length - 1] : null;
  if (current && current.state !== "complete") current.state = "current";
  const next = currentIdx >= 0 ? fills.slice(currentIdx + 1).find((f) => f.open > 0 || f.booked > 0) ?? null : null;
  const free = counted.filter((p) => p.pack_type !== "paid").reduce((s, p) => s + p.pack_size, 0);
  const trial = packs.filter((p) => p.pack_type === "free_trial").reduce((s, p) => s + Math.max(0, p.pack_size), 0);
  return {
    fills,
    current,
    next,
    overflowBooked: toBook,
    totals: {
      bought: counted.reduce((s, p) => s + p.pack_size, 0),
      free,
      trial,
      delivered: fills.reduce((s, f) => s + f.delivered, 0),
      booked: fills.reduce((s, f) => s + f.booked, 0),
      open: fills.reduce((s, f) => s + f.open, 0),
    },
  };
}

/**
 * Plain words for where the clinic stands. The current pack being full is
 * only a warning when there is nothing behind it: with a pack queued the
 * clinic still has room, and the line says so.
 */
export function packStatus(a: PackAllocation<PackLike>): { key: "none" | "open" | "fullyBooked" | "nextReady" | "complete"; line: string; next: string | null } {
  const c = a.current, n = a.next;
  const nextLine = n
    ? `Next ${n.pack.pack_size}-show pack is ready: ${n.booked} booked into it, ${n.open} open.`
    : null;
  if (!c) return { key: "none", line: "No pack loaded yet.", next: null };
  if (c.state === "complete") return { key: n ? "nextReady" : "complete", line: `This ${c.pack.pack_size}-show pack is complete.`, next: nextLine };
  if (c.open === 0) {
    const line = `This pack is fully booked — the ${c.booked} upcoming consult${c.booked === 1 ? "" : "s"} will finish it.`;
    return { key: n && n.open > 0 ? "nextReady" : "fullyBooked", line, next: nextLine };
  }
  return { key: "open", line: `${c.open} open slot${c.open === 1 ? "" : "s"} in this pack.`, next: nextLine };
}
