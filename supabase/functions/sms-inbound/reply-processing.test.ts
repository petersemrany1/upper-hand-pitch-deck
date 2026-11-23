import { beforeEach, expect, mock, test } from "bun:test";

let handler: (request: Request) => Promise<Response>;
let valid = true;
let storageError: { code: string } | null = null;
let processorError: Error | null = null;
let throwOnLookup = false;
let processed = 0;
mock.module("https://deno.land/std@0.168.0/http/server.ts", () => ({ serve: (fn: typeof handler) => { handler = fn; } }));
mock.module("../_shared/twilio-signature.ts", () => ({ validateTwilioSignature: async () => valid }));
mock.module("https://esm.sh/@supabase/supabase-js@2.45.4", () => ({ createClient: () => ({
  from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => {
      if (throwOnLookup) throw new Error("Fixture database unavailable");
      return { data: { id: "thread" } };
    } }) }),
    insert: async () => ({ error: storageError }),
  }),
  rpc: async () => { processed++; return { error: processorError }; },
}) }));
Object.defineProperty(globalThis, "Deno", { configurable: true, value: { env: { get: () => "fixture" } } });
await import("./index.ts");
beforeEach(() => { valid = true; storageError = null; processorError = null; throwOnLookup = false; processed = 0; });
const request = () => new Request("https://example.test", { method: "POST", body: new URLSearchParams({ From: "+61400000000", To: "+61480887591", Body: "YES", MessageSid: "SMfixture", NumMedia: "0" }) });

test("signed replies on replacement numbers reach the processor", async () => {
  expect((await handler(request())).status).toBe(200); expect(processed).toBe(1);
});
test("invalid signatures never reach storage or confirmation processing", async () => {
  valid = false; expect((await handler(request())).status).toBe(403); expect(processed).toBe(0);
});
test("duplicate inbox deliveries still retry the independent confirmation processor", async () => {
  storageError = { code: "23505" }; expect((await handler(request())).status).toBe(200); expect(processed).toBe(1);
});
test("storage and processing failures are retryable HTTP errors", async () => {
  storageError = { code: "08006" }; expect((await handler(request())).status).toBe(500); expect(processed).toBe(0);
  storageError = null; processorError = new Error("Fixture processing unavailable");
  expect((await handler(request())).status).toBe(500); expect(processed).toBe(1);
});
test("unexpected exceptions no longer acknowledge a failed webhook", async () => {
  throwOnLookup = true; expect((await handler(request())).status).toBe(500); expect(processed).toBe(0);
});
