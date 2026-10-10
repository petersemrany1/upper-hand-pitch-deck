import { expect, mock, test } from "bun:test";
import { recoverSessionCheck, type SessionConnection } from "./session-connection";

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function clock() {
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    schedule: (callback: () => void, delay: number) => {
      timers.set(++id, { at: now + delay, callback });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    cancel: (timer: ReturnType<typeof setTimeout>) => { timers.delete(timer as unknown as number); },
    async advance(ms: number) {
      const target = now + ms;
      while (true) {
        const entry = [...timers].filter(([,v]) => v.at <= target).sort((a,b) => a[1].at-b[1].at)[0];
        if (!entry) break;
        now = entry[1].at; timers.delete(entry[0]); entry[1].callback(); await flush();
      }
      now = target; await flush();
    },
    pending: () => timers.size,
  };
}

test("temporary failures recover the same session without changing its lead or queue", async () => {
  const time = clock(), statuses: SessionConnection[] = [];
  const local = { queue: ["lead-a", "lead-b"], index: 1, lead: "lead-b", session: "session-1" };
  let attempts = 0;
  const accept = mock((row: {id:string}) => { expect(row.id).toBe(local.session); });
  const stop = recoverSessionCheck({ ...time, check: async () => {
    if (++attempts < 3) throw Object.assign(new Error("Database timed out"), {status:504});
    return {id:"session-1"};
  }, accept, status: s => statuses.push(s), stillCurrent: () => true });
  await flush(); expect(accept).not.toHaveBeenCalled();
  await time.advance(5_000); expect(attempts).toBe(2);
  await time.advance(10_000); expect(attempts).toBe(3); expect(accept).toHaveBeenCalledTimes(1);
  expect(statuses.at(-1)).toBe("connected");
  expect(local).toEqual({queue:["lead-a","lead-b"],index:1,lead:"lead-b",session:"session-1"});
  expect(time.pending()).toBe(0); stop();
});

test("a slow request shows reconnecting but cannot overlap another check", async () => {
  const time = clock(), statuses: SessionConnection[] = [];
  let resolve!: (value: null) => void;
  const check = mock(() => new Promise<null>(r => { resolve = r; }));
  const stop = recoverSessionCheck({...time,check,accept:()=>{},status:s=>statuses.push(s),stillCurrent:()=>true,intervalMs:60_000});
  await time.advance(120_000); expect(check).toHaveBeenCalledTimes(1); expect(statuses).toEqual(["reconnecting"]);
  resolve(null); await flush(); expect(statuses.at(-1)).toBe("connected");
  await time.advance(59_999); expect(check).toHaveBeenCalledTimes(1);
  await time.advance(1); expect(check).toHaveBeenCalledTimes(2); stop(); resolve(null); await flush();
  expect(time.pending()).toBe(0);
});

test("repeated failures back off to at most one check per 30 seconds", async () => {
  const time = clock(); const check = mock(async () => { throw new Error("offline"); });
  const stop = recoverSessionCheck({...time,check,accept:()=>{},status:()=>{},stillCurrent:()=>true});
  await flush(); await time.advance(5_000 + 10_000 + 20_000 + 30_000); expect(check).toHaveBeenCalledTimes(5);
  await time.advance(29_999); expect(check).toHaveBeenCalledTimes(5);
  await time.advance(1); expect(check).toHaveBeenCalledTimes(6); stop(); expect(time.pending()).toBe(0);
});

test("ending or starting another session discards a late restore", async () => {
  const time = clock(); let current = true, resolve!: (value: {id:string}) => void;
  const accept = mock(()=>{}), status = mock(()=>{});
  recoverSessionCheck({...time,check:()=>new Promise<{id:string}>(r=>resolve=r),accept,status,stillCurrent:()=>current});
  current = false; resolve({id:"old-session"}); await flush();
  expect(accept).not.toHaveBeenCalled(); expect(status).not.toHaveBeenCalled(); expect(time.pending()).toBe(0);
});

test("unmount cancels retries and ignores a late successful response", async () => {
  const time = clock(); let resolve!: (value: null) => void; const accept = mock(()=>{});
  const stop = recoverSessionCheck({...time,check:()=>new Promise<null>(r=>resolve=r),accept,status:()=>{},stillCurrent:()=>true});
  stop(); resolve(null); await flush(); expect(accept).not.toHaveBeenCalled(); expect(time.pending()).toBe(0);
});

test("an invalid login stops recovery rather than bypassing authentication", async () => {
  for (const error of [Object.assign(new Error("denied"),{status:401}), Object.assign(new Error("denied"),{status:403}), new Error("Unauthorized: Invalid token")]) {
    const time = clock(), status = mock(()=>{}), accept = mock(()=>{});
    const check = mock(async () => {throw error;});
    const stop = recoverSessionCheck({...time,check,accept,status,stillCurrent:()=>true});
    await flush(); await time.advance(120_000);
    expect(check).toHaveBeenCalledTimes(1); expect(accept).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith("needs-sign-in"); expect(time.pending()).toBe(0); stop();
  }
});
