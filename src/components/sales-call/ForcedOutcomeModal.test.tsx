import { afterAll, afterEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";
import { ForcedOutcomeModal } from "./ForcedOutcomeModal";
import type { ComponentProps } from "react";

const browser = new Window({ url: "http://localhost" });
const environment = { window: browser, document: browser.document, navigator: browser.navigator, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(environment).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
const { createRoot } = await import("react-dom/client");
const host = document.createElement("div"); document.body.append(host);
let root: ReturnType<typeof createRoot>;
afterEach(async () => { if (root) await act(async () => root.unmount()); });
afterAll(() => { for (const [key, value] of previous) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } browser.happyDOM.abort(); });

type Props = ComponentProps<typeof ForcedOutcomeModal>;
const render = async (overrides: Partial<Props>) => {
  root = createRoot(host);
  await act(async () => root.render(h(ForcedOutcomeModal, {
    leadId: "fixture", booked: false, saveStatus: async () => ({success: true}), callDuration: 0,
    view: "menu", setView: () => {}, callbackDate: "2026-11-18", callbackTime: "10:00",
    setCallbackDate: () => {}, setCallbackTime: () => {}, busy: false, setBusy: () => {},
    onClosed: () => {}, ...overrides,
  })));
};
const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.textContent?.includes(name))!;

test("No Answer stays open on timeout; two clicks in flight submit once and a confirmed retry advances once", async () => {
  let reject!: (e: Error) => void, calls=0, closes=0, edits=0;
  await render({
    saveStatus: async ({data}) => {
      expect(data.status).toBe("no_answer");
      if (++calls === 1) await new Promise<void>((_,r) => { reject=r; });
      return {success: true};
    }, onClosed: () => { closes++; }, onLocalLeadUpdate: () => { edits++; },
  });
  await act(async () => { button("No Answer").click(); button("No Answer").click(); });
  expect(calls).toBe(1);
  await act(async () => reject(new Error("network down")));
  expect([closes,edits]).toEqual([0,0]);
  await act(async () => button("No Answer").click());
  expect([calls,closes,edits]).toEqual([2,1,1]);
});
test("callback sends its date with its status; a database rejection keeps the selected callback available", async () => {
  let tried=0, closed=0, local: unknown;
  const when = new Date("2026-11-18T10:00:00").toISOString();
  await render({ view:"callback", saveStatus: async ({data}) => {
    expect(data).toEqual({leadId:"fixture",status:"callback_scheduled",callbackAt:when});
    return ++tried===1 ? {success:false,error:"timeout"} : {success:true};
  }, onLocalLeadUpdate: (_, patch) => {local=patch;}, onClosed:()=>{closed++;} });
  await act(async () => button("Confirm Callback").click()); expect(closed).toBe(0); expect(local).toBeUndefined();
  await act(async () => button("Confirm Callback").click()); expect(closed).toBe(1);
  expect(local).toEqual({status:"callback_scheduled",callback_scheduled_at:when});
});
test("a booked lead can close the outcome without writing over the booking", async () => {
  let status: string | undefined;
  await render({booked:true,saveStatus:async()=>{throw Error("unexpected write");},onClosed:s=>{status=s;}});
  expect(button("No Answer")).toBeUndefined();
  await act(async () => button("Close").click());
  expect(status).toBe("booked_deposit_paid");
});
