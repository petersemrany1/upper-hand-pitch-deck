import { expect, test } from "bun:test";
import { connectVoiceCall } from "./connect-voice-call";

test("cancelling during registration or a rate-limit wait never starts another call", async () => {
  let allowed = false, calls = 0;
  const check = () => { if (!allowed) throw new Error("break"); };
  const connect = async () => { calls++; throw Object.assign(new Error("busy"), {code: 31206}); };
  await expect(connectVoiceCall(connect, check, () => {})).rejects.toThrow("break");
  expect(calls).toBe(0);
  allowed = true;
  await expect(connectVoiceCall(connect, check, () => {}, async () => { allowed = false; })).rejects.toThrow("break");
  expect(calls).toBe(1);
});
test("a confirmed rate limit can recover, an ambiguous transport failure is never replayed", async () => {
  let attempts = 0;
  const result = await connectVoiceCall(async () => {
    if (++attempts === 1) throw Object.assign(new Error(), {code: 20429});
    return "call";
  }, () => {}, () => {}, async () => {});
  expect(result).toBe("call"); expect(attempts).toBe(2);
  attempts = 0;
  await expect(connectVoiceCall(async () => { attempts++; throw Object.assign(new Error("lost"), {code: 31005}); },
    () => {}, () => {}, async () => {})).rejects.toThrow("lost");
  expect(attempts).toBe(1);
});
