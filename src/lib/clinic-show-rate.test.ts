import { describe, expect, test } from "bun:test";
import { clinicShowRate } from "./clinic-show-rate";

const now = new Date("2026-10-26T01:00:00Z"); // Midday in Sydney.
const appointment = (overrides = {}) => ({
  appointment_date: "2026-10-25", appointment_time: "09:00:00",
  outcome: null as string | null, disqualified_at: null as string | null, ...overrides,
});

describe("clinic show rate", () => {
  test("20 past appointments with four no-shows gives 80%, including unmarked and trial consults", () => {
    const appointments = Array.from({ length: 20 }, (_, i) => appointment({
      outcome: i < 4 ? "noshow" : i < 8 ? "show" : i < 12 ? "proceeded" : null,
      is_free_trial: i % 2 === 0,
    }));
    expect(clinicShowRate(appointments, now)).toEqual({ past: 20, noShows: 4, percentage: 80 });
  });

  test("upcoming and disqualified appointments do not affect the rate", () => {
    const appointments = [
      appointment({ outcome: "show" }), appointment({ outcome: "noshow" }),
      appointment({ outcome: "disqualified" }),
      appointment({ disqualified_at: "2026-10-25T00:00:00Z", outcome: "noshow" }),
      appointment({ appointment_date: "2026-10-27" }),
      appointment({ appointment_date: "2026-10-27", outcome: "noshow" }),
      appointment({ appointment_date: "2026-10-26", appointment_time: "13:00:00" }),
    ];
    expect(clinicShowRate(appointments, now)).toEqual({ past: 2, noShows: 1, percentage: 50 });
  });

  test("today's appointments count only after their scheduled time in Sydney", () => {
    const appointments = [
      appointment({ appointment_date: "2026-10-26", appointment_time: "9:00" }),
      appointment({ appointment_date: "2026-10-26", appointment_time: "11:59:59", outcome: "noshow" }),
      appointment({ appointment_date: "2026-10-26", appointment_time: "12:00:00" }),
      appointment({ appointment_date: "2026-10-26", appointment_time: "12:00:01" }),
    ];
    expect(clinicShowRate(appointments, now)).toEqual({ past: 2, noShows: 1, percentage: 50 });
  });

  test("Sydney's date is used even when UTC is still the previous day", () => {
    expect(clinicShowRate([
      appointment({ appointment_time: "23:59:00" }),
      appointment({ appointment_date: "2026-10-26", appointment_time: "09:00:00", outcome: "noshow" }),
    ], new Date("2026-10-25T13:30:00Z"))).toEqual({ past: 1, noShows: 0, percentage: 100 });
  });

  test("no past appointments is unknown, while all no-shows is a real zero", () => {
    expect(clinicShowRate([], now).percentage).toBeNull();
    expect(clinicShowRate([appointment({ appointment_date: "2026-10-27" })], now).percentage).toBeNull();
    expect(clinicShowRate([appointment({ outcome: "noshow" })], now).percentage).toBe(0);
    expect(clinicShowRate([appointment()], now).percentage).toBe(100);
  });
});
