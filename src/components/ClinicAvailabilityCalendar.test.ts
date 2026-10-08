import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import { calendarPreviewFixture } from "@/lib/calendar-preview-fixture";
import type { ClinicSchedule, ScheduleCommand } from "@/lib/clinic-schedule";

const browser = new Window({ url: "http://localhost" });
const environment = {
  window: browser, document: browser.document, navigator: browser.navigator,
  HTMLElement: browser.HTMLElement, HTMLInputElement: browser.HTMLInputElement, Element: browser.Element, Node: browser.Node,
  NodeFilter: browser.NodeFilter, MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver, CustomEvent: browser.CustomEvent,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
};
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const { ClinicAvailabilityCalendar } = await import("./ClinicAvailabilityCalendar");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => {
  await act(async () => root.unmount());
  // Radix restores focus on the next task; keep this DOM alive until it finishes.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
  host.remove();
});
afterAll(() => {
  browser.happyDOM.abort();
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
});
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === text)!;
const click = async (element: HTMLElement) => { await act(async () => element.click()); };
const render = async (schedule: ClinicSchedule, onSave: (command: ScheduleCommand, version: string) => Promise<ClinicSchedule>) => {
  await act(async () => root.render(h(ClinicAvailabilityCalendar, { schedule, onSave, initialDate: schedule.blocks[0].slot_date! })));
};

test("booked appointments show the full patient name, including short bookings", async () => {
  const schedule = calendarPreviewFixture();
  schedule.appointments[0].patient_name = "Alexandra Jane Smith";
  schedule.appointments[0].consultation_duration_minutes = 30;
  await render(schedule, async () => schedule);
  expect(host.querySelector(".availability-booked strong")?.textContent).toBe("Alexandra Jane Smith");
  expect(host.querySelector(".availability-booked")?.textContent).not.toContain("Booked ·");
});
test("closing shading explains the last start and updates with consultation length", async () => {
  const schedule = calendarPreviewFixture();
  schedule.consultation_minutes = 60;
  schedule.trading = schedule.trading.map(hours => ({ ...hours, close_time: "16:00" }));
  schedule.overrides = [];
  await render(schedule, async () => schedule);
  expect(host.querySelector(".availability-closing-buffer")?.textContent).toBe("Last appointment: 3pm");
  await render({ ...schedule, consultation_minutes: 90 }, async () => schedule);
  expect(host.querySelector(".availability-closing-buffer")?.textContent).toBe("Last appointment: 2:30pm");
});
test("a failed save keeps the editor and draft visible instead of showing success", async () => {
  const schedule = calendarPreviewFixture(); let attempts = 0;
  await render(schedule, async () => { attempts++; throw new Error("Connection interrupted. Try again."); });
  await click(host.querySelector<HTMLButtonElement>('[aria-label^="Edit working hours"]')!);
  await click(button("Save working hours"));
  expect(attempts).toBe(1); expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Connection interrupted");
  expect(document.querySelector('[role="status"]')?.textContent ?? "").not.toContain("saved");
  expect(document.querySelector<HTMLInputElement>('input[type="time"]')?.value).toBe("09:00");
});
test("background updates do not silently replace an open editor's version", async () => {
  const schedule = calendarPreviewFixture(); let submittedVersion = "";
  const save = async (_command: ScheduleCommand, version: string) => { submittedVersion = version; throw new Error("This calendar changed while you were editing. Refresh and try again."); };
  await render(schedule, save);
  await click(host.querySelector<HTMLButtonElement>('[aria-label^="Edit working hours"]')!);
  await render({ ...schedule, version: "newer-version" }, save);
  await click(button("Save working hours"));
  expect(submittedVersion).toBe(schedule.version);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("changed while you were editing");
});
test("blocking a booked patient's time disables saving before any request", async () => {
  const schedule = calendarPreviewFixture(); let attempts = 0;
  await render(schedule, async () => { attempts++; return schedule; });
  await click(host.querySelectorAll<HTMLButtonElement>('[aria-label^="Edit working hours"]')[1]);
  await click(document.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("patient is booked");
  expect(button("Save working hours").disabled).toBe(true); expect(attempts).toBe(0);
});

test("weeks begin Monday, end Sunday and arrows move seven days", async () => {
  const schedule = calendarPreviewFixture();
  await act(async () => root.render(h(ClinicAvailabilityCalendar, { schedule, onSave: async () => schedule, initialDate: "2026-10-14" })));
  const headers = () => [...host.querySelectorAll('[aria-label^="Edit working hours"]')].map(el => el.getAttribute('aria-label'));
  expect(headers()).toHaveLength(7);
  expect(headers()[0]).toContain("Mon, 12 Oct");
  expect(headers()[6]).toContain("Sun, 18 Oct");
  await click(host.querySelector<HTMLButtonElement>('[aria-label="Next week"]')!);
  expect(headers()[0]).toContain("Mon, 19 Oct");
  expect(headers()[6]).toContain("Sun, 25 Oct");
  await click(host.querySelector<HTMLButtonElement>('[aria-label="Previous week"]')!);
  expect(headers()[0]).toContain("Mon, 12 Oct");
});

test("settings opens a compact dialog and failed saves keep the draft visible", async () => {
  const schedule = calendarPreviewFixture();
  await render(schedule, async () => { throw new Error("Connection interrupted. Try again."); });
  await click(host.querySelector<HTMLButtonElement>('.availability-settings-summary')!);
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("Calendar settings");
  expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(7);
  await click(button("Save settings"));
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("Connection interrupted");
  await click(button("Cancel"));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("updating existing consultation lengths requires confirmation and preserves it after a failed save", async () => {
  const schedule = calendarPreviewFixture();
  schedule.appointments[0].consultation_duration_minutes = 30;
  let attempts = 0;
  await render(schedule, async command => { attempts++; expect(command.action === "settings" && command.apply_to_existing).toBe(true); throw new Error("Connection interrupted"); });
  await click(host.querySelector<HTMLButtonElement>('.availability-settings-summary')!);
  await click(button("Save settings"));
  expect(attempts).toBe(0);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Start times stay unchanged");
  await click(button("Back"));
  expect(attempts).toBe(0);
  await click(button("Save settings"));
  await click(button("Yes, update all appointments"));
  expect(attempts).toBe(1);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Connection interrupted");
  expect(button("Yes, update all appointments")).not.toBeUndefined();
});
