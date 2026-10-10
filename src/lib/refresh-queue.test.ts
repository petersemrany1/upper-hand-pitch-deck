import { expect, test } from "bun:test";
import { createRefreshQueue } from "./refresh-queue";
const flush = async () => {for(let i=0;i<8;i++) await Promise.resolve();};
test("bursts produce one subsequent fresh read and never publish stale capacity", async () => {
  const pending: (()=>void)[] = [], published: number[] = []; let running=0, peak=0, reads=0;
  const q=createRefreshQueue(async current=>{
    const value=++reads; peak=Math.max(peak,++running);
    await new Promise<void>(resolve=>pending.push(resolve));
    if(current()) published.push(value); running--;
  });
  q.refresh(); for(let i=0;i<20;i++) q.refresh();
  expect(reads).toBe(1); pending.shift()!(); await flush();
  expect(reads).toBe(2); expect(published).toEqual([]); expect(peak).toBe(1);
  pending.shift()!(); await flush(); expect(published).toEqual([2]); q.stop();
});
test("stopping a refresh discards its result and its queued follow-up", async () => {
  let resolve!:()=>void, reads=0; const published: boolean[]=[];
  const q=createRefreshQueue(async current=>{reads++; await new Promise<void>(r=>resolve=r); if(current())published.push(true);});
  q.refresh(); q.refresh(); q.stop(); resolve(); await flush(); q.refresh();
  expect(reads).toBe(1); expect(published).toEqual([]);
});
test("a handled failed read keeps old data and allows the next refresh", async () => {
  let value=4, reads=0;
  const q=createRefreshQueue(async current=>{try {if(++reads===1) throw new Error("offline"); if(current())value=5;} catch {}});
  q.refresh(); await flush(); expect(value).toBe(4);
  q.refresh(); await flush(); expect(value).toBe(5); q.stop();
});
