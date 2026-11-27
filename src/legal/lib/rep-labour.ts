// Ported from the Legal app (family-law-floater/src/lib/rep-labour.ts). Re-run the port script to refresh.
import { sydneyTodayISO } from "./timezone";
export type LabourCall = {
  id: string;
  rep_id: string | null;
  lead_id: string | null;
  created_at: string;
  duration_seconds: number | null;
  call_status: string | null;
  twilio_call_sid: string | null;
};
export type HourCorrection = { rep_id: string; work_date: string; hours: number; note: string };
/** HTG's rep_call_days rule: sessions split after a >45 minute gap from the
 * running last call end; each session has a five-minute minimum. Login time
 * is not work time. Days use Sydney time, including daylight saving. */
export function repCallDays(calls: LabourCall[], corrections: HourCorrection[] = []) {
  const groups = new Map<string, { rep_id: string; work_date: string; calls: LabourCall[] }>(),
    seen = new Set<string>();
  for (const call of [...calls].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (
      !call.rep_id ||
      !Number.isFinite(Date.parse(call.created_at)) ||
      ["pending", "queued", "initiated", "ringing", "in-progress", "skipped"].includes(
        call.call_status ?? "",
      )
    )
      continue;
    const identity = call.twilio_call_sid || call.id;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const work_date = sydneyTodayISO(new Date(call.created_at)),
      key = `${call.rep_id}:${work_date}`;
    const group = groups.get(key) ?? { rep_id: call.rep_id, work_date, calls: [] };
    group.calls.push(call);
    groups.set(key, group);
  }
  for (const correction of corrections) {
    const key = `${correction.rep_id}:${correction.work_date}`;
    if (!groups.has(key))
      groups.set(key, { rep_id: correction.rep_id, work_date: correction.work_date, calls: [] });
  }
  return [...groups.values()]
    .map((group) => {
      let total = 0,
        start = 0,
        end = 0;
      for (const call of group.calls) {
        const at = Date.parse(call.created_at),
          stop = at + Math.max(0, call.duration_seconds ?? 0) * 1000;
        if (!start || at > end + 45 * 60000) {
          if (start) total += Math.max(300000, end - start);
          start = at;
          end = stop;
        } else end = Math.max(end, stop);
      }
      if (start) total += Math.max(300000, end - start);
      const calculated = Math.round(total / 36000) / 100,
        correction = corrections.find(
          (c) => c.rep_id === group.rep_id && c.work_date === group.work_date,
        );
      return {
        ...group,
        calculated_hours: calculated,
        hours: correction?.hours ?? calculated,
        override_hours: correction?.hours ?? null,
        note: correction?.note ?? null,
      };
    })
    .sort((a, b) => b.work_date.localeCompare(a.work_date) || a.rep_id.localeCompare(b.rep_id));
}
