import { afterAll, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";

// Run this file separately: every production data boundary fails closed.
const external: string[] = [];
const forbidden = (name: string) => () => { external.push(name); throw new Error(`Demo touched ${name}`); };
mock.module("@/integrations/supabase/client", () => ({ supabase: new Proxy({}, { get: (_, key) => forbidden(`supabase.${String(key)}`)() }) }));
mock.module("@/utils/clinic-outcome.functions", () => Object.fromEntries(["checkOutcomeFree", "recordClinicNoShow", "resetClinicOutcome", "markDepositRefundedManually"].map(name => [name, forbidden(name)])));
mock.module("@/utils/consult-outcome.functions", () => Object.fromEntries(["disqualifyAppointment", "resolveAppointmentDeposit", "processConsultOutcome"].map(name => [name, forbidden(name)])));
mock.module("@/utils/chase.functions", () => ({ requestChase: forbidden("requestChase") }));
mock.module("./ConnectedScheduleSlotPicker", () => ({ ConnectedScheduleSlotPicker: forbidden("ConnectedScheduleSlotPicker") }));
mock.module("./ClinicAvailabilityPanel", () => ({ ClinicAvailabilityPanel: forbidden("ClinicAvailabilityPanel") }));

const browser = new Window({ url: "http://localhost/demo-clinic" });
const environment = {
  window: browser, document: browser.document, navigator: browser.navigator,
  HTMLElement: browser.HTMLElement, HTMLInputElement: browser.HTMLInputElement, Element: browser.Element, Node: browser.Node,
  NodeFilter: browser.NodeFilter, MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver, CustomEvent: browser.CustomEvent,
  getComputedStyle: browser.getComputedStyle.bind(browser), requestAnimationFrame: browser.requestAnimationFrame.bind(browser), cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
};
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const { DemoClinicPortal } = await import("./DemoClinicPortal");
const { DemoAuthProvider } = await import("@/hooks/useAuth");
const host = document.createElement("div"); document.body.append(host);
const root = createRoot(host);
afterAll(async () => { await act(async () => root.unmount()); browser.happyDOM.abort(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } });
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.trim() === text)!;
const click = async (element: HTMLElement) => { expect(element).toBeTruthy(); await act(async () => element.click()); };
const fill = async (input: HTMLTextAreaElement, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new window.Event("input", { bubbles: true })); }); };
const openPatient = async (name: string) => {
  const target = [...document.querySelectorAll<HTMLElement>("td,div,span")].find(e => e.textContent === name && e.children.length === 0)!;
  await click(target);
};

test("demo clinic workflows never read or write production", async () => {
  await act(async () => root.render(h(DemoAuthProvider, null, h(DemoClinicPortal, { partnerView: true }))));
  expect(document.body.textContent).toContain("Demo Clinic");
  expect(document.querySelector('a[href="/settings#partner-view"]')?.textContent).toBe("Back to Settings");
  expect(document.body.textContent).toContain("Alex Morgan");
  await click(button("All packs"));
  expect(document.body.textContent).toContain("Training example");
  await click(button("How credits work"));
  await openPatient("Alex Morgan");
  expect(document.querySelectorAll('a[href^="mailto:"],a[href^="tel:"]')).toHaveLength(0);
  await fill(document.querySelector('textarea[placeholder="Add a clinic note…"]')!, "A fictional training note");
  await click(button("Add note"));
  expect(document.body.textContent).toContain("A fictional training note");
  await click(button("🔔 Ask Bold to chase"));
  await click(button("Send to GoBold"));
  expect(document.body.textContent).toContain("Requested");
  await click(button("📅 Reschedule"));
  const slot = document.querySelector<HTMLSelectElement>('select[aria-label="Time slot"]')!;
  await act(async () => { slot.value = "09:30"; slot.dispatchEvent(new window.Event("change", { bubbles: true })); });
  await click(button("Save new date"));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await openPatient("Alex Morgan");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("9:30am");
  await click(button("✅ They showed up"));
  await click(button("Save demo outcome"));
  await openPatient("Jamie Carter");
  await click(button("❌ No show"));
  await click(button("No shows (2)"));
  await openPatient("Jamie Carter");
  await click(button("Reset outcome"));
  await click(button("Close"));
  await click(button("Availability"));
  expect(document.querySelector(".availability-calendar")).toBeTruthy();
  await click(button("Settings"));
  expect(document.body.textContent).toContain("Weekly operating hours");
  await click(button("Save settings"));
  await click(button("Calendar history"));
  expect(document.body.textContent).toContain("Rescheduled from 10am to 9:30am");
  await act(async () => { document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
  await click(button("Reset demo"));
  await openPatient("Alex Morgan");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("10:00am");
  expect(document.body.textContent).not.toContain("A fictional training note");
  expect(external).toEqual([]);
});
