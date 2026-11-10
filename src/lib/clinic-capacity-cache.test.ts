import { expect, test } from "bun:test";
import { createCapacityCache } from "./clinic-capacity-cache";
function fixture() {
  const reads: { resolve: (value: Record<string, number>) => void; reject: (e: Error) => void }[] = [];
  const cache = createCapacityCache(() => new Promise((resolve, reject) => reads.push({ resolve, reject })));
  return { cache, reads };
}
test("a dial waiting on an old balance receives the post-booking result", async () => {
  const { cache, reads } = fixture();
  const old = cache.fetch(); cache.invalidate(); const fresh = cache.fetch({ fresh: true });
  reads[1].resolve({ boss: 0 }); await fresh;
  reads[0].resolve({ boss: 1 });
  expect(await old).toEqual({ boss: 0 }); expect(await cache.fetch()).toEqual({ boss: 0 });
});
test("invalidated readers join a fresh read even if they finish first", async () => {
  const { cache, reads } = fixture(); const old = cache.fetch(); cache.invalidate(); const fresh = cache.fetch();
  reads[0].resolve({ boss: 1 }); await Promise.resolve(); reads[1].resolve({ boss: 0 });
  expect(await old).toEqual({ boss: 0 }); expect(await fresh).toEqual({ boss: 0 }); expect(reads).toHaveLength(2);
});
test("failure is not cached and ordinary consumers share one read", async () => {
  const { cache, reads } = fixture(); const first = cache.fetch(); expect(cache.fetch()).toBe(first);
  reads[0].reject(new Error("offline")); await expect(first).rejects.toThrow("offline");
  const retry = cache.fetch(); reads[1].resolve({ boss: 1 }); expect(await retry).toEqual({ boss: 1 });
});
