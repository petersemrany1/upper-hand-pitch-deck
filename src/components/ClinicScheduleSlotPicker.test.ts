import { afterAll, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h, useState, useSyncExternalStore } from "react";
import { createPreviewScheduleStore } from "@/lib/preview-schedule-store";
import { calendarPreviewFixture } from "@/lib/calendar-preview-fixture";
import { applyScheduleCommand } from "@/lib/clinic-schedule";

const browser = new Window({ url: "http://localhost" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const { ClinicScheduleSlotPicker } = await import("./ClinicScheduleSlotPicker");
afterAll(() => {
  browser.happyDOM.abort();
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
});

test("an external block updates the mounted sales picker and clears an invalid selected time without changing the date", async () => {
  const entries = new Map<string, string>();
  const storage = () => ({ getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } });
  const partner = createPreviewScheduleStore(storage), sales = createPreviewScheduleStore(storage);
  const original = calendarPreviewFixture();
  original.consultation_minutes = 60; original.buffer_minutes = 15;
  original.blocks = []; original.overrides = []; original.appointments = [];
  original.trading.forEach(day => { day.is_closed = false; day.close_time = "17:00"; });
  const schedule = await partner.seed(original); await sales.seed(original);
  function View() {
    const current = useSyncExternalStore(sales.subscribe, () => sales.get(original.clinic_id));
    const [date, setDate] = useState("2099-10-15"), [time, setTime] = useState("11:00");
    return h("div", null,
      h("output", null, time),
      h(ClinicScheduleSlotPicker, { schedule: current!, date, time, onDate: setDate, onTime: setTime }),
    );
  }
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(h(View)));
    const picker = host.querySelector<HTMLSelectElement>('select[aria-label="Time slot"]')!;
    expect(picker.value).toBe("11:00");
    await act(async () => {
      await partner.update(schedule.clinic_id, current => applyScheduleCommand(current, { action: "block", dates: ["2099-10-15"], start: "10:30", end: "13:45" }), schedule.version);
      sales.refresh(); // The browser's storage event calls this in the receiving tab.
    });
    expect(host.querySelector("select")).toBe(picker);
    expect(picker.value).toBe("");
    expect(host.querySelector("output")?.textContent).toBe("");
    expect([...picker.options].map(option => option.value)).toEqual(["", "09:00", "09:15", "09:30", "13:45", "14:00", "14:15", "14:30", "14:45", "15:00", "15:15", "15:30", "15:45", "16:00"]);
    expect(host.querySelector('[aria-label="Choose booking date"]')?.textContent).toContain("15 Oct");
  } finally {
    await act(async () => root.unmount());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); });
    host.remove();
  }
});
