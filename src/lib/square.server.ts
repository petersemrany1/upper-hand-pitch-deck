// Server-side Square client for the $75 patient booking fee.
// Stripe stays in place for B2B clinic pack links and legacy refunds; this
// module only ever touches Square.

const SQUARE_VERSION = "2025-01-23";

export type SquareEnvironment = "sandbox" | "production";

export function getSquareEnvironment(): SquareEnvironment {
  return process.env["SQUARE_ENVIRONMENT"] === "production" ? "production" : "sandbox";
}

export function squareApiBase(env: SquareEnvironment = getSquareEnvironment()): string {
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env["SQUARE_ACCESS_TOKEN"] &&
      process.env["SQUARE_LOCATION_ID"] &&
      process.env["SQUARE_APPLICATION_ID"],
  );
}

type SquareError = { category?: string; code?: string; detail?: string; field?: string };

export function getSquareErrorMessage(errors: unknown): string {
  if (Array.isArray(errors) && errors.length) {
    const first = errors[0] as SquareError;
    const detail = first?.detail || first?.code || "Square request failed";
    return first?.code && first?.detail ? `${detail} (${first.code})` : detail;
  }
  if (errors instanceof Error) return errors.message;
  return "Square request failed";
}

async function squareFetch(
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const token = process.env["SQUARE_ACCESS_TOKEN"];
  if (!token) throw new Error("SQUARE_ACCESS_TOKEN is not configured");

  const res = await fetch(`${squareApiBase()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { ok: res.ok, status: res.status, json };
}

export type SquarePayment = {
  id: string;
  status: string;
  order_id?: string | null;
  amount_money?: { amount?: number; currency?: string } | null;
  reference_id?: string | null;
  note?: string | null;
};

export async function createSquarePayment(params: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
  referenceId: string;
  note?: string;
  verificationToken?: string;
}): Promise<{ payment: SquarePayment } | { error: string; retryable?: boolean }> {
  const locationId = process.env["SQUARE_LOCATION_ID"];
  if (!locationId) return { error: "Square location is not configured" };

  const { ok, status, json } = await squareFetch("/v2/payments", {
    method: "POST",
    body: {
      source_id: params.sourceId,
      idempotency_key: params.idempotencyKey.slice(0, 45),
      amount_money: { amount: params.amountCents, currency: "AUD" },
      location_id: locationId,
      autocomplete: true,
      reference_id: params.referenceId.slice(0, 40),
      ...(params.note ? { note: params.note.slice(0, 500) } : {}),
      ...(params.verificationToken ? { verification_token: params.verificationToken } : {}),
    },
  });

  if (!ok) {
    // These responses do not prove that no charge occurred. Keep the same
    // source token and idempotency key when the patient retries.
    const retryable = status >= 500 || status === 408 || status === 429;
    return {
      error: retryable
        ? "We couldn't confirm your payment yet. Please try again here to check the same payment safely."
        : getSquareErrorMessage(json["errors"]),
      retryable,
    };
  }
  const payment = json["payment"] as SquarePayment | undefined;
  if (!payment?.id) return { error: "We couldn't confirm your payment yet. Please try again here to check the same payment safely.", retryable: true };
  return { payment };
}

export async function refundSquarePayment(params: {
  paymentId: string;
  amountCents: number;
  idempotencyKey: string;
  reason?: string;
}): Promise<{ refundId: string; status: string } | { error: string }> {
  const { ok, json } = await squareFetch("/v2/refunds", {
    method: "POST",
    body: {
      idempotency_key: params.idempotencyKey.slice(0, 45),
      payment_id: params.paymentId,
      amount_money: { amount: params.amountCents, currency: "AUD" },
      ...(params.reason ? { reason: params.reason.slice(0, 192) } : {}),
    },
  });

  if (!ok) return { error: getSquareErrorMessage(json["errors"]) };
  const refund = json["refund"] as { id?: string; status?: string } | undefined;
  if (!refund?.id) return { error: "Square returned no refund id" };
  return { refundId: refund.id, status: refund.status ?? "PENDING" };
}

export async function getSquarePayment(
  paymentId: string,
): Promise<SquarePayment | null> {
  const { ok, json } = await squareFetch(`/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
  if (!ok) return null;
  return (json["payment"] as SquarePayment | undefined) ?? null;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Square signs `notificationUrl + rawBody` with HMAC-SHA256 using the
 * subscription's signature key, base64-encoded, sent as
 * `x-square-hmacsha256-signature`. The URL must match the dashboard value
 * character for character.
 */
export async function verifySquareWebhook(
  rawBody: string,
  signature: string | null,
  notificationUrl: string,
): Promise<boolean> {
  const secret = process.env["SQUARE_WEBHOOK_SIGNATURE_KEY"];
  if (!secret || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${notificationUrl}${rawBody}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("base64");
  return constantTimeEqual(signature, expected);
}
