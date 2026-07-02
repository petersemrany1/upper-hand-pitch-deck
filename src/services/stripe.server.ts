import { logError } from "@/utils/error-logger.functions";

/**
 * Stripe service: the single place that talks to the Stripe REST API.
 * Two accounts exist — "bold" (clinic packages) and "htg" (patient
 * consultation deposits). They must never fall back to each other's keys.
 * Server-side only.
 */

export type StripeAccount = "bold" | "htg";

export type StripeApiResponse = {
  id?: string;
  url?: string;
  amount?: number;
  status?: string;
  error?: { message?: string };
  last_payment_error?: { message?: string };
};

export function getStripeSecretKey(account: StripeAccount): string | null {
  const key =
    account === "bold"
      ? process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_HTG_SECRET_KEY;
  if (!key) return null;
  const validPrefix =
    key.startsWith("sk_live_") || key.startsWith("sk_test_") || key.startsWith("rk_live_");
  return validPrefix ? key : null;
}

export type StripeRequestResult =
  | { ok: true; data: StripeApiResponse }
  | { ok: false; error: string; data?: StripeApiResponse };

/** POST a form-encoded request to the Stripe API. Never throws. */
export async function stripeRequest(
  account: StripeAccount,
  path: string,
  params: URLSearchParams,
  logSource: string
): Promise<StripeRequestResult> {
  const key = getStripeSecretKey(account);
  if (!key) {
    const msg =
      account === "bold"
        ? "STRIPE_SECRET_KEY is not configured"
        : "STRIPE_HTG_SECRET_KEY is not configured or malformed";
    await logError(logSource, msg, {});
    return { ok: false, error: msg };
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = (await response.json()) as StripeApiResponse;
    if (!response.ok) {
      const error = data?.error?.message || "Stripe API error";
      await logError(logSource, error, { raw: data });
      return { ok: false, error, data };
    }
    return { ok: true, data };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logError(logSource, error, {});
    return { ok: false, error: "Request failed" };
  }
}

/** Validate a dollar amount and convert to integer cents (min $0.50). */
export function toCents(amountDollars: number): number | null {
  const cents = Math.round(Number(amountDollars) * 100);
  if (!Number.isFinite(cents) || cents < 50) return null;
  return cents;
}
