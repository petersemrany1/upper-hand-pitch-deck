import { afterEach, expect, test } from "bun:test";
import { refundDeposit } from "./deposit-refund.server";

const savedFetch = globalThis.fetch;
const keys = ["STRIPE_LIVE_API_KEY", "STRIPE_SANDBOX_API_KEY", "LOVABLE_API_KEY", "STRIPE_HTG_SECRET_KEY", "SQUARE_ACCESS_TOKEN", "SQUARE_ENVIRONMENT"];
const savedEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  globalThis.fetch = savedFetch;
  for (const key of keys) { if (savedEnv[key] === undefined) delete process.env[key]; else process.env[key] = savedEnv[key]; }
});

test("managed Stripe pending refunds stay pending and use a stable idempotency key", async () => {
  process.env.STRIPE_LIVE_API_KEY = "fixture-connection"; process.env.LOVABLE_API_KEY = "fixture-key";
  let requests=0;
  globalThis.fetch = (async (input, init) => {
    expect(String(input)).toContain("connector-gateway.lovable.dev/stripe/v1/refunds");
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("refund-appointment-fixture");
    requests++;
    return Response.json({ id: "re_fixture", object: "refund", status: "pending", payment_intent: "pi_fixture", amount: 7500, currency: "aud" });
  }) as typeof fetch;
  expect(await refundDeposit("pi_fixture", "appointment-fixture", "stripe")).toEqual({ status: "pending", refundId: "re_fixture", account: "managed" });
  expect(requests).toBe(1);
});

test("legacy Stripe checks actual status rather than presence of refund id", async () => {
  delete process.env.STRIPE_LIVE_API_KEY; delete process.env.STRIPE_SANDBOX_API_KEY; process.env.STRIPE_HTG_SECRET_KEY = "fixture-key";
  for (const status of ["pending", "succeeded", "failed"]) {
    globalThis.fetch = (async (input, init) => {
      expect(String(input)).toBe("https://api.stripe.com/v1/refunds");
      expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("refund-appointment-fixture");
      return Response.json({ id: "re_fixture", status, payment_intent: "pi_fixture", amount: 7500, currency: "aud", failure_reason: status === "failed" ? "declined" : null });
    }) as typeof fetch;
    expect((await refundDeposit("pi_fixture", "appointment-fixture", "stripe")).status).toBe(status === "succeeded" ? "refunded" : status);
  }
});

test("Square rejection and communication failure produce a failure/manual result", async () => {
  process.env.SQUARE_ACCESS_TOKEN = "fixture-token"; process.env.SQUARE_ENVIRONMENT = "sandbox";
  globalThis.fetch = (async (input, init) => {
    expect(String(input)).toBe("https://connect.squareupsandbox.com/v2/refunds");
    const body=JSON.parse(String(init?.body)); expect(body.amount_money.amount).toBe(7500); expect(body.idempotency_key).toBe("refund-appointment-fixture");
    return Response.json({ refund: { id: "square-refund", status: "REJECTED" } });
  }) as typeof fetch;
  expect((await refundDeposit("square-payment", "appointment-fixture", "square", { amountCents: 7500 })).status).toBe("failed");
  globalThis.fetch = (async () => { throw new Error("connection lost"); }) as typeof fetch;
  const result=await refundDeposit("square-payment", "appointment-fixture", "square", { amountCents: 7500 });
  expect(result.status).toBe("manual"); expect("reason" in result && result.reason).toContain("Check Square");
});
