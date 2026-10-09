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
test("shading leaves the last valid start clear before blocked time and closing", async () => {
  const schedule = calendarPreviewFixture();
  const date = schedule.blocks[0].slot_date!;
  schedule.consultation_minutes = 60; schedule.buffer_minutes = 0;
  schedule.appointments = []; schedule.overrides = [];
  schedule.blocks = [{ ...schedule.blocks[0], slot_start: "10:30", slot_end: "12:00" }];
  schedule.trading = schedule.trading.map(h => ({ ...h, is_closed: false, open_time: "09:00", close_time: "16:00", consult_duration_mins: 15 }));
  await render(schedule, async () => schedule);
  const day = host.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
  const beforeBlock = day.querySelector<HTMLElement>('.availability-before-block:not(.availability-closing-buffer)')!;
  const closing = day.querySelector<HTMLElement>('.availability-closing-buffer')!;
  const lastBeforeBlock = day.querySelector<HTMLElement>('.availability-empty[data-minute="570"]')!;
  const lastBeforeClose = day.querySelector<HTMLElement>('.availability-empty[data-minute="900"]')!;
  expect(beforeBlock.textContent).toBe("Would overlap blocked time");
  expect(parseFloat(beforeBlock.style.top)).toBe(parseFloat(lastBeforeBlock.style.top) + parseFloat(lastBeforeBlock.style.height) / 2);
  expect(parseFloat(closing.style.top)).toBe(parseFloat(lastBeforeClose.style.top) + parseFloat(lastBeforeClose.style.height) / 2);
  expect(closing.textContent).toBe("Last appointment: 3pm");
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
  expect(shading.getAttribute("aria-label")).toBe("Last appointment: 3pm");
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
test("a fast resize uses release coordinates even without an intermediate movement event", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  const commands: ScheduleCommand[] = [];
  await render(schedule, async command => { commands.push(command); return applyScheduleCommand(schedule, command); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('[data-resize="end"]')!, 'pointerdown', 176, 379);
  await dragEvent(block, 'pointerup', 176, 427);
  expect(commands).toEqual([{ action: "block", id: schedule.blocks[0].id, source_date: "2099-10-12", scope: "date", dates: ["2099-10-12"], start: "10:30", end: "12:30" }]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test("a quick empty-time selection also includes the final release position", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  await render(schedule, async () => schedule);
  dragGeometry();
  const day = host.querySelector<HTMLElement>('[data-date="2099-10-12"]')!;
  day.setPointerCapture = () => {}; day.hasPointerCapture = () => false;
  const slot = day.querySelector<HTMLElement>('.availability-empty[data-minute="540"]')!;
  await dragEvent(slot, 'pointerdown', 176, 0);
  await dragEvent(day, 'pointerup', 176, 96);
  expect([...document.querySelectorAll<HTMLInputElement>('[role="dialog"] input[type="time"]')].map(el => el.value)).toEqual(['09:00', '10:00']);
});
test("both resize edges use the final release, even beyond the last movement event", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  const commands: ScheduleCommand[] = [];
  await render(schedule, async command => { commands.push(command); return applyScheduleCommand(schedule, command); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('[data-resize="start"]')!, 'pointerdown', 176, 144);
  await dragEvent(block, 'pointermove', 176, 120);
  await dragEvent(block, 'pointerup', 176, 96);
  expect(commands).toEqual([{ action: "block", id: schedule.blocks[0].id, source_date: "2099-10-12", scope: "date", dates: ["2099-10-12"], start: "10:00", end: "12:00" }]);
});
test("a fast move changes day without needing an intermediate movement event", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  const commands: ScheduleCommand[] = [];
  await render(schedule, async command => { commands.push(command); return applyScheduleCommand(schedule, command); });
  const block = dragGeometry();
  await dragEvent(block.querySelector<HTMLElement>('.availability-block-body')!, 'pointerdown', 176, 180);
  await dragEvent(block, 'pointerup', 376, 228);
  expect(commands).toEqual([{ action: "block", id: schedule.blocks[0].id, source_date: "2099-10-12", scope: "date", dates: ["2099-10-13"], start: "11:00", end: "12:30" }]);
});
test("rapid follow-up drags cannot overwrite an in-flight save", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  let finish!: (value: ClinicSchedule) => void;
  const commands: ScheduleCommand[] = [];
  await render(schedule, command => { commands.push(command); return new Promise(resolve => { finish = resolve; }); });
  const block = dragGeometry(), handle = block.querySelector<HTMLElement>('[data-resize="end"]')!;
  // Same task: the second gesture arrives before React can disable the controls.
  await act(async () => {
    for (const [type, y] of [['pointerdown', 280], ['pointerup', 328], ['pointerdown', 328], ['pointerup', 376]] as const) {
      (type === 'pointerdown' ? handle : block).dispatchEvent(new window.PointerEvent(type, { bubbles: true, pointerId: 7, button: 0, clientX: 176, clientY: y }));
    }
  });
  expect(commands).toHaveLength(1);
  expect(host.querySelector('.availability-drag-feedback')?.textContent).toContain('Saving');
  expect(host.querySelector('.availability-block-preview')).not.toBeNull();
  await act(async () => finish(applyScheduleCommand(schedule, commands[0])));
  expect(host.querySelector('.availability-block-preview')).toBeNull();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test("edge dragging scrolls only the calendar and stops immediately on release", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12"; schedule.appointments = [];
  await render(schedule, async command => applyScheduleCommand(schedule, command));
  const block = dragGeometry(), grid = host.querySelector<HTMLElement>('.availability-week-scroll')!;
  host.style.overflowY = 'auto';
  Object.defineProperties(host, { scrollHeight: { value: 1500 }, clientHeight: { value: 700 } });
  Object.defineProperties(grid, { scrollHeight: { value: 960 }, clientHeight: { value: 960, configurable: true } });
  const oldRequest = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  const frames = new Map<number, FrameRequestCallback>(); let sequence = 0;
  globalThis.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
  globalThis.cancelAnimationFrame = id => { frames.delete(id); };
  const tick = async () => { const pending = [...frames.values()]; frames.clear(); await act(async () => pending.forEach(callback => callback(0))); };
  try {
    await dragEvent(block.querySelector<HTMLElement>('[data-resize="end"]')!, 'pointerdown', 176, 700);
    await dragEvent(block, 'pointermove', 176, window.innerHeight - 5);
    await tick();
    expect(host.scrollTop).toBe(0); expect(grid.scrollTop).toBe(0); expect(frames.size).toBe(0);
    Object.defineProperty(grid, 'clientHeight', { value: 400 });
    await dragEvent(block, 'pointermove', 176, window.innerHeight - 4);
    await tick();
    expect(host.scrollTop).toBe(0); expect(grid.scrollTop).toBeGreaterThan(0); expect(frames.size).toBe(1);
    await dragEvent(block, 'pointerup', 176, window.innerHeight - 4);
    expect(frames.size).toBe(0);
  } finally { globalThis.requestAnimationFrame = oldRequest; globalThis.cancelAnimationFrame = oldCancel; }
});
test("grabbing a block prevents browser focus scrolling", async () => {
  const schedule = calendarPreviewFixture(); schedule.blocks[0].slot_date = "2099-10-12";
  await render(schedule, async () => schedule);
  const block = dragGeometry();
  const event = new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7, button: 0, clientX: 176, clientY: 379 });
  await act(async () => block.querySelector<HTMLElement>('[data-resize="end"]')!.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
});
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
  for (const cancel of ['escape', 'pointercancel', 'blur']) {
    await dragEvent(block.querySelector<HTMLElement>('.availability-block-body')!, 'pointerdown', 176, 312);
    await dragEvent(block, 'pointermove', 376, 312);
    if (cancel === 'escape') await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); });
    else if (cancel === 'blur') await act(async () => { window.dispatchEvent(new window.Event('blur')); });
    else await dragEvent(block, 'pointercancel', 376, 312);
    await dragEvent(block, 'pointerup', 376, 312);
    expect(host.querySelector('.availability-block-preview')).toBeNull();
    expect(attempts).toBe(1);
  }
});


test("history opens above Settings, displays evidence and makes no calendar writes", async () => {
  const schedule = calendarPreviewFixture(); let saves = 0;
  const loadHistory = async () => ({ started_at: "2026-10-10T00:00:00Z", entries: [{ id: "1", entity_id: "block", entity_type: "block" as const, operation: "changed" as const, recorded_at: "2026-10-10T00:15:02Z", actor_name: "Clinic account", actor_role: "clinic", before_data: { slot_date: "2026-10-30", slot_start: "11:30", slot_end: "12:00" }, after_data: { slot_date: "2026-10-30", slot_start: "12:00", slot_end: "13:00" } }] });
  await act(async () => root.render(h(ClinicAvailabilityCalendar, { schedule, onSave: async () => { saves++; return schedule; }, loadHistory })));
  const trigger = button("Calendar history");
  expect(trigger.compareDocumentPosition(host.querySelector('.availability-settings-summary')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await click(trigger);
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("11:15:02 am");
  expect(dialog.textContent).toContain("11:30am–12:00pm");
  expect(dialog.textContent).toContain("Before");
  expect(dialog.textContent).toContain("After");
  expect(dialog.textContent).toContain("12:00pm–1:00pm");
  expect(dialog.textContent).toContain("Earlier edits aren’t available");
  expect(saves).toBe(0);
  await click(document.querySelector<HTMLButtonElement>('[aria-label="Close calendar history"]')!);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

test("history errors remain retryable rather than looking like an empty log", async () => {
  const schedule = calendarPreviewFixture(); let calls = 0;
  const loadHistory = async () => { calls++; if (calls === 1) throw new Error("offline"); return { started_at: "2026-10-10T00:00:00Z", entries: [] }; };
  await act(async () => root.render(h(ClinicAvailabilityCalendar, { schedule, onSave: async () => schedule, loadHistory })));
  await click(button("Calendar history"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Could not load");
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain("No recorded changes");
  await click(button("Retry"));
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("No recorded changes yet");
  expect(calls).toBe(2);
});

test("loading older history uses the last displayed event as its cursor", async () => {
  const schedule = calendarPreviewFixture(); const requests: unknown[] = [];
  const entries = Array.from({length: 51}, (_, index) => ({ id: String(100-index), entity_id: "block", entity_type: "block" as const, operation: "added" as const, recorded_at: "2026-10-10T00:00:00Z", actor_name: "Admin", actor_role: "admin", before_data: null, after_data: { slot_date: "2026-10-30", slot_start: "11:30", slot_end: "12:00" } }));
  const loadHistory = async (options: { before?: string; date?: string }) => { requests.push(options); return { started_at: "2026-10-10T00:00:00Z", entries: options.before ? entries.slice(50) : entries }; };
  await act(async () => root.render(h(ClinicAvailabilityCalendar, { schedule, onSave: async () => schedule, loadHistory })));
  await click(button("Calendar history"));
  expect(document.querySelectorAll('.availability-history-list li')).toHaveLength(50);
  await click(button("Load older entries"));
  expect(requests[1]).toEqual({ before: "51", date: undefined });
  expect(document.querySelectorAll('.availability-history-list li')).toHaveLength(51);
});
