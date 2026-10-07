import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import { useQuietRefresh } from "./useQuietRefresh";

const browser = new Window({ url: "http://localhost" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

type Result = { total: number };
type Props = { queryKey: string; load: () => Promise<Result>; refreshKey?: number; enabled?: boolean };
function View(props: Props) {
  const { data, loading, error, reload } = useQuietRefresh(props);
  return h("section", null,
    h("button", { onClick: reload }, "Retry"),
    error && h("p", { role: "status" }, error.message),
    loading ? h("p", { "data-loading": true }, "Loading") : data && h("article", null,
      h("output", null, data.total),
      h("textarea", { defaultValue: "" }),
      h("input", { type: "date", defaultValue: "2026-10-20" }),
      h("div", { "data-scroll": true, style: { overflow: "auto", height: 40 } }, "Appointments"),
    ),
  );
}
function deferred() {
  let resolve!: (value: Result) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Result>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function render(props: Props) { await act(async () => { root.render(h(View, props)); }); }
const displayedTotal = () => host.querySelector("output")?.textContent;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
afterAll(() => {
  browser.happyDOM.abort();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

describe("quiet background refresh", () => {
  test("shows a loader only until the first successful result", async () => {
    const request = deferred();
    await render({ queryKey: "clinic-a", load: () => request.promise });
    expect(host.querySelector("[data-loading]")).not.toBeNull();
    await act(async () => request.resolve({ total: 12 }));
    expect(displayedTotal()).toBe("12");
    expect(host.querySelector("[data-loading]")).toBeNull();
  });

  test("preserves mounted content, drafts, date, focus and scroll during and after an update", async () => {
    const request = deferred();
    let attempt = 0;
    const load = () => ++attempt === 1 ? Promise.resolve({ total: 12 }) : request.promise;
    await render({ queryKey: "clinic-a", load });
    const article = host.querySelector("article");
    const notes = host.querySelector("textarea")!;
    const date = host.querySelector("input")!;
    const scroller = host.querySelector<HTMLElement>("[data-scroll]")!;
    notes.value = "Unfinished clinic notes";
    date.value = "2026-11-12";
    scroller.scrollTop = 220;
    notes.focus();
    await render({ queryKey: "clinic-a", load, refreshKey: 1 });
    expect(displayedTotal()).toBe("12");
    expect(host.querySelector("[data-loading]")).toBeNull();
    expect(host.querySelector("article")).toBe(article);
    await act(async () => request.resolve({ total: 13 }));
    expect(displayedTotal()).toBe("13");
    expect(host.querySelector("article")).toBe(article);
    expect(notes.value).toBe("Unfinished clinic notes");
    expect(date.value).toBe("2026-11-12");
    expect(scroller.scrollTop).toBe(220);
    expect(document.activeElement).toBe(notes);
  });

  test("keeps the last result after a failed refresh and recovers using Retry", async () => {
    let attempt = 0;
    const load = () => ++attempt === 2 ? Promise.reject(new Error("Connection interrupted")) : Promise.resolve({ total: attempt });
    await render({ queryKey: "report", load });
    const article = host.querySelector("article");
    await render({ queryKey: "report", load, refreshKey: 1 });
    expect(displayedTotal()).toBe("1");
    expect(host.querySelector("article")).toBe(article);
    expect(host.querySelector("[role=status]")?.textContent).toBe("Connection interrupted");
    await act(async () => { host.querySelector("button")!.click(); });
    expect(displayedTotal()).toBe("3");
    expect(host.querySelector("[role=status]")).toBeNull();
  });

  test("does not expose another clinic's data while a new clinic is loading", async () => {
    await render({ queryKey: "clinic-a", load: async () => ({ total: 12 }) });
    const request = deferred();
    await render({ queryKey: "clinic-b", load: () => request.promise });
    expect(displayedTotal()).toBeUndefined();
    expect(host.querySelector("[data-loading]")).not.toBeNull();
    await act(async () => request.resolve({ total: 27 }));
    expect(displayedTotal()).toBe("27");
  });

  test("ignores a slow old response after the report filters change", async () => {
    const old = deferred();
    const current = deferred();
    await render({ queryKey: "report-month", load: () => old.promise });
    await render({ queryKey: "report-week", load: () => current.promise });
    await act(async () => current.resolve({ total: 7 }));
    await act(async () => old.resolve({ total: 30 }));
    expect(displayedTotal()).toBe("7");
  });

  test("an older refresh cannot overwrite the most recent update", async () => {
    const old = deferred();
    const current = deferred();
    let attempt = 0;
    const load = () => [Promise.resolve({ total: 1 }), old.promise, current.promise][attempt++];
    await render({ queryKey: "clinic-a", load });
    await render({ queryKey: "clinic-a", load, refreshKey: 1 });
    await render({ queryKey: "clinic-a", load, refreshKey: 2 });
    await act(async () => current.resolve({ total: 3 }));
    await act(async () => old.reject(new Error("Old request failed")));
    expect(displayedTotal()).toBe("3");
    expect(host.querySelector("[role=status]")).toBeNull();
  });

  test("removes protected data and ignores an outstanding request when disabled", async () => {
    const request = deferred();
    const load = () => request.promise;
    await render({ queryKey: "user-a", load });
    await render({ queryKey: "user-a", load, enabled: false });
    await act(async () => request.resolve({ total: 12 }));
    expect(displayedTotal()).toBeUndefined();
    expect(host.querySelector("[data-loading]")).toBeNull();
  });

  test("a successful empty result also refreshes without a loading flash", async () => {
    const request = deferred();
    let attempt = 0;
    const load = () => ++attempt === 1 ? Promise.resolve({ total: 0 }) : request.promise;
    await render({ queryKey: "empty", load });
    await render({ queryKey: "empty", load, refreshKey: 1 });
    expect(displayedTotal()).toBe("0");
    expect(host.querySelector("[data-loading]")).toBeNull();
    await act(async () => request.resolve({ total: 1 }));
  });
});
