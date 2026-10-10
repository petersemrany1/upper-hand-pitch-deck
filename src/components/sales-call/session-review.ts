import { buildQueue, type QueueLead } from "./queue";
import { normaliseStatus } from "./status";
export type LocationLead = { ad_set_name?: string | null; campaign_name?: string | null; ad_name?: string | null; raw_payload?: unknown };
// All text a lead's location could hide in: Meta targeting fields plus the
// website booking form's own location answer (sometimes nested one level).
export function leadLocationText(l: LocationLead): string {
  const rp = (l.raw_payload && typeof l.raw_payload === "object")
    ? (l.raw_payload as Record<string, unknown>)
    : null;
  const nested = rp && typeof rp.raw_payload === "object" && rp.raw_payload !== null
    ? (rp.raw_payload as Record<string, unknown>)
    : null;
  return [
    l.ad_set_name ?? "",
    l.campaign_name ?? "",
    l.ad_name ?? "",
    typeof rp?.location === "string" ? rp.location : "",
    typeof nested?.location === "string" ? nested.location : "",
  ].join(" ").toLowerCase();
}

export function availableUntouchedIds<L extends QueueLead & LocationLead>(leads: L[], options: {
  paused: string[]; capacity: { all: string[]; available: string[] }; priority: string;
  hiddenIds: ReadonlySet<string>; now: Date;
}) {
  const { paused, capacity, priority, hiddenIds, now } = options;
  return buildQueue({
    leads: leads.filter(l => !hiddenIds.has(l.id) && normaliseStatus(l.status, l) === "new" && l.lead_class !== "booked_active"),
    history: {}, now,
    isPaused: l => {
      const text = leadLocationText(l);
      return paused.some(k => text.includes(k)) || (capacity.all.some(k => text.includes(k)) && !capacity.available.some(k => text.includes(k)));
    },
    isPriority: l => Boolean(priority && leadLocationText(l).includes(priority)),
  }).order;
}

/** Revalidate after awaiting network; an explicit exit or newly selected lead wins. */
export function mayFinishReview(input: { cancelled: boolean; active: boolean; leadId: string | null; queuedAhead: boolean }) {
  return !input.cancelled && input.active && !input.leadId && !input.queuedAhead;
}
