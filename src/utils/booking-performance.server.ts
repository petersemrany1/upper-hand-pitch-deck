import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { bookingActor } from "./booking-access.server";
import { addDays, periodDates, sydneyMidnight, type ReportingPeriod } from "@/lib/reporting-period";
import { sydneyTodayISO } from "@/lib/timezone";
import { bookingPerformance, countDialAttempts, DOUBLE_DIAL_WINDOW_MS, isExampleBooking, type PerformanceBooking, type PerformanceCall, type PerformanceRep } from "@/lib/booking-performance";

export type BookingPerformanceInput = { period: ReportingPeriod; start?: string; end?: string };
const PAGE = 500;

/** Caller-scoped, paginated reads; return aggregates only, never patient details. */
export async function loadBookingPerformance(db: SupabaseClient<Database>, input: BookingPerformanceInput, now = new Date()) {
  const actor = await bookingActor(db);
  const isAdmin = actor.role === "admin";
  const today = sydneyTodayISO(now);
  const dates = periodDates(input.period, input.start, input.end, now);
  if (!dates) throw new Error("Choose a valid start and end date.");
  const weekStart = periodDates("week", "", "", now)!.start!;
  const summaryStart = [addDays(today, -1), weekStart, `${today.slice(0, 7)}-01`].sort()[0];
  const fetchStart = dates.start ? [dates.start, summaryStart].sort()[0] : null;
  const end = dates.end && dates.end < today ? dates.end : today;
  const to = dates.end && dates.end < today ? sydneyMidnight(addDays(dates.end, 1)) : now.toISOString();

  async function loadReps() {
    const reps: (PerformanceRep & { first_name: string | null })[] = [];
    for (let offset = 0; ; offset += PAGE) {
      let query = db.from("sales_reps").select("id, name, first_name, role, is_active").order("id").range(offset, offset + PAGE - 1);
      if (!isAdmin) query = query.eq("id", actor.id);
      const { data, error } = await query;
      if (error) throw error;
      reps.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGE) return reps;
    }
  }
  async function loadBookings() {
    const bookings: PerformanceBooking[] = [];
    for (let offset = 0; ; offset += PAGE) {
      let query = db.from("clinic_appointments")
        .select("id, booked_at, booking_rep_id, patient_name")
        .not("patient_name", "ilike", "%test%").not("patient_name", "ilike", "%demo%")
        .lt("booked_at", now.toISOString()).order("booked_at").order("id").range(offset, offset + PAGE - 1);
      if (fetchStart) query = query.gte("booked_at", sydneyMidnight(fetchStart));
      if (!isAdmin) query = query.eq("booking_rep_id", actor.id);
      const { data, error } = await query;
      if (error) throw error;
      bookings.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGE) return bookings;
    }
  }
  const [reps, bookings] = await Promise.all([loadReps(), loadBookings()]);
  const start = dates.start ?? (bookings[0]?.booked_at ? sydneyTodayISO(new Date(bookings[0].booked_at)) : today);
  const report = bookingPerformance(bookings, reps, start, end, now);
  const nina = reps.filter(rep => (rep.first_name?.trim() || rep.name.trim().split(/\s+/)[0]).toLowerCase() === "nina")
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.id.localeCompare(b.id))[0];
  const conversionRep = isAdmin ? nina : reps.find(rep => rep.id === actor.id);
  let conversion = null;
  if (conversionRep) {
    const from = dates.start ? sydneyMidnight(dates.start) : null;
    const calls: PerformanceCall[] = [];
    for (let offset = 0; ; offset += PAGE) {
      let query = db.from("call_records")
        .select("id, rep_id, lead_id, phone, called_at, direction, status, clinic_id, twilio_call_sid")
        .eq("rep_id", conversionRep.id).eq("direction", "outbound")
        .or("clinic_id.is.null,lead_id.not.is.null")
        .lt("called_at", to).order("called_at").order("id").range(offset, offset + PAGE - 1);
      if (from) query = query.gte("called_at", new Date(Date.parse(from) - DOUBLE_DIAL_WINDOW_MS).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      calls.push(...(data ?? []));
      if ((data?.length ?? 0) < PAGE) break;
    }
    const leadIds = [...new Set(calls.map(c => c.lead_id).filter((id): id is string => !!id))];
    const excludedLeads = new Set<string>();
    for (let offset = 0; offset < leadIds.length; offset += 100) {
      const { data, error } = await db.from("meta_leads").select("id, first_name, last_name").in("id", leadIds.slice(offset, offset + 100));
      if (error) throw error;
      for (const lead of data ?? []) {
        if (isExampleBooking(`${lead.first_name ?? ""} ${lead.last_name ?? ""}`)) excludedLeads.add(lead.id);
      }
    }
    const counts = countDialAttempts(calls, from, to, excludedLeads);
    const booked = report.reps.find(rep => rep.id === conversionRep.id)?.bookings ?? 0;
    conversion = {
      repId: conversionRep.id, repName: conversionRep.name, bookings: booked, ...counts,
      // A period throughput ratio, not a lifetime lead-cohort conversion rate.
      percentage: counts.attempts ? booked / counts.attempts * 100 : null,
    };
  }
  return { ...report, start, end, conversion, isAdmin, asOf: now.toISOString() };
}
