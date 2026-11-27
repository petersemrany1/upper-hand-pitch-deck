// Ported from the Legal app (family-law-floater/src/lib/reporting.ts). Re-run the port script to refresh.
import {
  bookingPerformance,
  connectedBookingConversion,
  isConnectedCall,
  type PerformanceBooking,
  type PerformanceCall,
} from "./booking-performance";
import { periodDates, periodInstants, type ReportingPeriod } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";
import { dashboardShows } from "./dashboard-shows";
import type { ReportingData } from "./reporting-data.server";

export type ReportInput = {
  period: ReportingPeriod;
  start?: string | undefined;
  end?: string | undefined;
  repId?: string | undefined;
  city?: string | undefined;
};
/** Explicit booking owner wins. Historical fallback is the last real caller
 * BEFORE the booking, never today's lead assignment or a later service call. */
export function bookingOwner(
  a: ReportingData["appointments"][number],
  calls: ReportingData["calls"],
): string | null {
  if (a.booking_rep_id) return a.booking_rep_id;
  return (
    calls
      .filter(
        (c) =>
          c.lead_id === a.lead_id &&
          c.rep_id &&
          c.created_at <= a.created_at &&
          !["pending", "queued", "initiated", "ringing", "in-progress", "skipped"].includes(
            c.call_status ?? "",
          ),
      )
      .sort((x, y) => y.created_at.localeCompare(x.created_at) || x.id.localeCompare(y.id))[0]
      ?.rep_id ?? null
  );
}
export function performanceRecords(data: ReportingData) {
  const leads = new Map(data.leads.map((l) => [l.id, l]));
  const bookings: PerformanceBooking[] = data.appointments.map((a) => ({
    id: a.id,
    booked_at: a.created_at,
    booking_rep_id: bookingOwner(a, data.calls),
    client_name: a.client_name ?? "",
    lead_id: a.lead_id,
    client_phone: a.client_phone,
  }));
  const calls: PerformanceCall[] = data.calls.map((c) => ({
    id: c.id,
    rep_id: c.rep_id,
    lead_id: c.lead_id,
    phone: leads.get(c.lead_id ?? "")?.phone ?? null,
    called_at: c.created_at,
    direction: c.direction ?? "outbound",
    status: c.call_status,
    duration_seconds: c.duration_seconds,
    firm_id: null,
    twilio_call_sid: c.twilio_call_sid,
  }));
  return { bookings, calls };
}
export function makeDashboardReport(
  data: ReportingData,
  input: ReportInput,
  actor: { isAdmin: boolean; repId: string | null },
  now = new Date(),
) {
  const dates = periodDates(input.period, input.start, input.end, now),
    instants = periodInstants(input.period, input.start, input.end, now);
  if (!dates || !instants) throw new Error("Choose valid dates.");
  const today = sydneyTodayISO(now),
    to = instants.to && instants.to < now.toISOString() ? instants.to : now.toISOString();
  const { bookings: allBookings, calls: allCalls } = performanceRecords(data);
  const bookings = allBookings.filter((a) => actor.isAdmin || a.booking_rep_id === actor.repId);
  const calls = allCalls.filter((c) => actor.isAdmin || c.rep_id === actor.repId);
  const reps = data.reps
    .filter((r) => actor.isAdmin || r.id === actor.repId)
    .map((r) => ({ ...r, name: r.name ?? "Unnamed rep" }));
  const first = [...bookings.map((b) => b.booked_at), ...calls.map((c) => c.called_at)].sort()[0];
  const start = dates.start ?? (first ? sydneyTodayISO(new Date(first)) : today),
    end = dates.end && dates.end < today ? dates.end : today;
  const report = bookingPerformance(bookings, reps, start, end, now, calls);
  const repId = actor.isAdmin
    ? input.repId || report.reps.find((r) => r.id !== "unassigned")?.id
    : actor.repId;
  const rep = reps.find((r) => r.id === repId);
  const paid = new Map(
    data.leads.filter((l) => l.deposit_paid_at).map((l) => [l.id, Date.parse(l.deposit_paid_at!)]),
  );
  const conversion = rep
    ? {
        repId: rep.id,
        repName: rep.name,
        ...connectedBookingConversion(
          calls,
          bookings,
          rep.id,
          instants.from,
          to,
          now.toISOString(),
          new Set(),
          paid,
        ),
      }
    : null;
  const leadMap = new Map(data.leads.map((l) => [l.id, l]));
  const firmMap = new Map(data.firms.map((f) => [f.id, f]));
  const location = (id: string | null) => {
    const l = leadMap.get(id ?? "");
    return l?.city || firmMap.get(l?.firm_id ?? "")?.city || "";
  };
  const inRange = (iso: string) => !!iso && (!instants.from || iso >= instants.from) && iso < to;
  const unique = new Map<string, { connected: boolean; convo: boolean }>();
  const physical = new Set<string>();
  let dials = 0,
    answered = 0;
  for (const c of calls) {
    if (
      !inRange(c.called_at) ||
      !c.rep_id ||
      !c.lead_id ||
      ["pending", "queued", "initiated", "ringing", "in-progress", "skipped"].includes(
        c.status ?? "",
      )
    )
      continue;
    if (input.city && location(c.lead_id) !== input.city) continue;
    const sid = c.twilio_call_sid || c.id;
    if (physical.has(sid)) continue;
    physical.add(sid);
    dials++;
    if (
      !["failed", "busy", "no-answer", "canceled", "cancelled"].includes(c.status ?? "") &&
      (c.duration_seconds ?? 0) >= 10
    )
      answered++;
    if (c.called_at > (leadMap.get(c.lead_id)?.deposit_paid_at ?? "9999")) continue;
    const key = `${c.rep_id}:${c.lead_id}`,
      old = unique.get(key) ?? { connected: false, convo: false };
    old.connected ||= isConnectedCall(c);
    old.convo ||= isConnectedCall(c) && (c.duration_seconds ?? 0) >= 120;
    unique.set(key, old);
  }
  const periodBookings = bookings.filter(
    (b) => inRange(b.booked_at) && (!input.city || location(b.lead_id ?? null) === input.city),
  );
  const monthly = periodDates("month", "", "", now)!;
  const todayBookings = bookings
    .filter(
      (b) => sydneyTodayISO(new Date(b.booked_at)) === today && b.booked_at <= now.toISOString(),
    )
    .map((b) => {
      const a = data.appointments.find((a) => a.id === b.id)!;
      const l = leadMap.get(a.lead_id ?? "");
      return {
        id: b.id,
        name: b.client_name,
        firm: firmMap.get(a.firm_id ?? "")?.firm_name ?? "Unassigned",
        date: a.appointment_date,
        time: a.appointment_time,
        ad: l?.ad_name ?? l?.campaign_name ?? "Unattributed",
        bookedAt: b.booked_at,
      };
    });
  return {
    ...report,
    start,
    end,
    conversion,
    isAdmin: actor.isAdmin,
    asOf: now.toISOString(),
    conversionTotals: {
      called: unique.size,
      connected: [...unique.values()].filter((v) => v.connected).length,
      convos: [...unique.values()].filter((v) => v.convo).length,
      booked: periodBookings.length,
    },
    pickup: { dials, answered, percentage: dials ? (answered / dials) * 100 : null },
    todayBookings,
    newLeads: data.leads
      .filter(
        (l) =>
          sydneyTodayISO(new Date(l.created_at)) === today &&
          (actor.isAdmin || l.rep_id === actor.repId),
      )
      .map((l) => ({
        id: l.id,
        name: [l.first_name, l.last_name].filter(Boolean).join(" ") || "Unnamed client",
        source: l.ad_name || l.campaign_name || l.city || "Unattributed",
        createdAt: l.created_at,
      })),
    monthlyBookings: bookings.filter(
      (b) =>
        b.booked_at <= now.toISOString() && sydneyTodayISO(new Date(b.booked_at)) >= monthly.start!,
    ).length,
    cities: [...new Set(data.leads.map((l) => location(l.id)).filter(Boolean))].sort(),
    capacity: actor.isAdmin ? dashboardShows(data.firms, data.packs, data.appointments) : null,
  };
}
