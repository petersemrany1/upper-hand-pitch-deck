/** Refresh the waiting list without moving the current call or replaying the
 * completed prefix. The session's completion check admits second turns only
 * after the first pass is exhausted. New arrivals join the waiting list now. */
export function reorderSessionQueue(input: {
  queue: string[];
  index: number;
  activeId: string | null;
  orderedIds: string[];
  priorityIds?: string[];
  skipped?: ReadonlySet<string>;
}): string[] {
  const { queue, index, activeId, orderedIds, priorityIds = [], skipped = new Set() } = input;
  // A previously saved cursor can drift when an older client removes entries
  // before/currently at that cursor. Anchor to the actual current lead before
  // deciding which entries have been completed.
  const position = sessionQueueIndex(queue, activeId, index);
  const hasActiveEntry = Boolean(activeId && queue[position] === activeId);
  const cut = position + (hasActiveEntry ? 1 : 0);
  const prefix = queue.slice(0, cut);
  if (activeId && !hasActiveEntry) prefix.push(activeId);
  const pending = new Set(queue.slice(cut));
  const known = new Set(queue);
  const tail = [...new Set([...priorityIds, ...orderedIds])].filter(id =>
    id !== activeId && !skipped.has(id) && (pending.has(id) || !known.has(id)),
  );
  const next = [...prefix, ...tail];
  return next.length === queue.length && next.every((id, i) => id === queue[i]) ? queue : next;
}

export function sessionQueueIndex(queue: string[], activeLeadId: string | null | undefined, fallbackIndex: number) {
  // The same lead can have a morning entry and an afternoon entry.
  if (activeLeadId && queue[fallbackIndex] === activeLeadId) return fallbackIndex;
  const activeIdx = activeLeadId ? queue.indexOf(activeLeadId) : -1;
  return activeIdx !== -1 ? activeIdx : Math.min(queue.length, Math.max(0, fallbackIndex));
}

export function nextSessionIndexFromActive(queue: string[], activeLeadId: string | null | undefined, fallbackIndex: number) {
  return sessionQueueIndex(queue, activeLeadId, fallbackIndex) + 1;
}
