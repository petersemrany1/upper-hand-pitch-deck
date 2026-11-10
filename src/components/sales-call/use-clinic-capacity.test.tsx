import { afterAll, afterEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { useClinicCapacity } from "./use-clinic-capacity";
import { ClinicCapacityNotice } from "./ClinicCapacityNotice";

const browser = new Window({ url: "http://localhost" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const host = document.createElement("div"); document.body.append(host);
let root: ReturnType<typeof createRoot>;
afterEach(async () => { if (root) await act(async () => root.unmount()); });
afterAll(() => { for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } browser.happyDOM.abort(); });

test("booking event pauses immediately, shows failed refresh, writes diagnostic, and Retry restores zero-credit queue", async () => {
  const reads: { resolve: (v: Record<string, number>) => void; reject: (e: Error) => void }[] = [];
  const logs: unknown[] = [], listeners: { table: string; callback: (payload: unknown) => void }[] = [];
  let removed = false;
  const db = createClient<Database>("https://capacity.example.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (async (input, init) => {
      if (String(input).includes("error_logs")) logs.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(String(input).includes("partner_clinics") ? [{ id: "boss", city: "Perth" }] : []), { headers: { "Content-Type": "application/json" } });
    }) as typeof fetch },
  });
  const channel = { on: (_event: string, filter: { table: string }, callback: (payload: unknown) => void) => { listeners.push({ table: filter.table, callback }); return channel; }, subscribe: () => channel };
  db.channel = (() => channel) as unknown as typeof db.channel;
  db.removeChannel = (async () => { removed = true; return "ok"; }) as typeof db.removeChannel;
  const fetchRemaining = () => new Promise<Record<string, number>>((resolve, reject) => reads.push({ resolve, reject }));
  let current!: ReturnType<typeof useClinicCapacity>;
  function Harness() {
    current = useClinicCapacity(db, fetchRemaining);
    return h("div", null, h(ClinicCapacityNotice, { status: current.status, retry: current.retry }),
      h("button", { disabled: !current.readyRef.current }, "Next call"), h("p", null, current.capacity.available.join(",")));
  }
  root = createRoot(host);
  await act(async () => root.render(h(Harness)));
  expect(host.textContent).toContain("Checking clinic availability");
  await act(async () => { reads.shift()!.resolve({ boss: 1 }); });
  expect(host.textContent).toContain("perth"); expect(host.querySelector("button")!.disabled).toBe(false);
  await act(async () => {
    browser.dispatchEvent(new browser.CustomEvent("clinic-capacity-changed", { detail: { clinicId: "boss" } }));
    expect(current.readyRef.current).toBe(false); // Same-tick protection, before React commits.
  });
  expect(host.textContent).not.toContain("perth");
  await act(async () => { reads.shift()!.reject(new Error("temporary offline")); });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("New calls are paused");
  expect(logs).toHaveLength(1);
  await act(async () => { (host.querySelector('[role="alert"] button') as HTMLButtonElement).click(); });
  await act(async () => { reads.shift()!.resolve({ boss: 0 }); });
  expect(host.querySelector('[role="alert"]')).toBeNull(); expect(current.readyRef.current).toBe(true);
  expect(host.textContent).not.toContain("perth");
  // A clinic-originated no-show follows the same path and brings Perth back.
  await act(async () => { listeners.find(l => l.table === "clinic_appointments")!.callback({ new: { clinic_id: "boss", outcome: "noshow" }, old: {} }); });
  await act(async () => { reads.shift()!.resolve({ boss: 1 }); });
  expect(host.textContent).toContain("perth");
  await act(async () => root.unmount()); expect(removed).toBe(true);
});
