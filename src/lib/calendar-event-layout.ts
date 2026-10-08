export type CalendarInterval = { id: string; start: number; end: number };
export type CalendarLane = { lane: number; lanes: number };

/** Connected overlap groups share columns; touching appointments share a lane. */
export function calendarEventLayout(events: CalendarInterval[]) {
  const result = new Map<string, CalendarLane>();
  let group: CalendarInterval[] = [], groupEnd = -Infinity;
  const flush = () => {
    const ends: number[] = [];
    for (const event of group) {
      let lane = ends.findIndex(end => end <= event.start);
      if (lane < 0) lane = ends.length;
      ends[lane] = event.end;
      result.set(event.id, { lane, lanes: 1 });
    }
    for (const event of group) result.get(event.id)!.lanes = ends.length;
    group = [];
  };
  for (const event of [...events].sort((a, b) => a.start - b.start || b.end - a.end || a.id.localeCompare(b.id))) {
    if (event.start >= groupEnd) flush();
    group.push(event); groupEnd = Math.max(groupEnd, event.end);
  }
  flush();
  return result;
}

export function mergeCalendarBands(bands: [number, number][]) {
  const merged: [number, number][] = [];
  for (const [start, end] of [...bands].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
