import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import type { PartnerViewClinic } from "@/lib/partner-view";
import { DEMO_CLINIC_ID } from "@/lib/demo-clinic";

const navigate = mock(() => {});
let load: () => Promise<PartnerViewClinic[]>;
mock.module("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
mock.module("@/lib/partner-view.functions", () => ({ listPartnerViewClinics: () => load() }));
const browser = new Window({ url: "https://portal.example/settings" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, HTMLElement: browser.HTMLElement, Element: browser.Element, Node: browser.Node, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const { PartnerViewSection } = await import("./PartnerViewSection");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => { navigate.mockClear(); load = async () => []; browser.location.href = "https://portal.example/settings"; host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
afterAll(() => { browser.happyDOM.abort(); for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } });
const render = async () => { await act(async () => root.render(h(PartnerViewSection))); };
const selectAndSubmit = async (value: string) => {
  await act(async () => { const select = document.querySelector("select")!; select.value = value; select.dispatchEvent(new window.Event("change", { bubbles: true })); });
  await act(async () => { document.querySelector("form")!.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
};
test("Demo Clinic is selectable with no database clinic rows and leaves live providers behind", async () => {
  await render();
  expect(document.querySelector(`option[value="${DEMO_CLINIC_ID}"]`)?.textContent).toBe("Demo Clinic (training)");
  await selectAndSubmit(DEMO_CLINIC_ID);
  expect(browser.location.href).toBe("https://portal.example/demo-clinic?from=partner-view");
  expect(navigate).not.toHaveBeenCalled();
});
test("real clinics keep their authorized partner route", async () => {
  const id = "9ac8fa05-c4b0-4faa-b519-f6a347956fb1";
  load = async () => [{ id, clinic_name: "Example real clinic", is_active: true }];
  await render();
  await selectAndSubmit(id);
  expect(navigate).toHaveBeenCalledWith({ to: "/clinic-portal", search: { viewClinic: id } });
  expect(browser.location.pathname).toBe("/settings");
});
test("demo remains available if the real clinic list cannot load", async () => {
  load = async () => { throw new Error("Offline"); };
  await render();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Could not load");
  await selectAndSubmit(DEMO_CLINIC_ID);
  expect(browser.location.pathname).toBe("/demo-clinic");
  expect(navigate).not.toHaveBeenCalled();
});
test("demo is available while live clinics are still loading", async () => {
  load = () => new Promise(() => {});
  await render();
  expect(document.querySelector('[role="status"]')?.textContent).toContain("Loading");
  expect(document.querySelector(`option[value="${DEMO_CLINIC_ID}"]`)).not.toBeNull();
});
