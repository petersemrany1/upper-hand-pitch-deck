import { afterAll, afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h, useState } from "react";
import { calendarPreviewFixture } from "@/lib/calendar-preview-fixture";
import { applyScheduleCommand, type ClinicSchedule, type ScheduleCommand } from "@/lib/clinic-schedule";

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
test("clicking the displayed time range stops at the next blocked interval", async () => {
  const schedule = calendarPreviewFixture();
  const date = "2099-10-12";
  schedule.appointments = []; schedule.overrides = [];
  schedule.blocks = [{ ...schedule.blocks[0], slot_date: date, slot_start: "10:15", slot_end: "12:00" }];
  schedule.trading = schedule.trading.map(day => ({ ...day, is_closed: false, open_time: "09:00", close_time: "15:00" }));
  await render(schedule, async () => schedule);
  const slot = host.querySelector<HTMLButtonElement>('.availability-empty[data-minute="600"]')!;
  expect(slot.textContent).toBe("10:00am–10:15am");
  const day = slot.closest<HTMLElement>('.availability-day')!;
  day.setPointerCapture = () => {}; day.hasPointerCapture = () => false;
  await act(async () => {
    slot.dispatchEvent(new window.PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "mouse", button: 0 }));
    day.dispatchEvent(new window.PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "mouse", button: 0 }));
  });
  expect([...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[type="time"]')].map(input => input.value)).toEqual(["10:00", "10:15"]);
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
test("closing-time shading ends before a late patient card instead of covering its label", async () => {
  const schedule = calendarPreviewFixture();
  schedule.consultation_minutes = 60; schedule.buffer_minutes = 0;
  schedule.trading = schedule.trading.map(h => ({ ...h, close_time: "16:00" }));
  schedule.overrides = [];
  schedule.appointments = [{ id: "late", patient_name: "Alex Smith", appointment_date: schedule.blocks[0].slot_date!, appointment_time: "15:30", consultation_duration_minutes: 60 }];
  await render(schedule, async () => schedule);
  const shading = host.querySelector<HTMLElement>('.availability-closing-buffer')!;
  const patient = host.querySelector<HTMLElement>('.availability-booked')!;
  expect(shading.textContent).toBe("Last appointment: 3pm");
  expect(parseFloat(shading.style.top) + parseFloat(shading.style.height)).toBeLessThanOrEqual(parseFloat(patient.style.top));
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

test("confirmed settings resize events and keep named conflicts in a review popup", async () => {
  const schedule = calendarPreviewFixture();
  const date = "2099-10-12";
  schedule.blocks[0].slot_date = date;
  schedule.blocks[0].slot_start = "13:00"; schedule.blocks[0].slot_end = "14:00";
  schedule.appointments = ["09:00", "09:30"].map((time, i) => ({ id: String(i), patient_name: `Patient ${i}`, appointment_date: date, appointment_time: time, consultation_duration_minutes: 30 }));
  function Harness() {
    const [current, setCurrent] = useState(schedule);
    return h(ClinicAvailabilityCalendar, { schedule: current, initialDate: date, onSave: async command => { const next = applyScheduleCommand(current, command); setCurrent(next); return next; } });
  }
  await act(async () => root.render(h(Harness)));
  await click(host.querySelector<HTMLButtonElement>('.availability-settings-summary')!);
  await click(button("Save settings"));
  expect(host.querySelector('.availability-booked')?.textContent).toContain("9am–9:30am");
  await click(button("Yes, update all appointments"));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelector('.availability-booked')?.textContent).toContain("9am–10:30am");
  expect(host.querySelector('.availability-warning')?.textContent).toContain("appointments need attention");
  expect(host.querySelector('.availability-warning')?.textContent).not.toContain("Patient 0");
  await click(button("Review patients"));
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Patient 0");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Patient 1");
  await click(button("Done"));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const booked = host.querySelectorAll<HTMLElement>('.availability-booked');
  expect(booked[0].style.left).not.toBe(booked[1].style.left);
  expect(booked[0].style.width).toBe(booked[1].style.width);
});

function dragGeometry() {
  const rect = (left: number, width: number) => ({ left, right: left + width, top: 0, bottom: 960, width, height: 960, x: left, y: 0, toJSON: () => ({}) });
  host.querySelector<HTMLElement>('.availability-week-scroll')!.getBoundingClientRect = () => rect(0, 1476);
  host.querySelector<HTMLElement>('.availability-axis')!.getBoundingClientRect = () => rect(0, 76);
  host.querySelectorAll<HTMLElement>('.availability-day').forEach((day, index) => { day.getBoundingClientRect = () => rect(76 + index * 200, 200); });
  const block = host.querySelector<HTMLElement>('.availability-blocked')!;
  block.setPointerCapture = () => {}; block.hasPointerCapture = () => false;
  return block;
}
async function dragEvent(element: HTMLElement, type: string, x: number, y: number) {
  await act(async () => { element.dispatchEvent(new window.PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: "mouse", button: 0, clientX: x, clientY: y })); });
}
test("a normal click still opens the block editor after pointer capture", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12";
  await render(schedule, async () => { throw new Error("A click must not save"); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('.availability-block-body')!, 'pointerdown', 176, 312);
  await dragEvent(block, 'pointerup', 176, 312);
  // Browsers retarget the click to the element that captured the pointer.
  await click(block);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Unblock this time");
  expect(document.querySelector<HTMLInputElement>('[role="dialog"] input[type="date"]')?.value).toBe("2099-10-12");
});
test("dragging a block saves one atomic move without opening the editor", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  const commands: ScheduleCommand[] = [];
  await render(schedule, async command => { commands.push(command); return applyScheduleCommand(schedule, command); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('.availability-block-body')!, 'pointerdown', 176, 312);
  await dragEvent(block, 'pointermove', 376, 456);
  expect(host.querySelector('.availability-drag-feedback')?.textContent).toContain('12:00pm–1:30pm');
  expect(commands).toHaveLength(0);
  await dragEvent(block, 'pointerup', 376, 456);
  expect(commands).toEqual([{ action: "block", id: schedule.blocks[0].id, source_date: "2099-10-12", scope: "date", dates: ["2099-10-13"], start: "12:00", end: "13:30" }]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test("resize failure preserves the block; Escape and pointer cancellation never save", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  let attempts = 0;
  await render(schedule, async () => { attempts++; throw new Error("Connection interrupted"); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('[data-resize="end"]')!, 'pointerdown', 176, 379);
  await dragEvent(block, 'pointermove', 176, 427);
  expect(host.querySelector('.availability-drag-feedback')?.textContent).toContain('10:30am–12:30pm');
  await dragEvent(block, 'pointerup', 176, 427);
  expect(attempts).toBe(1);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection interrupted');
  expect(host.querySelector('.availability-block-body')?.textContent).toContain('10:30am–12:00pm');
  for (const cancel of ['escape', 'pointercancel']) {
    await dragEvent(block.querySelector<HTMLElement>('.availability-block-body')!, 'pointerdown', 176, 312);
    await dragEvent(block, 'pointermove', 376, 312);
    if (cancel === 'escape') await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); });
    else await dragEvent(block, 'pointercancel', 376, 312);
    await dragEvent(block, 'pointerup', 376, 312);
    expect(host.querySelector('.availability-block-preview')).toBeNull();
    expect(attempts).toBe(1);
  }
});
