// Isolated handler regression check: all database and provider boundaries are mocked.
// Run with: bun scripts/check-payment-link-sms.ts
import { mock } from "bun:test";
import assert from "node:assert/strict";

let databaseCalls = 0;
const inserts: Record<string, unknown>[] = [];
const requests: URLSearchParams[] = [];
const db = { from(table: string) {
  databaseCalls++;
  let selected = "";
  const q = {
    select(value: string) { selected = value; return q; },
    eq() { return q; },
    update() { return q; },
    insert(row: Record<string, unknown>) { inserts.push(row); return q; },
    async maybeSingle() { return { error: null, data: table === "partner_clinics"
      ? { id: "clinic", clinic_name: "Test Clinic", phone: "0812345678" }
      : table === "sms_threads" ? { id: "thread" }
      : selected === "deposit_token" ? { deposit_token: "fixture-token" }
      : { clinic_id: "clinic", first_name: "Test" } }; },
  };
  return q;
} };
mock.module("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
mock.module("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://hairtransplantgroup.lovable.app/sales-call") }));
mock.module("@supabase/supabase-js", () => ({ createClient: () => db }));
mock.module("../src/integrations/supabase/client.server", () => ({ supabaseAdmin: db }));
mock.module("../src/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
mock.module("../src/utils/error-logger.functions", () => ({ logError: async () => {} }));
mock.module("../src/utils/sms-sender.server", () => ({ getSmsSender: async () => "+61400000000" }));
mock.module("../src/utils/phone-pool.functions", () => ({ getNextNumber: async () => ({ number: "+61400000000" }) }));
process.env.TWILIO_ACCOUNT_SID = "ACfixture";
process.env.TWILIO_AUTH_TOKEN = "fixture";
process.env.SUPABASE_URL = "https://fixture.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture";
let providerOk = true;
globalThis.fetch = (async (url: string, init: RequestInit) => {
  assert.match(url, /^https:\/\/api\.twilio\.com\/2010-04-01\/Accounts\/ACfixture\/Messages\.json$/);
  requests.push(new URLSearchParams(init.body as URLSearchParams));
  return Response.json(providerOk ? { sid: "SMfixture", status: "queued" } : { message: "Provider rejected recipient" }, { status: providerOk ? 201 : 400 });
}) as typeof fetch;

const { sendStandaloneDepositSms, sendDepositSmsToPatient } = await import("../src/utils/resend.functions");
const { sendPaymentLinkSMS } = await import("../src/utils/twilio.functions");
const base = { leadId: "lead", clinicId: "clinic", firstName: "Test", doctorName: "Test Doctor", bookingDate: "2026-12-01", bookingTime: "10:00", stripeLink: "https://checkout.example.test/fixture" };
let checks = 0;
for (const handler of [sendStandaloneDepositSms, sendDepositSmsToPatient, sendPaymentLinkSMS]) {
  for (const phone of ["61412345678", "+61412345678", "0412 345 678", "412345678", "+44 7700 900123"]) {
    requests.length = 0; inserts.length = 0;
    const result = await (handler as any)({ data: { ...base, phone, to: phone } });
    assert.equal(result.success, true);
    assert.equal(requests.length, 1);
    const expected = phone.startsWith("+44") ? "+447700900123" : "+61412345678";
    assert.equal(requests[0].get("To"), expected);
    assert.equal(inserts.at(-1)?.to_number, expected);
    if (handler !== sendPaymentLinkSMS) {
      const link = new URL(result.depositUrl);
      assert.equal(link.origin, "https://hairtransplantgroup.lovable.app");
      assert.equal(link.pathname, "/squarepayment");
      assert.equal(link.searchParams.get("t"), "fixture-token");
      assert.equal(link.searchParams.get("c"), "clinic");
      assert.ok(requests[0].get("Body")?.includes(result.depositUrl));
    }
    checks++;
  }
  for (const phone of ["+6161412345678", "+6141234XXXX", "", "123", "0412345678 ext 12"]) {
    requests.length = 0; databaseCalls = 0;
    const result = await (handler as any)({ data: { ...base, phone, to: phone } });
    assert.equal(result.success, false);
    assert.match(result.error, /phone number/);
    assert.equal(requests.length, 0);
    assert.equal(databaseCalls, 0);
    checks++;
  }
  providerOk = false; inserts.length = 0;
  const failed = await (handler as any)({ data: { ...base, phone: "61412345678", to: "61412345678" } });
  assert.equal(failed.success, false);
  assert.equal(inserts.length, 0);
  providerOk = true;
  checks++;
}
console.log(`${checks} payment-link handler checks passed; no live SMS or database requests made.`);
