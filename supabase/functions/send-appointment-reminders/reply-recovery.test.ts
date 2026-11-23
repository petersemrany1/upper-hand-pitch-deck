import { beforeEach, expect, mock, test } from "bun:test";

let handler: (request: Request) => Promise<Response>;
let calls: string[] = [];
let recoveryFails = false;
mock.module("https://deno.land/std@0.168.0/http/server.ts", () => ({
  serve: (callback: typeof handler) => { handler = callback; },
}));
mock.module("https://esm.sh/@supabase/supabase-js@2.45.4", () => ({
  createClient: () => ({
    rpc: async (name: string) => {
      calls.push(name);
      return { error: recoveryFails && name === "reconcile_appointment_confirmation_replies" ? new Error("Fixture reply failure") : null };
    },
    from: (table: string) => {
      calls.push(table);
      const query = { select: () => query, order: () => query, eq: () => query, gte: () => query, range: async () => ({ data: [], error: null }) };
      return query;
    },
  }),
}));
mock.module("../_shared/authorize.ts", () => ({ requireInternalOrSalesRole: async () => null }));
Object.defineProperty(globalThis, "Deno", { configurable: true, value: { env: { get: () => "fixture" } } });
await import("./index.ts");
beforeEach(() => { calls = []; recoveryFails = false; });
const request = (dry = false) => new Request("https://example.test", { method: "POST", body: JSON.stringify({ dry_run: dry }) });

test("stored replies are recovered before reading settings or the reminder queue", async () => {
  expect((await handler(request())).status).toBe(200);
  expect(calls).toEqual(["recover_stale_confirmation_deliveries", "reconcile_appointment_confirmation_replies", "clinic_reminder_settings", "appointment_reminders"]);
});
test("a reply recovery error aborts the run before reading or sending any jobs", async () => {
  recoveryFails = true;
  expect((await handler(request())).status).toBe(500);
  expect(calls).toEqual(["recover_stale_confirmation_deliveries", "reconcile_appointment_confirmation_replies"]);
});
test("dry runs never consume replies or write recovery state", async () => {
  expect((await handler(request(true))).status).toBe(200);
  expect(calls).toEqual(["clinic_reminder_settings", "appointment_reminders"]);
});
