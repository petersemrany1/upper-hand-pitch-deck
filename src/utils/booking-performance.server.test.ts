import { describe, expect, it } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { groupBookingDays } from "@/lib/booking-performance";
import { loadBookingPerformance } from "./booking-performance.server";

type Row = Record<string, string | number | boolean | null>;
const nina = { id: "nina", name: "Nina Sinclair", first_name: "Nina", role: "rep", is_active: true };
const other = { id: "other", name: "Other Rep", first_name: "Other", role: "rep", is_active: true };
const now = new Date("2026-10-27T06:00:00Z");
const appointment = (id: string, rep = "nina", date = "2026-10-27T01:00:00Z") => ({ id, booking_rep_id: rep, booked_at: date, patient_name: "Actual Patient", lead_id: "lead-1", patient_phone: null });
const dial = (id: string, rep = "nina", date = "2026-10-27T00:00:00Z") => ({ id, rep_id: rep, lead_id: `lead-${id}`, phone: null, called_at: date, direction: "outbound", status: "completed", duration: 20, duration_seconds: null, outcome: null, clinic_id: null, twilio_call_sid: `sid-${id}` });

function database(actor: { id: string; role: string } | null, overrides: Record<string, Row[]> = {}, failTable = "", failOffset = 0) {
  const tables: Record<string, Row[]> = { sales_reps: [nina, other], clinic_appointments: [appointment("a"), appointment("b", "other")], call_records: [dial("1"), dial("2"), dial("3", "other")], meta_leads: [], ...overrides };
  const reads: { table: string; offset: number; filters: [string, unknown][] }[] = [];
  return {
    reads,
    db: {
      rpc: async () => ({ data: actor ? [actor] : [], error: null }),
      from: (table: string) => {
        let rows = [...tables[table]], low = 0, high = Infinity;
        const filters: [string, unknown][] = [];
        const orders: string[] = [];
        const query = {
          select: () => query,
          eq: (key: string, value: unknown) => { filters.push([key, value]); rows = rows.filter(r => r[key] === value); return query; },
          gte: (key: string, value: string) => { rows = rows.filter(r => typeof r[key] === "string" && r[key] >= value); return query; },
          lt: (key: string, value: string) => { rows = rows.filter(r => typeof r[key] === "string" && r[key] < value); return query; },
          not: (key: string, _op: string, value: string) => { rows = rows.filter(r => !String(r[key]).toLowerCase().includes(value.replace(/%/g, ""))); return query; },
          in: (key: string, values: string[]) => { rows = rows.filter(r => typeof r[key] === "string" && values.includes(r[key])); return query; },
          or: () => { rows = rows.filter(r => r.clinic_id == null || r.lead_id != null); return query; },
          order: (key: string) => { orders.push(key); return query; },
          range: (start: number, end: number) => { low = start; high = end; return query; },
          then: (resolve: (result: unknown) => void) => {
            reads.push({ table, offset: low, filters });
            rows.sort((a, b) => { for (const key of orders) { const diff = String(a[key]).localeCompare(String(b[key])); if (diff) return diff; } return 0; });
            return Promise.resolve({ data: rows.slice(low, high + 1), error: table === failTable && low >= failOffset ? new Error("Data unavailable") : null }).then(resolve);
          },
        };
        return query;
      },
    } as unknown as SupabaseClient<Database>,
  };
}

describe("booking report data access", () => {
  it("gives Nina the same conversion as admin, while scoping her bookings and calls to her account", async () => {
    const admin = database({ id: "admin", role: "admin" });
    const personal = database({ id: "nina", role: "rep" });
    const main = await loadBookingPerformance(admin.db, { period: "day" }, now);
    const own = await loadBookingPerformance(personal.db, { period: "day" }, now);
    expect(main.total).toBe(2);
    expect(own.total).toBe(1);
    expect(main.conversion).toEqual(own.conversion);
    expect(own.conversion?.percentage).toBe(50);
    expect(own.reps.map(r => r.id)).toEqual(["nina"]);
    for (const read of personal.reads.filter(r => r.table === "clinic_appointments")) expect(read.filters).toContainEqual(["booking_rep_id", "nina"]);
    for (const read of personal.reads.filter(r => r.table === "call_records")) expect(read.filters).toContainEqual(["rep_id", "nina"]);
    expect(JSON.stringify(own)).not.toContain("Actual Patient");
  });
  it("rejects callers without a sales identity before reading report data", async () => {
    const test = database(null);
    await expect(loadBookingPerformance(test.db, { period: "month" }, now)).rejects.toThrow("Sales access required");
    expect(test.reads).toHaveLength(0);
  });
  it("paginates beyond the API row cap for bookings and calls", async () => {
    const test = database({ id: "admin", role: "admin" }, {
      clinic_appointments: Array.from({ length: 1101 }, (_, i) => appointment(`a${i}`)),
      call_records: Array.from({ length: 1102 }, (_, i) => dial(`c${i}`)),
    });
    const report = await loadBookingPerformance(test.db, { period: "day" }, now);
    expect(report.total).toBe(1101);
    expect(report.conversion?.connectedPeople).toBe(1102);
    expect(test.reads.filter(r => r.table === "clinic_appointments" && !r.filters.some(([key]) => key === "booking_rep_id")).map(r => r.offset)).toEqual([0, 500, 1000]);
    expect(test.reads.filter(r => r.table === "call_records").map(r => r.offset)).toEqual([0, 500, 1000]);
  });
  it("does not turn a failed later page into a plausible partial count", async () => {
    const test = database({ id: "admin", role: "admin" }, { clinic_appointments: Array.from({ length: 501 }, (_, i) => appointment(`a${i}`)) }, "clinic_appointments", 500);
    await expect(loadBookingPerformance(test.db, { period: "day" }, now)).rejects.toThrow("Data unavailable");
  });
  it("keeps current summary totals when looking at a historical period", async () => {
    const test = database({ id: "admin", role: "admin" }, { clinic_appointments: [appointment("old", "nina", "2026-09-15T00:00:00Z"), appointment("current")] });
    const report = await loadBookingPerformance(test.db, { period: "custom", start: "2026-09-01", end: "2026-09-30" }, now);
    expect(report.total).toBe(1);
    expect(report.summary.today).toBe(1);
    expect(report.days).toHaveLength(30);
    expect(report.conversion?.percentage).toBeNull();
  });
  it("loads every month since the first booking, including empty months and previous years", async () => {
    const test = database({ id: "admin", role: "admin" }, { clinic_appointments: [
      appointment("first", "other", "2025-12-31T12:59:59Z"),
      appointment("new-year", "nina", "2025-12-31T13:00:00Z"),
      appointment("last-month", "nina", "2026-09-30T13:59:59Z"),
      appointment("this-month", "nina", "2026-09-30T14:00:00Z"),
      appointment("today"),
    ] });
    const report = await loadBookingPerformance(test.db, { period: "all" }, now);
    const months = groupBookingDays(report.days, "month");
    expect(report.start).toBe("2025-12-31");
    expect(report.end).toBe("2026-10-27");
    expect(months).toHaveLength(11);
    expect(months.map(month => month.bookings)).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2]);
    expect(months.reduce((total, month) => total + month.bookings, 0)).toBe(report.total);
    expect(report.summary.month).toBe(2);
    expect(groupBookingDays(report.days, "month", "other").map(month => month.bookings)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  it("counts the connected person inside the selected period once across midnight", async () => {
    const calls = [dial("1", "nina", "2026-10-26T12:59:30Z"), { ...dial("2", "nina", "2026-10-26T13:00:10Z"), lead_id: "lead-1" }];
    const test = database({ id: "admin", role: "admin" }, { call_records: calls });
    const report = await loadBookingPerformance(test.db, { period: "day" }, now);
    expect(report.conversion?.connectedPeople).toBe(1);
    expect(report.conversion?.connectedCalls).toBe(1);
  });
  it("excludes test/demo dials from the percentage and includes zero booking reps", async () => {
    const test = database({ id: "admin", role: "admin" }, {
      clinic_appointments: [appointment("a")],
      meta_leads: [{ id: "lead-1", first_name: "Peter", last_name: "Test 2" }],
    });
    const report = await loadBookingPerformance(test.db, { period: "month" }, now);
    expect(report.conversion?.connectedPeople).toBe(1);
    expect(report.conversion?.percentage).toBe(0);
    expect(report.reps.find(r => r.id === "other")?.bookings).toBe(0);
  });
  it("shows unavailable rather than zero if Nina is absent and rejects invalid custom ranges", async () => {
    const test = database({ id: "admin", role: "admin" }, { sales_reps: [other] });
    expect((await loadBookingPerformance(test.db, { period: "month" }, now)).conversion).toBeNull();
    await expect(loadBookingPerformance(test.db, { period: "custom", start: "2026-10-30", end: "2026-10-01" }, now)).rejects.toThrow("Choose a valid");
  });
  it("counts a later booking for a historical connection and retains workdays without bookings", async () => {
    const test = database({ id: "admin", role: "admin" }, {
      clinic_appointments: [appointment("later", "nina", "2026-10-20T00:00:00Z")],
      call_records: [dial("1", "nina", "2026-09-15T00:00:00Z"), { ...dial("2", "nina", "2026-09-16T00:00:00Z"), status: "no-answer", duration: 0 }],
    });
    const report = await loadBookingPerformance(test.db, { period: "custom", start: "2026-09-01", end: "2026-09-30" }, now);
    expect(report.total).toBe(0);
    expect(report.conversion?.connectedPeople).toBe(1);
    expect(report.conversion?.bookedPeople).toBe(1);
    expect(report.conversion?.percentage).toBe(100);
    expect(report.days.filter(day => day.workedByRep.nina).map(day => day.date)).toEqual(["2026-09-15", "2026-09-16"]);
  });
  it("starts all-time charts at the first work activity, even before the first booking", async () => {
    const test = database({ id: "nina", role: "rep" }, { call_records: [dial("1", "nina", "2026-09-15T00:00:00Z")] });
    const report = await loadBookingPerformance(test.db, { period: "all" }, now);
    expect(report.start).toBe("2026-09-15");
    expect(report.days[0].workedByRep).toEqual({ nina: true });
  });

});
