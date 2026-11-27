// Ported from the Legal app (family-law-floater/src/lib/contracts/stripe-bold.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
/**
 * Bold Marketing Stripe account (server only). This is the ONLY Stripe account
 * contracts may use — the legacy Legal Group / HTG accounts are off limits.
 * Key lives in Lovable Secrets as BOLD_STRIPE_SECRET_KEY.
 */
const BASE = "https://api.stripe.com/v1";

function key(): string {
  const k = legalEnv["BOLD_STRIPE_SECRET_KEY"];
  if (!k) throw new Error("Bold Stripe is not configured (BOLD_STRIPE_SECRET_KEY missing)");
  return k;
}

/** Flattens nested objects into Stripe's form encoding: a[b][c]=v. */
function encode(
  obj: Record<string, unknown>,
  prefix = "",
  out = new URLSearchParams(),
): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v))
      v.forEach((item, i) =>
        encode(
          typeof item === "object" ? (item as Record<string, unknown>) : { "": item },
          `${name}[${i}]`,
          out,
        ),
      );
    else if (typeof v === "object") encode(v as Record<string, unknown>, name, out);
    else out.append(name, String(v));
  }
  return out;
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: encode(body)
      .toString()
      .replace(/%5B%5D/g, ""),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok)
    throw new Error(
      `Stripe ${path} failed [${res.status}]: ${json.error?.message ?? "unknown error"}`,
    );
  return json;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${key()}` } });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok)
    throw new Error(
      `Stripe ${path} failed [${res.status}]: ${json.error?.message ?? "unknown error"}`,
    );
  return json;
}

export type PaymentLinkResult = { priceId: string; linkId: string; url: string };

/**
 * One-off AUD payment link that saves the card for later off-session charges —
 * the API form of the dashboard's "Save payment details for future use" tickbox:
 * customer_creation=always + payment_intent_data.setup_future_usage=off_session.
 */
export async function createPackPaymentLink(input: {
  productName: string;
  amountCents: number;
  metadata: Record<string, string>;
  redirectUrl?: string;
  idempotencyKey: string;
}): Promise<PaymentLinkResult> {
  const price = await post<{ id: string }>(
    "/prices",
    { currency: "aud", unit_amount: input.amountCents, product_data: { name: input.productName } },
    `${input.idempotencyKey}:price`,
  );
  const link = await post<{ id: string; url: string }>(
    "/payment_links",
    {
      line_items: [{ price: price.id, quantity: 1 }],
      customer_creation: "always",
      payment_intent_data: { setup_future_usage: "off_session", metadata: input.metadata },
      metadata: input.metadata,
      ...(input.redirectUrl
        ? { after_completion: { type: "redirect", redirect: { url: input.redirectUrl } } }
        : {}),
    },
    `${input.idempotencyKey}:link`,
  );
  return { priceId: price.id, linkId: link.id, url: link.url };
}

export async function deactivatePaymentLink(linkId: string): Promise<void> {
  await post(`/payment_links/${linkId}`, { active: false });
}

export type CheckoutSession = {
  id: string;
  customer: string | null;
  payment_intent: string | null;
  payment_status: string;
  metadata: Record<string, string>;
  amount_total: number | null;
};

export async function getCheckoutSession(id: string): Promise<CheckoutSession> {
  return get<CheckoutSession>(`/checkout/sessions/${id}`);
}

export async function getPaymentIntent(
  id: string,
): Promise<{ id: string; payment_method: string | null; customer: string | null }> {
  return get(`/payment_intents/${id}`);
}

/** Charge a saved card without the customer present (Block 2 / additional packs). */
export async function chargeSavedCard(input: {
  customerId: string;
  paymentMethodId: string;
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<{ id: string; status: string }> {
  return post<{ id: string; status: string }>(
    "/payment_intents",
    {
      amount: input.amountCents,
      currency: "aud",
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      off_session: true,
      confirm: true,
      description: input.description,
      metadata: input.metadata,
    },
    input.idempotencyKey,
  );
}

/**
 * Stripe webhook signature: t=<ts>,v1=<hmac>. HMAC-SHA256 over "<ts>.<rawBody>"
 * with the endpoint secret; constant-time compare; 5-minute tolerance.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const ts = parts["t"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
