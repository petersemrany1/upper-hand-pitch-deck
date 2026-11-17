import { expect, test } from "bun:test";
import { recoverVoiceRegistration } from "./voice-registration";

test("registration recovers after a restart, coalesces wakes, and stops after unmount", async () => {
  const timers: (() => void)[] = [];
  let resolve!: (ok: boolean) => void, calls = 0, visible = true;
  const reg = recoverVoiceRegistration(async () => {
    calls++; return new Promise<boolean>(r => { resolve = r; });
  }, () => visible,
  ((cb: () => void) => { timers.push(cb); return 1; }) as typeof setTimeout, (()=>{}) as typeof clearTimeout);
  reg.wake(); reg.wake(); expect(calls).toBe(1);
  resolve(false); await new Promise(r=>setTimeout(r,0));
  expect(timers).toHaveLength(1); visible = false; timers.shift()!(); expect(calls).toBe(1);
  visible = true; reg.wake(); expect(calls).toBe(2); resolve(true); await new Promise(r=>setTimeout(r,0));
  expect(timers).toHaveLength(0); reg.stop(); reg.wake(); expect(calls).toBe(2);
});
