// Refunding the $75 booking fee has to survive the account migration:
// deposits taken on the NEW managed Stripe account and deposits taken on the
// OLD (banned) HTG account both need to come back to the patient.
//
// Strategy: try the managed account first. Stripe answers `resource_missing`
// when the payment intent doesn't belong to that account, which is our signal
// to retry against the legacy HTG key. If both fail, the caller flags the
// appointment for a manual refund instead of pretending it worked.

import { createStripeClient, getStripeErrorMessage, resolveStripeEnv } from "@/lib/stripe.server";

export type RefundOutcome =
  | { status: "refunded"; refundId: string; account: "managed" | "htg" }
  // Square settles asynchronously: accepted now, confirmed by refund.updated.
  | { status: "pending"; refundId: string; account: "square" }
  | { status: "manual"; reason: string }
  | { status: "failed"; error: string };

function isMissingOnThisAccount(error: unknown): boolean {
  const e = error as { code?: string; raw?: { code?: string }; statusCode?: number };
  const code = e?.raw?.code ?? e?.code;
  return code === "resource_missing";
}

async function refundOnManaged(
  paymentIntentId: string,
  appointmentId: string,
): Promise<RefundOutcome | "not_this_account"> {
  let stripe;
  try {
    stripe = createStripeClient(resolveStripeEnv());
  } catch {
    return "not_this_account"; // managed payments not configured on this build
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      metadata: { appointment_id: appointmentId },
    });
    if (!refund.id) return { status: "failed", error: "Stripe returned no refund id" };
    return { status: "refunded", refundId: refund.id, account: "managed" };
  } catch (error) {
    if (isMissingOnThisAccount(error)) return "not_this_account";
    return { status: "failed", error: getStripeErrorMessage(error) };
  }
}

async function refundOnHtg(
  paymentIntentId: string,
  appointmentId: string,
): Promise<RefundOutcome> {
  const stripeKey = process.env.STRIPE_HTG_SECRET_KEY;
  if (!stripeKey) {
    return {
      status: "manual",
      reason: "Deposit was taken on the old Stripe account, which is no longer connected.",
    };
  }

  const params = new URLSearchParams();
  params.append("payment_intent", paymentIntentId);
  params.append("metadata[appointment_id]", appointmentId);

  try {
    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + stripeKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const result = (await response.json()) as {
      id?: string;
      error?: { message?: string; code?: string };
    };

    if (!response.ok || !result.id) {
      const code = result?.error?.code;
      const message = result?.error?.message || "Stripe refund failed";
      // The old account is closed — nobody can refund through the API.
      if (
        code === "account_closed" ||
        code === "charge_disputed" ||
        /account.*(closed|restricted|disabled)/i.test(message)
      ) {
        return {
          status: "manual",
          reason: `Old Stripe account can no longer refund (${message}). Refund the patient by bank transfer.`,
        };
      }
      return { status: "failed", error: message };
    }

    return { status: "refunded", refundId: result.id, account: "htg" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export async function refundDeposit(
  paymentIntentId: string,
  appointmentId: string,
): Promise<RefundOutcome> {
  const managed = await refundOnManaged(paymentIntentId, appointmentId);
  if (managed !== "not_this_account") return managed;

  const legacy = await refundOnHtg(paymentIntentId, appointmentId);
  if (legacy.status === "failed" && isLikelyUnknownEverywhere(legacy.error)) {
    return {
      status: "manual",
      reason:
        "This payment could not be found on either Stripe account. Check the payment manually before refunding.",
    };
  }
  return legacy;
}

function isLikelyUnknownEverywhere(error: string): boolean {
  return /no such payment_intent/i.test(error);
}

// Recovers a paid booking-fee PaymentIntent from the MANAGED account for older
// appointments where the id was never written to the row.
export async function findManagedDepositPaymentIntent(
  leadId: string | null,
): Promise<string | null> {
  if (!leadId) return null;
  let stripe;
  try {
    stripe = createStripeClient(resolveStripeEnv());
  } catch {
    return null;
  }

  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    for (const session of sessions.data) {
      if (session.metadata?.lead_id !== leadId) continue;
      if (session.payment_status === "unpaid") continue;
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      if (pi) return pi;
    }
  } catch (e) {
    console.warn("findManagedDepositPaymentIntent failed", e);
  }
  return null;
}
