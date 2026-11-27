// Ported from the Legal app (family-law-floater/src/lib/stripe-refund.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
/**
 * Legacy Stripe refunds. Deposits are taken through Square now, but bookings
 * paid before the switch have a Stripe PaymentIntent on file (`pi_...`), so
 * refunds for those must still go back through Stripe.
 */
export async function refundStripePayment(args: {
  paymentIntentId: string;
  amountCents?: number | null;
  reason?: string;
}): Promise<{ refundId: string; status: string }> {
  const key = legalEnv["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is no longer configured — refund this deposit manually.");

  const body = new URLSearchParams();
  body.set("payment_intent", args.paymentIntentId);
  if (args.amountCents && args.amountCents > 0)
    body.set("amount", String(Math.round(args.amountCents)));
  if (args.reason) body.set("metadata[reason]", args.reason.slice(0, 200));

  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `refund-${args.paymentIntentId}`,
    },
    body,
  });

  const json = (await res.json()) as {
    id?: string;
    status?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? `Stripe refund failed [${res.status}]`);
  }
  return { refundId: json.id, status: json.status ?? "unknown" };
}
