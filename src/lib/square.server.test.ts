import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createSquarePayment } from "./square.server";

const originalFetch = globalThis.fetch;
const envKeys = ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_ENVIRONMENT"] as const;
const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const paymentRequest = { sourceId: "test-source", amountCents: 7500, idempotencyKey: "stable-key", referenceId: "test-lead" };

beforeEach(() => {
  process.env.SQUARE_ACCESS_TOKEN = "test-only";
  process.env.SQUARE_LOCATION_ID = "test-location";
  process.env.SQUARE_ENVIRONMENT = "sandbox";
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

function respond(status: number, body: unknown) {
  const fetchMock = mock(async () => new Response(JSON.stringify(body), { status }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("Square deposit request recovery", () => {
  for (const status of [500, 502, 503, 408, 429]) {
    test(`preserves the existing payment attempt after HTTP ${status}`, async () => {
      respond(status, { errors: [{ code: "TEMPORARY_ERROR" }] });
      expect(await createSquarePayment(paymentRequest)).toMatchObject({ retryable: true });
    });
  }
  test("an explicit card decline allows a new payment method", async () => {
    respond(400, { errors: [{ code: "CARD_DECLINED" }] });
    expect(await createSquarePayment(paymentRequest)).toEqual({ error: "CARD_DECLINED", retryable: false });
  });
  test("an incomplete successful response is treated as uncertain", async () => {
    respond(200, {});
    expect(await createSquarePayment(paymentRequest)).toMatchObject({ retryable: true });
  });
  test("sends the expected amount, currency, lead, and idempotency key", async () => {
    const fetchMock = respond(200, { payment: { id: "payment", status: "COMPLETED" } });
    expect(await createSquarePayment(paymentRequest)).toMatchObject({ payment: { id: "payment" } });
    const [, options] = (fetchMock.mock.calls[0] as unknown as Parameters<typeof fetch>);
    expect(JSON.parse(options?.body as string)).toMatchObject({
      source_id: "test-source", amount_money: { amount: 7500, currency: "AUD" },
      idempotency_key: "stable-key", reference_id: "test-lead", autocomplete: true,
    });
  });
});
