import { afterAll, expect, mock, test } from "bun:test";
import { EventEmitter } from "node:events";
import { Window } from "happy-dom";
import { act, createElement as h } from "react";

const browser = new Window({ url: "https://portal.example/sales-call" });
const env = { window: browser, document: browser.document, navigator: browser.navigator, CustomEvent: browser.CustomEvent, IS_REACT_ACT_ENVIRONMENT: true };
const previous = new Map(Object.keys(env).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
for (const [k, value] of Object.entries(env)) Object.defineProperty(globalThis, k, { configurable: true, writable: true, value });
class FakeCall extends EventEmitter {
  parameters = { From: "+61400000000", CallSid: "CAtest" };
  disconnect = mock(() => { this.emit("disconnect"); });
  reject = mock(() => { this.emit("reject"); });
  accept = mock(() => { this.emit("accept", this); });
}
let device: FakeDevice;
let resolveConnect: (c: FakeCall) => void;
class FakeDevice extends EventEmitter {
  state = "registered";
  audio = { incoming: mock(() => {}), availableInputDevices: new Map(), setAudioConstraints: async () => {} };
  constructor() { super(); device = this; }
  register = async () => { this.emit("registered"); };
  connect = () => new Promise<FakeCall>(r => { resolveConnect = r; });
}
mock.module("@twilio/voice-sdk", () => ({ Device: FakeDevice }));
mock.module("@/utils/log-frontend-error", () => ({ logFrontendError: async () => {}, extractErrorMessage: (_: unknown, fallback: string) => fallback }));
mock.module("@/utils/ringback", () => ({ startRingback: () => {}, stopRingback: () => {} }));
const channel = { on() { return this; }, subscribe() { return this; } };
mock.module("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { access_token: "test" } } }) },
  functions: { invoke: async () => ({ data: { token: "test", identity: "rep_test", incomingAllowed: true } }) },
  channel: () => channel, removeChannel: async () => {},
  from: () => ({ upsert: async () => ({}), update: () => ({ eq: async () => ({}) }) }),
} }));
const { createRoot } = await import("react-dom/client");
const { useTwilioDevice } = await import("./useTwilioDevice");
const host = document.createElement("div");
const root = createRoot(host);
let voice: ReturnType<typeof useTwilioDevice>;
function Harness() { voice = useTwilioDevice(true); return null; }
afterAll(async () => {
  await act(async () => root.unmount());
  await browser.happyDOM.abort();
  for (const [k, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, k, descriptor);
    else Reflect.deleteProperty(globalThis, k);
  }
});
test("free rep rings; busy rep rejects only the new leg and preserves current audio", async () => {
  await act(async () => root.render(h(Harness)));
  expect(voice.status).toBe("ready");
  const incoming = new FakeCall();
  await act(async () => { device.emit("incoming", incoming); });
  expect(voice.status).toBe("ringing-incoming");
  expect(voice.incomingFrom).toBe(incoming.parameters.From);
  const simultaneous = new FakeCall();
  await act(async () => { device.emit("incoming", simultaneous); });
  expect(simultaneous.reject).toHaveBeenCalledTimes(1);
  expect(voice.status).toBe("ringing-incoming");
  await act(async () => voice.answer());
  expect(voice.status).toBe("in-call");
  const callInstance = voice.activeCallInstanceId;
  const callback = new FakeCall();
  await act(async () => { device.emit("incoming", callback); });
  expect(callback.reject).toHaveBeenCalledTimes(1);
  expect(incoming.disconnect).not.toHaveBeenCalled();
  expect(voice.status).toBe("in-call");
  expect(voice.activeCallInstanceId).toBe(callInstance);
  expect(voice.incomingFrom).toBeNull();
  await act(async () => voice.hangup());
  expect(voice.status).toBe("ready");
});
test("callback during outbound setup cannot interrupt or replace that call", async () => {
  let dial: Promise<void>;
  await act(async () => { dial = voice.call("0412000001", { leadId: "test-lead", repId: "nina" }); });
  expect(voice.status).toBe("connecting");
  const callback = new FakeCall();
  await act(async () => { device.emit("incoming", callback); });
  expect(callback.reject).toHaveBeenCalledTimes(1);
  expect(voice.status).toBe("connecting");
  expect(voice.activeLeadId).toBe("test-lead");
  const outgoing = new FakeCall();
  await act(async () => { resolveConnect(outgoing); await dial!; outgoing.emit("accept", outgoing); });
  expect(voice.status).toBe("in-call");
  expect(outgoing.disconnect).not.toHaveBeenCalled();
  await act(async () => voice.hangup());
});
