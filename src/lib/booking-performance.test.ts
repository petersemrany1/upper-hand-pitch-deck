import { describe, expect, it } from "bun:test";
import { bookingPerformance, connectedBookingConversion, countDialAttempts, groupBookingDays, type PerformanceBooking, type PerformanceCall } from "./booking-performance";
import { periodDates, periodInstants } from "./reporting-period";

const now = new Date("2026-10-27T05:00:00Z");
const reps = [
  { id: "nina", name: "Nina Sinclair", role: "rep", is_active: true },
  { id: "other", name: "Other Rep", role: "rep", is_active: true },
  { id: "old", name: "Past Rep", role: "rep", is_active: false },
];
const booking = (id: string, booked_at: string, overrides: Partial<PerformanceBooking> = {}): PerformanceBooking => ({ id, booked_at, booking_rep_id: "nina", patient_name: "Real Patient", ...overrides });
const call = (id: string, called_at: string, overrides: Partial<PerformanceCall> = {}): PerformanceCall => ({ id, called_at, rep_id: "nina", lead_id: "patient", phone: "0412345678", direction: "outbound", status: "no-answer", clinic_id: null, twilio_call_sid: `sid-${id}`, ...overrides });

describe("booking performance", () => {
  it("counts bookings by Sydney booking date, including yesterday and Monday boundaries", () => {
    const data = [booking("old", "2026-09-30T13:59:59Z"), booking("month", "2026-09-30T14:00:00Z"), booking("week", "2026-10-25T13:00:00Z"), booking("today", "2026-10-26T13:00:00Z")];
    const result = bookingPerformance(data, reps, "2026-10-01", "2026-10-31", now);
    expect(result.summary).toEqual({ today: 1, yesterday: 1, week: 2, month: 3 });
    expect(result.total).toBe(3);
    expect(result.days).toHaveLength(27);
    expect(result.days.find(d => d.date === "2026-10-25")?.total).toBe(0);
    expect(result.reps).toEqual([{ id: "nina", name: "Nina Sinclair", bookings: 3 }, { id: "other", name: "Other Rep", bookings: 0 }]);
  });
  it("counts each appointment once, omits test/demo/future records and includes unassigned bookings", () => {
    const actual = booking("one", "2026-10-26T23:00:00Z");
    const result = bookingPerformance([actual, actual, booking("test", actual.booked_at, { patient_name: "Peter Test 2" }), booking("demo", actual.booked_at, { patient_name: "Demo Patient" }), booking("future", "2026-10-28T00:00:00Z"), booking("website", actual.booked_at, { booking_rep_id: null })], reps, "2026-10-27", "2026-10-27", now);
    expect(result.total).toBe(2);
    expect(result.summary.today).toBe(2);
    expect(result.reps.reduce((sum, rep) => sum + rep.bookings, 0)).toBe(result.total);
    expect(result.reps.find(rep => rep.id === "unassigned")?.bookings).toBe(1);
  });
  it("retains the recorded booking rep and historical inactive reps", () => {
    const result = bookingPerformance([booking("a", "2026-10-26T23:00:00Z", { booking_rep_id: "old" })], reps, "2026-10-27", "2026-10-27", now);
    expect(result.reps.find(rep => rep.id === "old")?.bookings).toBe(1);
    expect(result.reps.find(rep => rep.id === "nina")?.bookings).toBe(0);
  });
  it("aggregates active days by rep, Monday week and calendar month", () => {
    const result = bookingPerformance([booking("a", "2026-09-30T23:00:00Z"), booking("b", "2026-10-04T23:00:00Z"), booking("c", "2026-10-05T23:00:00Z", { booking_rep_id: "other" })], reps, "2026-09-30", "2026-10-06", now);
    expect(groupBookingDays(result.days, "week")).toEqual([{ date: "2026-10-01", end: "2026-10-01", bookings: 1 }, { date: "2026-10-05", end: "2026-10-06", bookings: 2 }]);
    expect(groupBookingDays(result.days, "month", "nina")).toEqual([{ date: "2026-10-01", end: "2026-10-05", bookings: 2 }]);
  });
  it("returns true zero results and no future chart points", () => {
    expect(bookingPerformance([], reps, "2026-10-27", "2026-10-31", now).days).toEqual([{ date: "2026-10-27", total: 0, byRep: {}, workedByRep: {} }]);
    expect(bookingPerformance([], reps, "2026-11-01", "2026-11-05", now).days).toEqual([]);
  });
  it("handles yesterday across daylight saving and year boundaries", () => {
    expect(periodDates("yesterday", "", "", new Date("2027-01-01T01:00:00Z"))).toEqual({ start: "2026-12-31", end: "2026-12-31" });
    const dst = periodInstants("yesterday", "", "", new Date("2026-10-05T01:00:00Z"))!;
    expect((Date.parse(dst.to!) - Date.parse(dst.from!)) / 3_600_000).toBe(23);
  });
});

describe("calls to bookings denominator", () => {
  const from = "2026-10-26T13:00:00Z", to = "2026-10-27T13:00:00Z";
  it("combines immediate double dials but counts later attempts, even if unanswered", () => {
    const calls = [call("1", "2026-10-27T00:00:00Z"), call("2", "2026-10-27T00:00:45Z"), call("3", "2026-10-27T01:00:00Z"), call("4", "2026-10-27T01:01:00Z"), call("5", "2026-10-27T01:02:01Z")];
    expect(countDialAttempts(calls.reverse(), from, to)).toEqual({ attempts: 3, rawDials: 5, doubleDials: 2 });
  });
  it("does not merge different reps or different patients", () => {
    expect(countDialAttempts([call("1", from), call("2", from, { rep_id: "other" }), call("3", from, { lead_id: "other-patient", phone: "0499999999" })], from, to).attempts).toBe(3);
  });
  it("normalizes phone formats and handles missing phone or lead IDs", () => {
    const calls = [call("1", from), call("2", "2026-10-26T13:00:10Z", { phone: "+61 412 345 678", lead_id: null }), call("3", "2026-10-26T13:00:20Z", { phone: null })];
    expect(countDialAttempts(calls, from, to)).toEqual({ attempts: 1, rawDials: 3, doubleDials: 2 });
  });
  it("deduplicates provider rows by call SID before counting double dials", () => {
    expect(countDialAttempts([call("1", from), call("duplicate", "2026-10-26T13:05:00Z", { twilio_call_sid: "sid-1" })], from, to)).toEqual({ attempts: 1, rawDials: 1, doubleDials: 0 });
  });
  it("excludes test leads, inbound/prospecting calls and calls not yet dialled", () => {
    const data = [call("valid", from), call("inbound", from, { direction: "inbound" }), call("prospect", from, { clinic_id: "clinic", lead_id: null }), call("test", from, { lead_id: "test" }), call("queued", from, { status: "queued" }), call("initiated", from, { status: "initiated" }), call("unattributed", from, { rep_id: null })];
    expect(countDialAttempts(data, from, to, new Set(["test"]))).toEqual({ attempts: 1, rawDials: 1, doubleDials: 0 });
  });
  it("assigns midnight double dials to the first dial's date without losing later attempts", () => {
    const data = [call("1", "2026-10-26T12:59:30Z"), call("2", "2026-10-26T13:00:10Z"), call("3", "2026-10-26T14:00:00Z")];
    expect(countDialAttempts(data, from, to)).toEqual({ attempts: 1, rawDials: 2, doubleDials: 1 });
    expect(countDialAttempts(data, "2026-10-25T13:00:00Z", to).attempts).toBe(2);
  });
  it("uses an exclusive period end and returns zero for no calls", () => {
    expect(countDialAttempts([call("1", to)], from, to).attempts).toBe(0);
    expect(countDialAttempts([], from, to)).toEqual({ attempts: 0, rawDials: 0, doubleDials: 0 });
  });
});


describe("connected people conversion", () => {
  const from = "2026-10-01T00:00:00Z", to = "2026-10-10T00:00:00Z", asOf = "2026-10-27T00:00:00Z";
  const connected = (id: string, lead = id, overrides: Partial<PerformanceCall> = {}) => call(id, "2026-10-05T00:00:00Z", { lead_id: lead, phone: null, status: "completed", duration: 30, ...overrides });
  it("counts each connected person once and only their linked later bookings", () => {
    const calls = [connected("a1", "a"), connected("a2", "a", { called_at: "2026-10-05T00:00:40Z" }), connected("a3", "a", { called_at: "2026-10-06T00:00:00Z" }), connected("b"), connected("unanswered", "c", { status: "no-answer", duration: 0 })];
    const bookings = [booking("a", "2026-10-15T00:00:00Z", { lead_id: "a" }), booking("duplicate", "2026-10-16T00:00:00Z", { lead_id: "a" }), booking("unconnected", "2026-10-07T00:00:00Z", { lead_id: "c" }), booking("other-rep", "2026-10-07T00:00:00Z", { lead_id: "b", booking_rep_id: "other" })];
    expect(connectedBookingConversion(calls, bookings, "nina", from, to, asOf)).toEqual({ connectedPeople: 2, bookedPeople: 1, connectedCalls: 4, repeatConnections: 2, percentage: 50 });
  });
  it("uses the portal connection boundary and manual connection evidence", () => {
    const calls = [connected("short", "short", { duration: 14 }), connected("boundary", "boundary", { duration: 15 }), connected("legacy", "legacy", { duration: null, duration_seconds: 15 }), connected("manual", "manual", { duration: 0, outcome: "connected" }), connected("failed", "failed", { status: "failed", duration: 120 }), connected("pending", "pending", { status: "in-progress", duration: 120 })];
    expect(connectedBookingConversion(calls, [], "nina", from, to, asOf).connectedPeople).toBe(3);
  });
  it("excludes service calls, test leads, inbound and prospecting calls", () => {
    const calls = [connected("booked"), connected("paid"), connected("test"), connected("inbound", "inbound", { direction: "inbound" }), connected("prospect", "prospect", { clinic_id: "clinic", lead_id: null }), connected("other", "other", { rep_id: "other" })];
    const bookings = [booking("booked", "2026-10-04T00:00:00Z", { lead_id: "booked" })];
    expect(connectedBookingConversion(calls, bookings, "nina", from, to, asOf, new Set(["test"]), new Map([["paid", Date.parse("2026-10-04T00:00:00Z")]]))).toEqual({ connectedPeople: 0, bookedPeople: 0, connectedCalls: 0, repeatConnections: 0, percentage: null });
  });
  it("joins phone formats and calls missing lead IDs, while counting duplicate provider rows once", () => {
    const calls = [connected("a", "lead", { phone: "0412345678" }), connected("a-copy", "lead", { phone: null, twilio_call_sid: "sid-a" }), connected("b", "lead", { phone: "+61 412 345 678", lead_id: null })];
    const bookings = [booking("a", "2026-10-07T00:00:00Z", { lead_id: "lead", patient_phone: null })];
    expect(connectedBookingConversion(calls, bookings, "nina", from, to, asOf)).toEqual({ connectedPeople: 1, bookedPeople: 1, connectedCalls: 2, repeatConnections: 1, percentage: 100 });
  });
  it("counts a person once when their phone number changes and joins phone-only records", () => {
    const calls = [connected("old", "lead", { phone: "0411111111" }), connected("new", "lead", { phone: "0422222222" }), connected("phone-only", "lead", { phone: "+61411111111", lead_id: null })];
    const bookings = [booking("a", "2026-10-07T00:00:00Z", { lead_id: "lead", patient_phone: "0422222222" })];
    expect(connectedBookingConversion(calls, bookings, "nina", from, to, asOf)).toEqual({ connectedPeople: 1, bookedPeople: 1, connectedCalls: 3, repeatConnections: 2, percentage: 100 });
  });
  it("includes a connection inside the range after an unanswered pre-period dial and excludes the end boundary", () => {
    const calls = [connected("before", "a", { called_at: "2026-09-30T23:59:40Z", status: "no-answer", duration: 0 }), connected("inside", "a", { called_at: from }), connected("end", "b", { called_at: to })];
    expect(connectedBookingConversion(calls, [], "nina", from, to, asOf).connectedPeople).toBe(1);
  });
});

describe("workday booking charts", () => {
  it("omits days off, keeps zero-booking workdays and filters activity by rep", () => {
    const calls = [call("worked", "2026-10-09T00:00:00Z"), call("other", "2026-10-10T00:00:00Z", { rep_id: "other" })];
    const data = bookingPerformance([booking("booked", "2026-10-11T00:00:00Z")], reps, "2026-10-08", "2026-10-12", now, calls);
    expect(groupBookingDays(data.days, "day", "nina")).toEqual([{ date: "2026-10-09", end: "2026-10-09", bookings: 0 }, { date: "2026-10-11", end: "2026-10-11", bookings: 1 }]);
    expect(groupBookingDays(data.days, "day").map(day => day.date)).toEqual(["2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(groupBookingDays(data.days, "week", "nina")).toEqual([{ date: "2026-10-09", end: "2026-10-11", bookings: 1 }]);
    expect(data.total).toBe(1);
  });
  it("uses Sydney activity dates and excludes pending/prospecting calls", () => {
    const data = bookingPerformance([], reps, "2026-10-08", "2026-10-10", now, [call("active", "2026-10-08T13:00:00Z"), call("queued", "2026-10-10T00:00:00Z", { status: "queued" }), call("prospect", "2026-10-10T00:00:00Z", { clinic_id: "c", lead_id: null })]);
    expect(groupBookingDays(data.days, "day", "nina")).toEqual([{ date: "2026-10-09", end: "2026-10-09", bookings: 0 }]);
  });
});
