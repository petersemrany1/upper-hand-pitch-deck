import { expect, test } from "bun:test";
import { clinicRemainingBalances } from "./clinic-capacity-balance";

const pack = { clinic_id: "melbourne", pack_size: 10, pack_type: "paid", date_paid: "2026-09-01", purchased_at: "2026-09-01T00:00:00Z" };
const appointment = { clinic_id: "melbourne", outcome: null, disqualified_at: null, booked_at: "2026-10-01T00:00:00Z" };

test("dated trial leads remain available before, during and after the booking window", () => {
  const trial = { clinic_id: "sydney", booking_opens: "2026-10-08", appointment_start: "2026-10-12", appointment_end: "2026-10-20", paid_started_at: null };
  for (const today of ["2026-10-07", "2026-10-08", "2026-10-21"]) {
    expect(clinicRemainingBalances([], [], today, [trial]).sydney).toBe(1);
  }
  expect(clinicRemainingBalances([], [], "2026-10-21", [{ ...trial, paid_started_at: "2026-10-21T00:00:00Z" }]).sydney).toBeUndefined();
});

test("shared balance counts all bookings and stays negative after the final live call books", () => {
  expect(clinicRemainingBalances([pack], Array(10).fill(appointment), "2026-10-05").melbourne).toBe(0);
  expect(clinicRemainingBalances([pack], Array(11).fill(appointment), "2026-10-05").melbourne).toBe(-1);
  expect(clinicRemainingBalances([pack, pack], Array(11).fill(appointment), "2026-10-05").melbourne).toBe(9);
});

test("no-shows and disqualifications restore capacity but unmarked past appointments still consume it", () => {
  const appts = [appointment, { ...appointment, outcome: "noshow" }, { ...appointment, outcome: "disqualified" }, { ...appointment, disqualified_at: "2026-10-02" }];
  expect(clinicRemainingBalances([pack], appts, "2026-10-05").melbourne).toBe(9);
});

test("free-trial bookings stay outside the paid balance", () => {
  const trial = { ...pack, pack_type: "free_trial", date_paid: "2026-08-01" };
  expect(clinicRemainingBalances([trial, pack], [{ ...appointment, booked_at: "2026-09-01T00:00:00Z" }, appointment], "2026-10-05").melbourne).toBe(9);
});
