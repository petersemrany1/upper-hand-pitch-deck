import { addDays } from "./reporting-period";
import { sydneyTodayISO } from "./timezone";

export const DOUBLE_DIAL_WINDOW_MS = 60_000;
export const UNASSIGNED_REP = "unassigned";

export type PerformanceBooking = {
  id: string;
  booked_at: string;
  booking_rep_id: string | null;
  patient_name: string;
};
export type PerformanceRep = { id: string; name: string; role: string; is_active: boolean };
export type PerformanceCall = {
  id: string;
  rep_id: string | null;
  lead_id: string | null;
  phone: string | null;
  called_at: string;
  direction: string;
  status: string | null;
  clinic_id: string | null;
  twilio_call_sid: string | null;
};
export type BookingDay = { date: string; total: number; byRep: Record<string, number> };
export type BookingGrouping = "day" | "week" | "month";

// Keep the dashboard's existing test/demo exclusion consistent in every count.
export const isExampleBooking = (name: string) => /test|demo/i.test(name);

function phoneKey(phone: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  // Australian national and international formats refer to the same recipient.
  return /^0\d{9}$/.test(digits) ? `61${digits.slice(1)}` : digits;
}

/** Count actual outbound attempts, retaining later calls to the same patient.
 * Immediate redials start within 60 seconds of the preceding dial to that patient.
 * Assign the whole attempt to its first dial, including across period boundaries.
 * Callers must supply a 60-second lookback before `from`.
 */
export function countDialAttempts(calls: PerformanceCall[], from: string | null, to: string, excludedLeads = new Set<string>()) {
  const start = from ? Date.parse(from) : -Infinity;
  const end = Date.parse(to);
  const eligible = calls.filter(c => c.rep_id && c.direction === "outbound"
    && (!c.clinic_id || c.lead_id) && (!c.lead_id || !excludedLeads.has(c.lead_id))
    && !["queued", "initiated"].includes(c.status ?? "")
    && Number.isFinite(Date.parse(c.called_at)) && Date.parse(c.called_at) < end)
    .sort((a, b) => Date.parse(a.called_at) - Date.parse(b.called_at) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const phoneByLead = new Map<string, string>();
  for (const call of eligible) {
    if (call.lead_id && phoneKey(call.phone)) phoneByLead.set(`${call.rep_id}:${call.lead_id}`, phoneKey(call.phone));
  }
  const attemptsByKey = new Map<string, number>();
  let attempts = 0, rawDials = 0, doubleDials = 0;
  for (const call of eligible) {
    const physicalKey = call.twilio_call_sid || call.id;
    if (seen.has(physicalKey)) continue;
    seen.add(physicalKey);
    const time = Date.parse(call.called_at);
    const recipient = phoneKey(call.phone) || phoneByLead.get(`${call.rep_id}:${call.lead_id}`) || call.lead_id || call.id;
    const key = `${call.rep_id}:${recipient}`;
    const previous = attemptsByKey.get(key);
    attemptsByKey.set(key, time);
    if (time >= start) rawDials++;
    if (previous !== undefined && time - previous <= DOUBLE_DIAL_WINDOW_MS) {
      if (time >= start) doubleDials++;
      continue;
    }
    if (time >= start) attempts++;
  }
  return { attempts, rawDials, doubleDials };
}

/** Count appointment IDs once, by when booked and the recorded booking rep.
 * Appointment dates, reschedules, reminder rows and revenue never enter this metric.
 */
export function bookingPerformance(bookings: PerformanceBooking[], reps: PerformanceRep[], start: string, end: string, now = new Date()) {
  const today = sydneyTodayISO(now);
  const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  const yesterday = addDays(today, -1);
  const monthStart = `${today.slice(0, 7)}-01`;
  const days = new Map<string, BookingDay>();
  for (let date = start; date <= end && date <= today; date = addDays(date, 1)) {
    days.set(date, { date, total: 0, byRep: {} });
  }
  const summary = { today: 0, yesterday: 0, week: 0, month: 0 };
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const booking of bookings) {
    if (seen.has(booking.id) || isExampleBooking(booking.patient_name)) continue;
    const time = new Date(booking.booked_at);
    if (!Number.isFinite(time.getTime()) || time > now) continue;
    seen.add(booking.id);
    const date = sydneyTodayISO(time);
    if (date === today) summary.today++;
    if (date === yesterday) summary.yesterday++;
    if (date >= monday && date <= today) summary.week++;
    if (date >= monthStart && date <= today) summary.month++;
    const day = days.get(date);
    if (!day) continue;
    const repId = booking.booking_rep_id || UNASSIGNED_REP;
    day.total++;
    day.byRep[repId] = (day.byRep[repId] ?? 0) + 1;
    counts.set(repId, (counts.get(repId) ?? 0) + 1);
  }
  const rows = reps.filter(rep => (rep.role === "rep" && rep.is_active) || counts.has(rep.id))
    .map(rep => ({ id: rep.id, name: rep.name, bookings: counts.get(rep.id) ?? 0 }));
  const known = new Set(rows.map(rep => rep.id));
  for (const [id, bookings] of counts) {
    if (!known.has(id)) rows.push({ id, name: id === UNASSIGNED_REP ? "Unassigned / website" : "Former rep", bookings });
  }
  rows.sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name));
  return { summary, days: [...days.values()], reps: rows, total: [...counts.values()].reduce((sum, n) => sum + n, 0) };
}

export function groupBookingDays(days: BookingDay[], grouping: BookingGrouping, repId = "") {
  const buckets = new Map<string, { date: string; end: string; bookings: number }>();
  for (const day of days) {
    const key = grouping === "month" ? `${day.date.slice(0, 7)}-01`
      : grouping === "week" ? addDays(day.date, -((new Date(`${day.date}T12:00:00Z`).getUTCDay() + 6) % 7)) : day.date;
    const bucket = buckets.get(key) ?? { date: day.date, end: day.date, bookings: 0 };
    bucket.end = day.date;
    bucket.bookings += repId ? day.byRep[repId] ?? 0 : day.total;
    buckets.set(key, bucket);
  }
  return [...buckets.values()];
}
