// Ported from the Legal app (family-law-floater/src/lib/square-deposit.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
// Server-only Square helpers for the $75 refundable booking deposit.
// Uses the Square REST API directly (Worker-safe, no Node-only SDK).
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { publicBaseUrl } from "./twilio.server";

export const DEPOSIT_CENTS = 7500;
const SQUARE_API = "https://connect.squareup.com/v2";
const SQUARE_VERSION = "2025-01-23";

function accessToken(): string {
  const key = legalEnv["SQUARE_ACCESS_TOKEN"];
  if (!key) throw new Error("Square access token is not configured");
  return key;
}

export function squareApplicationId(): string | null {
  return legalEnv["SQUARE_APPLICATION_ID"] ?? null;
}

export function squareLocationId(): string {
  const id = legalEnv["SQUARE_LOCATION_ID"];
  if (!id) throw new Error("Square location is not configured");
  return id;
}

async function squarePost(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${SQUARE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[square-deposit] ${path} failed [${response.status}]: ${text}`);
    let message = `Square request failed [${response.status}]`;
    try {
      const parsed = JSON.parse(text) as { errors?: { detail?: string }[] };
      if (parsed.errors?.[0]?.detail) message = parsed.errors[0].detail!;
    } catch {
      /* keep generic message */
    }
    throw new Error(message);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

async function squareGet(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${SQUARE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Square-Version": SQUARE_VERSION,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Square request failed [${response.status}]: ${text}`);
  return JSON.parse(text) as Record<string, unknown>;
}

/** Human-readable line describing which firm/lawyer the deposit is for. */
export function depositDescription(args: {
  firmName?: string | null;
  lawyerName?: string | null;
  firmAddress?: string | null;
}): string {
  return [args.firmName?.trim(), args.lawyerName?.trim(), args.firmAddress?.trim()]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 300)
    .trim();
}

export type DepositSession = { url: string; id: string };

/** Hosted Square payment link the client can pay from their phone. */
export async function createDepositSession(args: {
  leadId: string;
  firmName: string | null;
  lawyerName?: string | null;
  firmAddress?: string | null;
  email: string | null;
}): Promise<DepositSession> {
  const base = publicBaseUrl();
  const description = depositDescription(args);
  const itemName = description
    ? `Refundable booking fee — ${description}`.slice(0, 255)
    : "Refundable booking fee";
  const json = await squarePost("/online-checkout/payment-links", {
    idempotency_key: `dep-${args.leadId}-${Date.now()}`,
    order: {
      location_id: squareLocationId(),
      reference_id: args.leadId,
      line_items: [
        {
          name: itemName,
          quantity: "1",
          base_price_money: { amount: DEPOSIT_CENTS, currency: "AUD" },
        },
      ],
    },
    description: description || undefined,
    checkout_options: {
      redirect_url: `${base}/deposit-confirmed?lead=${args.leadId}${
        args.firmName ? `&firm=${encodeURIComponent(args.firmName)}` : ""
      }`,
      ask_for_shipping_address: false,
    },
    pre_populated_data: args.email ? { buyer_email: args.email } : undefined,
    payment_note: `lead:${args.leadId}`,
  });
  const link = (json["payment_link"] ?? {}) as { id?: string; url?: string; order_id?: string };
  if (!link.url || !link.order_id)
    throw new Error("Square did not return a payment link and order reference");
  // Save before exposing/sending the link. This lets us recover missed webhooks.
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("client_leads")
    .update({ stripe_checkout_session_id: link.order_id })
    .eq("id", args.leadId)
    .is("deposit_paid_at", null)
    .select("id");
  if (error) throw new Error(`Could not save deposit reference: ${error.message}`);
  if (!data?.length) throw new Error("Lead is already paid or no longer available");
  return { id: link.order_id, url: link.url };
}

/**
 * Charge a card the rep keyed in over the phone. The browser tokenises the card
 * with the Web Payments SDK; only the single-use token reaches this server.
 */
export async function chargeManualDeposit(args: {
  leadId: string;
  sourceId: string;
  description: string;
  email: string | null;
  verificationToken?: string | null;
}): Promise<{ paid: boolean; status: string; paymentId: string | null; message?: string }> {
  const json = await squarePost("/payments", {
    // Square's Payments API caps idempotency_key at 45 characters. A prefix,
    // full lead UUID and timestamp was 54 characters for every real lead.
    idempotency_key: `manual-${randomUUID()}`,
    source_id: args.sourceId,
    amount_money: { amount: DEPOSIT_CENTS, currency: "AUD" },
    location_id: squareLocationId(),
    autocomplete: true,
    note: `lead:${args.leadId}`,
    ...(args.email ? { buyer_email_address: args.email } : {}),
    ...(args.verificationToken ? { verification_token: args.verificationToken } : {}),
  });
  const payment = (json["payment"] ?? {}) as SquareDepositPayment;
  const status = String(payment.status ?? "UNKNOWN");
  if (!isCompletedDeposit(payment)) {
    return {
      paid: false,
      status,
      paymentId: payment.id ?? null,
      message:
        status === "APPROVED"
          ? "Payment is authorised but not completed yet."
          : "Payment has not completed.",
    };
  }
  await recordPaidDeposit({
    leadId: args.leadId,
    paymentId: payment.id ?? null,
    amountCents: payment.amount_money?.amount ?? DEPOSIT_CENTS,
  });
  return { paid: true, status, paymentId: payment.id ?? null };
}

/** Verify a Square webhook signature (x-square-hmacsha256-signature). */
export function verifySquareSignature(payload: string, header: string | null): boolean {
  const secret = legalEnv["SQUARE_WEBHOOK_SIGNATURE_KEY"];
  if (!secret || !header) return false;
  const url =
    legalEnv["SQUARE_WEBHOOK_NOTIFICATION_URL"] ||
    `${publicBaseUrl().replace(/\/$/, "")}/api/public/legal/hooks/square-deposit`;
  const expected = createHmac("sha256", secret).update(`${url}${payload}`).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Record a paid deposit on the lead. Touches ONLY deposit + payment reference
 * columns — client_leads.status is rep-clicks only and must never be written here.
 */
export async function recordPaidDeposit(args: {
  leadId: string;
  paymentId: string | null;
  amountCents: number | null;
  orderId?: string | null;
}): Promise<{ matched: boolean }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: lead, error: readError } = await supabaseAdmin
    .from("client_leads")
    .select("id, deposit_paid_at")
    .eq("id", args.leadId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!lead) return { matched: false };
  if (lead.deposit_paid_at) return { matched: true };

  const { error } = await supabaseAdmin
    .from("client_leads")
    .update({
      deposit_paid_at: lead.deposit_paid_at ?? new Date().toISOString(),
      deposit_amount: Math.round((args.amountCents ?? DEPOSIT_CENTS) / 100),
      ...(args.orderId ? { stripe_checkout_session_id: args.orderId } : {}),
      stripe_payment_intent_id: args.paymentId,
    })
    .eq("id", args.leadId)
    .is("deposit_paid_at", null);
  if (error) throw new Error(error.message);

  return { matched: true };
}

export type SquareDepositPayment = {
  id?: string;
  status?: string;
  note?: string | null;
  order_id?: string | null;
  location_id?: string;
  amount_money?: { amount?: number; currency?: string };
  refunded_money?: { amount?: number };
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function noteLead(note?: string | null): string | null {
  const id = note?.match(/lead:([0-9a-f-]{36})(?![0-9a-f-])/i)?.[1];
  return id && UUID.test(id) ? id : null;
}

/** Only a completed, unrefunded $75 AUD payment at our location unlocks booking. */
export function isCompletedDeposit(payment: SquareDepositPayment): boolean {
  return (
    !!payment.id &&
    payment.status === "COMPLETED" &&
    payment.amount_money?.amount === DEPOSIT_CENTS &&
    payment.amount_money.currency === "AUD" &&
    payment.location_id === squareLocationId() &&
    !payment.refunded_money?.amount
  );
}

/** Deterministic references only; never match a payment by a person's name or email. */
export async function leadIdForPayment(payment: SquareDepositPayment): Promise<string | null> {
  const fromNote = noteLead(payment.note);
  if (fromNote) return fromNote;
  if (!payment.order_id) return null;
  // Let API errors propagate so Square retries instead of losing the event.
  const json = await squareGet(`/orders/${encodeURIComponent(payment.order_id)}`);
  const order = (json["order"] ?? {}) as { reference_id?: string; source?: { name?: string } };
  if (order.reference_id && UUID.test(order.reference_id)) return order.reference_id;
  const legacy = noteLead(order.source?.name);
  if (legacy) return legacy;
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("client_leads")
    .select("id")
    .eq("stripe_checkout_session_id", payment.order_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/** Re-read a payment from Square; fail closed if its ownership cannot be proved. */
export async function settleManualPayment(
  paymentId: string,
  expectedLeadId: string,
): Promise<{ paid: boolean; status: string }> {
  const json = await squareGet(`/payments/${encodeURIComponent(paymentId)}`);
  const payment = (json["payment"] ?? {}) as SquareDepositPayment;
  const status = String(payment.status ?? "UNKNOWN");
  if (payment.id !== paymentId || !isCompletedDeposit(payment)) return { paid: false, status };
  if ((await leadIdForPayment(payment)) !== expectedLeadId)
    return { paid: false, status: "UNMATCHED" };
  const result = await recordPaidDeposit({
    leadId: expectedLeadId,
    paymentId,
    amountCents: payment.amount_money!.amount!,
    orderId: payment.order_id ?? null,
  });
  return { paid: result.matched, status };
}

/** Read-only at Square. Repairs our local deposit stamp when a webhook was missed. */
export async function reconcileLeadDeposit(
  leadId: string,
): Promise<{ paid: boolean; status: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: lead, error } = await supabaseAdmin
    .from("client_leads")
    .select("id, deposit_paid_at, stripe_checkout_session_id")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lead) throw new Error("Lead not found");
  if (lead.deposit_paid_at) return { paid: true, status: "RECORDED" };
  const orderId = lead.stripe_checkout_session_id;
  if (!orderId || orderId.startsWith("cs_")) return { paid: false, status: "NO_SQUARE_ORDER" };
  const json = await squareGet(`/orders/${encodeURIComponent(orderId)}`);
  const order = (json["order"] ?? {}) as {
    id?: string;
    reference_id?: string;
    tenders?: { payment_id?: string }[];
  };
  if (order.id !== orderId || (order.reference_id && order.reference_id !== leadId)) {
    return { paid: false, status: "UNMATCHED" };
  }
  for (const tender of order.tenders ?? []) {
    if (!tender.payment_id) continue;
    const result = await settleManualPayment(tender.payment_id, leadId);
    if (result.paid) return result;
  }
  return { paid: false, status: "PENDING" };
}

/** Refund a Square deposit payment in full. Returns the Square refund id. */
export async function refundSquarePayment(args: {
  paymentId: string;
  amountCents?: number | null;
  reason?: string;
}): Promise<{ refundId: string | null; status: string }> {
  const json = await squarePost("/refunds", {
    idempotency_key: `refund-${randomUUID()}`,
    payment_id: args.paymentId,
    amount_money: { amount: args.amountCents ?? DEPOSIT_CENTS, currency: "AUD" },
    ...(args.reason ? { reason: args.reason.slice(0, 192) } : {}),
  });
  const refund = (json["refund"] ?? {}) as { id?: string; status?: string };
  return { refundId: refund.id ?? null, status: String(refund.status ?? "UNKNOWN") };
}
