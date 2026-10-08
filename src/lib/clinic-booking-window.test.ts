import { expect, test } from "bun:test";
import { dateInBookingWindow, trialBookingWindow, type ClinicTrial } from "./clinic-booking-window";
import { clinicRemainingBalances } from "./clinic-capacity-balance";

const trial: ClinicTrial = { clinic_id: "gro", booking_opens: "2026-10-08", appointment_start: "2026-10-12", appointment_end: "2026-10-20", paid_started_at: null };
const window = trialBookingWindow(trial);
test("Thursday bookings can fill the inclusive 12–20 October appointment window", () => {
  expect(dateInBookingWindow(window,"2026-10-12","2026-10-08")).toBe(true);
  expect(dateInBookingWindow(window,"2026-10-20","2026-10-20")).toBe(true);
  expect(dateInBookingWindow(window,"2026-10-11","2026-10-08")).toBe(false);
  expect(dateInBookingWindow(window,"2026-10-21","2026-10-08")).toBe(false);
  expect(dateInBookingWindow(window,"2026-10-12","2026-10-07")).toBe(false);
  expect(dateInBookingWindow(window,"2026-10-20","2026-10-21")).toBe(false);
});
test("trial leads remain callable with no paid pack outside the booking window", () => {
  expect(clinicRemainingBalances([],[],"2026-10-07",[trial]).gro).toBe(1);
  expect(clinicRemainingBalances([],[],"2026-10-08",[trial]).gro).toBe(1);
  expect(clinicRemainingBalances([],[],"2026-10-20",[trial]).gro).toBe(1);
  expect(clinicRemainingBalances([],[],"2026-10-21",[trial]).gro).toBe(1);
});
test("buying a pack does not silently end the trial; explicit activation starts paid capacity", () => {
  const pack = { clinic_id:"gro",pack_size:10,pack_type:"paid",date_paid:"2026-10-20",purchased_at:"2026-10-20T00:00:00Z" };
  const appointment = { clinic_id:"gro",outcome:"show",disqualified_at:null,booked_at:"2026-10-08T00:00:00Z",is_free_trial:true };
  const paid = { ...trial, paid_started_at:"2026-10-21T00:00:00Z" };
  expect(clinicRemainingBalances([pack],[appointment],"2026-10-21",[trial]).gro).toBe(1);
  expect(clinicRemainingBalances([pack],[appointment],"2026-10-21",[paid]).gro).toBe(10);
  expect(trialBookingWindow(paid)).toBe(null);
  expect(dateInBookingWindow(null,"2026-11-01","2026-10-21")).toBe(true);
});
