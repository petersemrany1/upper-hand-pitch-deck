import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h, useState } from "react";
import { bookingPerformance } from "@/lib/booking-performance";
import { periodDates, type ReportingPeriod } from "@/lib/reporting-period";

const browser = new Window({ url: "http://localhost" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, ResizeObserver: browser.ResizeObserver, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const { BookingPerformanceView } = await import("./BookingPerformanceView");
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const now = new Date("2026-10-29T02:00:00Z");
const reps = [{ id: "nina", name: "Nina Sinclair", role: "rep", is_active: true }, { id: "bec", name: "Bec", role: "rep", is_active: true }];
const bookings = [
  { id: "first", booked_at: "2025-12-15T01:00:00Z", booking_rep_id: "nina", patient_name: "Patient A" },
  { id: "last", booked_at: "2026-09-10T01:00:00Z", booking_rep_id: "bec", patient_name: "Patient B" },
  { id: "current", booked_at: "2026-10-10T01:00:00Z", booking_rep_id: "nina", patient_name: "Patient C" },
  { id: "today", booked_at: "2026-10-29T01:00:00Z", booking_rep_id: "bec", patient_name: "Patient D" },
];

function Fixture({ initialPeriod = "all" }: { initialPeriod?: ReportingPeriod }) {
  const [period, onPeriod] = useState(initialPeriod);
  const dates = periodDates(period, "", "", now)!;
  const start = dates.start ?? "2025-12-15";
  const end = dates.end && dates.end < "2026-10-29" ? dates.end : "2026-10-29";
  return h(BookingPerformanceView, {
    report: { ...bookingPerformance(bookings, reps, start, end, now), start, end, conversion: null, isAdmin: true, asOf: now.toISOString() },
    tab: "bookings", onTab: () => {}, isAdmin: true, loading: false, onRetry: () => {}, period, onPeriod,
    start: "", end: "", onStart: () => {}, onEnd: () => {},
  });
}
const monthlyRows = () => [...host.querySelectorAll(".booking-monthly-totals tbody tr")];
const monthlyCounts = () => monthlyRows().map(row => row.querySelector("td")?.textContent);
const button = (label: string) => [...host.querySelectorAll("button")].find(node => node.textContent === label)!;
async function render(initialPeriod: ReportingPeriod = "all") {
  await act(async () => { root.render(h(Fixture, { initialPeriod })); });
}

beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
afterAll(() => {
  browser.happyDOM.abort();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

describe("monthly booking history", () => {
  test("shows every monthly total, newest first, without opening details", async () => {
    await render();
    expect(button("Monthly").getAttribute("aria-pressed")).toBe("true");
    expect(monthlyRows()).toHaveLength(11);
    expect(monthlyRows()[0].textContent).toBe("October 2026This month · to date2");
    expect(monthlyRows()[1].textContent).toBe("September 2026Last month1");
    expect(monthlyRows().at(-1)?.textContent).toBe("December 20251");
    expect(monthlyCounts()).toEqual(["2", "1", "0", "0", "0", "0", "0", "0", "0", "0", "1"]);
    expect(host.querySelector(".booking-monthly-totals")?.closest("details")).toBeNull();
  });

  test("Monthly requests all history after a current-month view, and short periods restore daily detail", async () => {
    await render("month");
    expect(monthlyRows()).toHaveLength(0);
    await act(async () => button("Monthly").click());
    expect((host.querySelector('[aria-label="Reporting period"]') as HTMLSelectElement).value).toBe("all");
    expect(monthlyRows()).toHaveLength(11);
    await act(async () => (host.querySelector('[aria-label="Bookings this month"]') as HTMLButtonElement).click());
    expect(button("Daily").getAttribute("aria-pressed")).toBe("true");
    expect(monthlyRows()).toHaveLength(0);
    await act(async () => button("Monthly").click());
    expect(monthlyCounts()[0]).toBe("2");
    expect(monthlyRows()).toHaveLength(11);
  });

  test("keeps every month visible when filtering the trend to a rep", async () => {
    await render();
    const select = host.querySelector('[aria-label="Booking trend rep"]') as HTMLSelectElement;
    await act(async () => { select.value = "nina"; select.dispatchEvent(new browser.Event("change", { bubbles: true })); });
    expect(monthlyRows()).toHaveLength(11);
    expect(monthlyCounts()).toEqual(["1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "1"]);
  });
});
