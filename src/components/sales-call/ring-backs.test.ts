import { expect, test } from "bun:test";
import { ringBackAction } from "./ring-backs";

const callback = { id: "call", rep_id: "nina", direction: "inbound", lead_id: "lead", status: "busy" };
test("busy callback queues only for the rep who called", () => {
  expect(ringBackAction(callback, "nina")).toBe("queue");
  expect(ringBackAction(callback, "peter")).toBeNull();
  expect(ringBackAction({ ...callback, rep_id: null }, "nina")).toBeNull();
  expect(ringBackAction({ ...callback, direction: "outbound" }, "nina")).toBeNull();
  expect(ringBackAction({ ...callback, clinic_id: "clinic" }, "nina")).toBeNull();
});
test("ringing waits, an answered rep clears the queue, voicemail stays queued", () => {
  expect(ringBackAction({ ...callback, status: "ringing" }, "nina")).toBeNull();
  expect(ringBackAction({ ...callback, status: "in-progress", voice_destination_sid: "child" }, "nina")).toBe("answered");
  expect(ringBackAction({ ...callback, status: "completed", voice_destination_sid: "child" }, "nina")).toBe("answered");
  expect(ringBackAction({ ...callback, status: "completed", voice_destination_sid: null }, "nina")).toBe("queue");
  for (const status of ["no-answer", "failed", "canceled"]) {
    expect(ringBackAction({ ...callback, status, voice_destination_sid: "child" }, "nina")).toBe("queue");
  }
});
