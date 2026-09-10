import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logError } from "./error-logger.functions";
import type { Database } from "@/integrations/supabase/types";

type ProcessInput = {
  appointmentId: string;
  summary: string;
  proceeded: boolean;
};

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalizePhone(p: string | null | undefined): string {
  return (p || "").replace(/[^0-9]/g, "");
}

async function searchStripeByContact(stripeKey: string, email: string | null, phone: string | null, appointmentId: string): Promise<string | null> {
  // Use Stripe Search API to find paid PaymentIntents for this contact (last 90 days).
  const queries: string[] = [];
  if (email) queries.push(`status:"succeeded" AND customer.email:"${email}"`);
  if (email) queries.push(`status:"succeeded" AND receipt_email:"${email}"`);

  for (const q of queries) {
    const url = "https://api.stripe.com/v1/payment_intents/search?" + new URLSearchParams({ query: q, limit: "10" }).toString();
    const resp = await fetch(url, { headers: { Authorization: "Bearer " + stripeKey } });
    const json = (await resp.json()) as { data?: Array<{ id: string; amount?: number; created?: number }>; error?: { message?: string } };
    if (!resp.ok) {
      await logError("processConsultOutcome", json.error?.message || "Stripe PI search failed", { appointmentId, query: q });
      continue;
    }
    if (json.data && json.data.length > 0) {
      // Prefer most recent.
      const sorted = [...json.data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
      return sorted[0].id;
    }
  }

  // Fallback: search Customers by email, then list their PaymentIntents.
  if (email) {
    const custUrl = "https://api.stripe.com/v1/customers/search?" + new URLSearchParams({ query: `email:"${email}"`, limit: "5" }).toString();
    const custResp = await fetch(custUrl, { headers: { Authorization: "Bearer " + stripeKey } });
    const custJson = (await custResp.json()) as { data?: Array<{ id: string }>; error?: { message?: string } };
    if (custResp.ok && custJson.data && custJson.data.length > 0) {
      for (const cust of custJson.data) {
        const piUrl = "https://api.stripe.com/v1/payment_intents?" + new URLSearchParams({ customer: cust.id, limit: "10" }).toString();
        const piResp = await fetch(piUrl, { headers: { Authorization: "Bearer " + stripeKey } });
        const piJson = (await piResp.json()) as { data?: Array<{ id: string; status?: string; created?: number }>; error?: { message?: string } };
        if (piResp.ok && piJson.data) {
          const succeeded = piJson.data.filter((pi) => pi.status === "succeeded").sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
          if (succeeded.length > 0) return succeeded[0].id;
        }
      }
    }
  }

  // Last resort: list recent charges and match by billing phone.
  if (phone) {
    const targetPhone = normalizePhone(phone);
    const chUrl = "https://api.stripe.com/v1/charges?" + new URLSearchParams({ limit: "100" }).toString();
    const chResp = await fetch(chUrl, { headers: { Authorization: "Bearer " + stripeKey } });
    const chJson = (await chResp.json()) as { data?: Array<{ id: string; status?: string; payment_intent?: string | null; billing_details?: { phone?: string | null; email?: string | null } }>; error?: { message?: string } };
    if (chResp.ok && chJson.data) {
      for (const ch of chJson.data) {
        if (ch.status !== "succeeded" || !ch.payment_intent) continue;
        const chPhone = normalizePhone(ch.billing_details?.phone ?? "");
        const chEmail = (ch.billing_details?.email ?? "").toLowerCase();
        if ((chPhone && chPhone.endsWith(targetPhone.slice(-9))) || (email && chEmail === email.toLowerCase())) {
          return typeof ch.payment_intent === "string" ? ch.payment_intent : null;
        }
      }
    }
  }

  return null;
}

async function findPaidDepositPaymentIntent(stripeKey: string, leadId: string | null, appointmentId: string) {
  if (!leadId) {
    return null;
  }

  const supabaseAdmin = await getSupabaseAdmin();

  // 1. Fastest path — the charge-over-phone flow already saves the PI on the
  // lead row. It never creates a Checkout Session, so the SMS/session
  // fallbacks below can't recover it. Check this before hitting Stripe.
  const { data: leadRow } = await supabaseAdmin
    .from("meta_leads")
    .select("email, phone, stripe_payment_intent_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadRow?.stripe_payment_intent_id) {
    // Verify it's actually succeeded before returning (defensive — a failed
    // PI could theoretically be stored, though the current write path only
    // sets it after status === "succeeded").
    try {
      const verifyResp = await fetch(
        `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(leadRow.stripe_payment_intent_id)}`,
        { headers: { Authorization: "Bearer " + stripeKey } },
      );
      const verifyJson = (await verifyResp.json()) as { status?: string };
      if (verifyResp.ok && verifyJson.status === "succeeded") {
        return leadRow.stripe_payment_intent_id;
      }
    } catch { /* fall through to other lookups */ }
  }

  // 2. Search Stripe PIs by metadata.lead_id — covers charge-over-phone PIs
  // (which set metadata[lead_id]) even if the lead row somehow lost the ID.
  try {
    const q = `status:"succeeded" AND metadata["lead_id"]:"${leadId}"`;
    const url = "https://api.stripe.com/v1/payment_intents/search?" + new URLSearchParams({ query: q, limit: "10" }).toString();
    const resp = await fetch(url, { headers: { Authorization: "Bearer " + stripeKey } });
    const json = (await resp.json()) as { data?: Array<{ id: string; created?: number }>; error?: { message?: string } };
    if (resp.ok && json.data && json.data.length > 0) {
      const sorted = [...json.data].sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
      return sorted[0].id;
    }
    if (!resp.ok) {
      await logError("processConsultOutcome", json.error?.message || "Stripe PI metadata search failed", { appointmentId, leadId });
    }
  } catch { /* fall through */ }

  // 3. Original path — look for the Stripe Checkout Session link we texted.
  const { data: smsRows } = await supabaseAdmin
    .from("sms_messages")
    .select("body")
    .eq("lead_id", leadId)
    .ilike("body", "%checkout.stripe.com%")
    .order("created_at", { ascending: false })
    .limit(10);

  const sessionIds = Array.from(new Set(
    (smsRows ?? [])
      .map((row) => row.body?.match(/cs_(?:live|test)_[A-Za-z0-9]+/)?.[0])
      .filter((id): id is string => Boolean(id))
  ));

  for (const sessionId of sessionIds) {
    const sessionResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: "GET",
      headers: { Authorization: "Bearer " + stripeKey },
    });
    const session = (await sessionResponse.json()) as { payment_status?: string; payment_intent?: string | { id?: string }; error?: { message?: string } };
    if (!sessionResponse.ok) {
      await logError("processConsultOutcome", session.error?.message || "Stripe session retrieve failed", { appointmentId, leadId, sessionId });
      continue;
    }
    if (session.payment_status === "paid" && session.payment_intent) {
      const intent = session.payment_intent;
      return typeof intent === "string" ? intent : intent.id || null;
    }
  }

  const params = new URLSearchParams();
  params.append("limit", "20");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions?" + params.toString(), {
    method: "GET",
    headers: { Authorization: "Bearer " + stripeKey },
  });

  const result = (await response.json()) as {
    data?: Array<{ id: string; payment_status?: string; payment_intent?: string | { id?: string }; metadata?: Record<string, string> }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    const errMsg = result?.error?.message || "Stripe session lookup failed";
    await logError("processConsultOutcome", errMsg, { appointmentId, leadId, rawResponse: result });
    return null;
  }

  const session = result.data?.find((s) => s.payment_status === "paid" && s.metadata?.lead_id === leadId && s.payment_intent);
  const intent = session?.payment_intent;
  const fromSession = typeof intent === "string" ? intent : intent?.id || null;
  if (fromSession) return fromSession;

  // Final fallback: search Stripe directly by the lead's email/phone
  // (reuses the lead row we already fetched at the top of this function).
  return await searchStripeByContact(stripeKey, leadRow?.email ?? null, leadRow?.phone ?? null, appointmentId);
}

type SupabaseAdmin = Awaited<ReturnType<typeof getSupabaseAdmin>>;

/**
 * Shared refund settlement for any path that records an attended outcome
 * (clinic portal "showed", Numbers page one-tap chip, disqualification).
 *
 * Safe to re-run: the Square refund uses the deterministic idempotency key
 * `refund-<appointmentId>`, so a repeat call returns the original refund
 * instead of sending a second one. That makes this both the refund and the
 * repair path when a previous attempt refunded the money but died before
 * writing the result back.
 */
export async function settleAppointmentRefund(
  appointmentId: string,
  reason: string,
  source: string,
): Promise<
  | { status: "already"; }
  | { status: "manual"; reason: string }
  | { status: "failed"; error: string }
  | { status: "refunded"; refundId: string; pending: boolean }
> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: appt } = await supabaseAdmin
    .from("clinic_appointments")
    .select(
      "id, lead_id, stripe_payment_intent_id, square_payment_id, payment_processor, stripe_refund_id, square_refund_id, refund_status, deposit_amount",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return { status: "failed", error: "Appointment not found" };
  if (appt.stripe_refund_id || appt.square_refund_id) return { status: "already" };

  const payment = await resolveDepositForAppointment(supabaseAdmin, appt);
  if (!payment) {
    await supabaseAdmin
      .from("clinic_appointments")
      .update({ refund_status: "manual_required" })
      .eq("id", appointmentId);
    return { status: "manual", reason: "No card payment on file for this booking." };
  }

  // Mark the attempt BEFORE talking to the processor. If this request dies
  // mid-flight the row shows refund_pending instead of looking untouched.
  await supabaseAdmin
    .from("clinic_appointments")
    .update({ refund_status: "refund_pending" })
    .eq("id", appointmentId)
    .is("square_refund_id", null)
    .is("stripe_refund_id", null);

  const { refundDeposit } = await import("./deposit-refund.server");
  const { sendRefundFailureAlert } = await import("./ops-alert.server");
  const outcome = await refundDeposit(payment.paymentId, appointmentId, payment.processor, {
    amountCents: payment.depositAmount != null ? Math.round(payment.depositAmount * 100) : null,
    reason,
  });

  if (outcome.status === "manual" || outcome.status === "failed") {
    const message = outcome.status === "manual" ? outcome.reason : outcome.error;
    await supabaseAdmin
      .from("clinic_appointments")
      .update({ refund_status: outcome.status === "manual" ? "manual_required" : "failed" })
      .eq("id", appointmentId);
    await logError(source, message, { appointmentId, paymentId: payment.paymentId });
    await sendRefundFailureAlert({
      leadId: appt.lead_id,
      appointmentId,
      processor: payment.processor,
      paymentId: payment.paymentId,
      error: message,
    });
    return outcome.status === "manual"
      ? { status: "manual", reason: message }
      : { status: "failed", error: message };
  }

  const isSquare = payment.processor === "square";
  const pending = outcome.status === "pending";
  await supabaseAdmin
    .from("clinic_appointments")
    .update({
      refund_status: pending ? "refund_pending" : "refunded",
      ...(isSquare ? { square_refund_id: outcome.refundId } : { stripe_refund_id: outcome.refundId }),
      ...(pending ? {} : { refund_processed_at: new Date().toISOString() }),
    })
    .eq("id", appointmentId);

  return { status: "refunded", refundId: outcome.refundId, pending };
}

type DepositPayment = {
  processor: "stripe" | "square";
  paymentId: string;
  depositAmount: number | null;
};

type ApptDepositRow = {
  id: string;
  lead_id: string | null;
  stripe_payment_intent_id: string | null;
  square_payment_id: string | null;
  payment_processor: string | null;
  deposit_amount: number | null;
};

// Works out how the patient actually paid so the refund goes back the same
// way. Order of trust: what is stamped on the appointment, then the lead row
// (a deposit paid before the booking row existed), then the Stripe lookups
// for old bookings. Whatever it finds is written onto the appointment so the
// next read is instant and every refund path agrees on the processor.
async function resolveDepositForAppointment(
  supabaseAdmin: SupabaseAdmin,
  appt: ApptDepositRow,
): Promise<DepositPayment | null> {
  if (appt.square_payment_id) {
    return { processor: "square", paymentId: appt.square_payment_id, depositAmount: appt.deposit_amount };
  }
  if (appt.stripe_payment_intent_id) {
    return { processor: "stripe", paymentId: appt.stripe_payment_intent_id, depositAmount: appt.deposit_amount };
  }

  const stamp = async (patch: Database["public"]["Tables"]["clinic_appointments"]["Update"]) => {
    await supabaseAdmin
      .from("clinic_appointments")
      .update(patch)
      .eq("id", appt.id)
      .is("stripe_refund_id", null)
      .is("square_refund_id", null);
  };
  const amountPatch = (amount: number | null): { deposit_amount?: number } =>
    amount != null ? { deposit_amount: amount } : {};

  if (appt.lead_id) {
    const { data: lead } = await supabaseAdmin
      .from("meta_leads")
      .select("square_payment_id, stripe_payment_intent_id, deposit_amount")
      .eq("id", appt.lead_id)
      .maybeSingle();
    const depositAmount = appt.deposit_amount ?? lead?.deposit_amount ?? null;
    if (lead?.square_payment_id) {
      await stamp({ square_payment_id: lead.square_payment_id, payment_processor: "square", ...amountPatch(depositAmount) });
      return { processor: "square", paymentId: lead.square_payment_id, depositAmount };
    }
    if (lead?.stripe_payment_intent_id) {
      await stamp({ stripe_payment_intent_id: lead.stripe_payment_intent_id, payment_processor: "stripe", ...amountPatch(depositAmount) });
      return { processor: "stripe", paymentId: lead.stripe_payment_intent_id, depositAmount };
    }
  }

  // Old bookings with nothing saved anywhere: recover the Stripe payment
  // (managed account first, then the legacy HTG account).
  const { findManagedDepositPaymentIntent } = await import("./deposit-refund.server");
  const htgKey = process.env.STRIPE_HTG_SECRET_KEY;
  let paymentId = await findManagedDepositPaymentIntent(appt.lead_id);
  if (!paymentId && htgKey) {
    paymentId = await findPaidDepositPaymentIntent(htgKey, appt.lead_id, appt.id);
  }
  if (!paymentId) return null;

  let depositAmount: number | null = appt.deposit_amount;
  if (depositAmount == null && htgKey) {
    try {
      const piResp = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: "Bearer " + htgKey },
      });
      const pi = (await piResp.json()) as { amount_received?: number; amount?: number };
      const cents = piResp.ok ? (pi.amount_received ?? pi.amount ?? null) : null;
      if (typeof cents === "number") depositAmount = cents / 100;
    } catch { /* amount stays unknown; UI falls back to the clinic default */ }
  }
  await stamp({ stripe_payment_intent_id: paymentId, payment_processor: "stripe", ...amountPatch(depositAmount) });
  return { processor: "stripe", paymentId, depositAmount };
}

// Marks a clinic appointment as "show" or "proceeded" and refunds the
// patient's deposit through whichever processor took it (Square or Stripe). The deposit is always
// refunded once the patient shows up — whether they proceeded with the
// procedure or not. The only no-refund path is "no show" (handled
// elsewhere) or when the refund was already processed.
//
// Hard rules:
// - Re-fetches the appointment server-side and refuses to double-refund
//   if stripe_refund_id is already set.
// - Outcome + summary are saved even if the refund call fails.
// - On refund failure, sets refund_status='failed' but leaves
//   stripe_refund_id null so the user can retry.
export const processConsultOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ProcessInput) => data)
  .handler(async ({ data }) => {
    const { appointmentId, summary, proceeded } = data;
    const supabaseAdmin = await getSupabaseAdmin();

    // 1. Re-fetch authoritative appointment state.
    const { data: appt, error: fetchErr } = await supabaseAdmin
      .from("clinic_appointments")
      .select(
        "id, clinic_id, lead_id, stripe_payment_intent_id, stripe_refund_id, refund_status, deposit_amount, payment_processor, square_payment_id, square_refund_id",
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchErr || !appt) {
      return { success: false as const, error: fetchErr?.message || "Appointment not found" };
    }

    const trimmedSummary = summary?.trim() || null;
    const newOutcome = proceeded ? "proceeded" : "show";

    // 2. Save outcome + summary first.
    const { error: updateErr } = await supabaseAdmin
      .from("clinic_appointments")
      .update({ outcome: newOutcome, consult_summary: trimmedSummary })
      .eq("id", appointmentId);

    if (updateErr) {
      return { success: false as const, error: updateErr.message };
    }

    // 3. If already refunded previously, don't try again — just confirm.
    if (appt.stripe_refund_id || appt.square_refund_id) {
      return { success: true as const, refunded: false as const };
    }

    const { refundDeposit } = await import("./deposit-refund.server");
    const { sendRefundFailureAlert } = await import("./ops-alert.server");

    const payment = await resolveDepositForAppointment(supabaseAdmin, appt);

    if (!payment) {
      // No processor path exists — this needs a bank transfer, which is a
      // different thing from a processor error.
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "manual_required" })
        .eq("id", appointmentId);
      return { success: true as const, refunded: false as const, manual: true as const };
    }

    const isSquare = payment.processor === "square";
    const paymentId = payment.paymentId;

    const outcome = await refundDeposit(paymentId, appointmentId, payment.processor, {
      amountCents: payment.depositAmount != null ? Math.round(payment.depositAmount * 100) : null,
    });

    if (outcome.status === "manual") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "manual_required" })
        .eq("id", appointmentId);
      await logError("processConsultOutcome", `Manual refund required: ${outcome.reason}`, {
        appointmentId,
        paymentIntentId: paymentId,
      });
      await sendRefundFailureAlert({
        leadId: appt.lead_id,
        appointmentId,
        processor: isSquare ? "square" : "stripe",
        paymentId,
        error: outcome.reason,
      });
      return {
        success: true as const,
        refunded: false as const,
        manual: true as const,
        manualReason: outcome.reason,
      };
    }

    if (outcome.status === "failed") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "failed" })
        .eq("id", appointmentId);
      await logError("processConsultOutcome", outcome.error, {
        appointmentId,
        paymentIntentId: paymentId,
      });
      await sendRefundFailureAlert({
        leadId: appt.lead_id,
        appointmentId,
        processor: isSquare ? "square" : "stripe",
        paymentId,
        error: outcome.error,
      });
      return { success: false as const, error: outcome.error, outcomeSaved: true as const };
    }

    // Square accepts the refund then settles asynchronously; refund.updated
    // flips it to 'refunded' and stamps refund_processed_at.
    if (outcome.status === "pending") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "refund_pending", square_refund_id: outcome.refundId })
        .eq("id", appointmentId);
      return {
        success: true as const,
        refunded: true as const,
        refundId: outcome.refundId,
        refundProcessedAt: null,
      };
    }

    const processedAt = new Date().toISOString();
    await supabaseAdmin
      .from("clinic_appointments")
      .update({
        refund_status: "refunded",
        ...(isSquare
          ? { square_refund_id: outcome.refundId }
          : { stripe_refund_id: outcome.refundId }),
        refund_processed_at: processedAt,
      })
      .eq("id", appointmentId);

    return {
      success: true as const,
      refunded: true as const,
      refundId: outcome.refundId,
      refundProcessedAt: processedAt as string | null,
    };
  });


// Lazy-resolve how the deposit was paid (Square or Stripe) plus the amount
// for an appointment whose row never had the payment id written at booking
// time (e.g. deposit paid via a link, then the booking row created later).
// The clinic-portal "show" modal calls this when it opens so the refund
// button reflects the real processor instead of a "didn't pay" notice.
export const resolveAppointmentDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string }) => data)
  .handler(async ({ data }) => {
    const { appointmentId } = data;
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: appt } = await supabaseAdmin
      .from("clinic_appointments")
      .select("id, lead_id, stripe_payment_intent_id, square_payment_id, payment_processor, deposit_amount")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appt) return { success: false as const, error: "Appointment not found" };

    const payment = await resolveDepositForAppointment(supabaseAdmin, appt);
    if (!payment) {
      return { success: true as const, processor: null, paymentId: null, depositAmount: null };
    }
    return {
      success: true as const,
      processor: payment.processor,
      paymentId: payment.paymentId,
      depositAmount: payment.depositAmount,
    };
  });

// Admin-only: mark an appointment as "disqualified" — patient showed up
// but was not a valid candidate per the clinic. Does NOT count toward the
// clinic's pack quota. Refunds the deposit if not already refunded.
// Requires a written reason (audit trail so clinics can't quietly weaponise
// this to dodge their pack numbers).
export const disqualifyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { appointmentId: string; reason: string }) => data)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) return { success: false as const, error: "Not signed in" };

    // Admin gate — same pattern as listRepBookingsWithRecordings.
    const { data: me } = await supabaseAdmin
      .from("sales_reps")
      .select("role")
      .ilike("email", email)
      .maybeSingle();
    if (me?.role !== "admin") {
      return { success: false as const, error: "Forbidden — admin only" };
    }

    const reason = data.reason?.trim();
    if (!reason || reason.length < 5) {
      return { success: false as const, error: "Reason is required (min 5 chars)" };
    }

    const { data: appt, error: fetchErr } = await supabaseAdmin
      .from("clinic_appointments")
      .select(
        "id, lead_id, stripe_payment_intent_id, square_payment_id, payment_processor, stripe_refund_id, square_refund_id, refund_status, outcome, deposit_amount",
      )
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (fetchErr || !appt) {
      return { success: false as const, error: fetchErr?.message || "Appointment not found" };
    }

    // Flip outcome + audit fields.
    const { error: updateErr } = await supabaseAdmin
      .from("clinic_appointments")
      .update({
        outcome: "disqualified",
        disqualified_reason: reason,
        disqualified_at: new Date().toISOString(),
        disqualified_by: context.userId,
      })
      .eq("id", data.appointmentId);
    if (updateErr) return { success: false as const, error: updateErr.message };

    const { data: saved, error: verifyErr } = await supabaseAdmin
      .from("clinic_appointments")
      .select("outcome, disqualified_reason")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (verifyErr || saved?.outcome !== "disqualified" || saved.disqualified_reason !== reason) {
      return {
        success: false as const,
        error: verifyErr?.message || "Disqualification did not save correctly",
      };
    }

    // Refund the deposit if it hasn't been refunded already.
    if (appt.stripe_refund_id || appt.square_refund_id) {
      return { success: true as const, refunded: false as const, alreadyRefunded: true as const };
    }

    const payment = await resolveDepositForAppointment(supabaseAdmin, appt);
    if (!payment) {
      // No card payment on file — admin marks the manual refund separately.
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "manual_required" })
        .eq("id", data.appointmentId);
      return { success: true as const, refunded: false as const, manual: true as const };
    }

    const { refundDeposit } = await import("./deposit-refund.server");
    const { sendRefundFailureAlert } = await import("./ops-alert.server");
    const outcome = await refundDeposit(payment.paymentId, data.appointmentId, payment.processor, {
      amountCents: payment.depositAmount != null ? Math.round(payment.depositAmount * 100) : null,
      reason: "Disqualified at consultation — booking fee refund",
    });

    if (outcome.status === "manual") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "manual_required" })
        .eq("id", data.appointmentId);
      await logError("disqualifyAppointment", `Manual refund required: ${outcome.reason}`, {
        appointmentId: data.appointmentId,
        paymentId: payment.paymentId,
      });
      await sendRefundFailureAlert({
        leadId: appt.lead_id,
        appointmentId: data.appointmentId,
        processor: payment.processor,
        paymentId: payment.paymentId,
        error: outcome.reason,
      });
      return { success: true as const, refunded: false as const, manual: true as const, manualReason: outcome.reason };
    }

    if (outcome.status === "failed") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "failed" })
        .eq("id", data.appointmentId);
      await logError("disqualifyAppointment", outcome.error, {
        appointmentId: data.appointmentId,
        paymentId: payment.paymentId,
      });
      await sendRefundFailureAlert({
        leadId: appt.lead_id,
        appointmentId: data.appointmentId,
        processor: payment.processor,
        paymentId: payment.paymentId,
        error: outcome.error,
      });
      return { success: false as const, error: outcome.error, outcomeSaved: true as const };
    }

    if (outcome.status === "pending") {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "refund_pending", square_refund_id: outcome.refundId })
        .eq("id", data.appointmentId);
      return { success: true as const, refunded: true as const, refundId: outcome.refundId, pending: true as const };
    }

    await supabaseAdmin
      .from("clinic_appointments")
      .update({
        refund_status: "refunded",
        ...(payment.processor === "square"
          ? { square_refund_id: outcome.refundId }
          : { stripe_refund_id: outcome.refundId }),
        refund_processed_at: new Date().toISOString(),
      })
      .eq("id", data.appointmentId);

    return { success: true as const, refunded: true as const, refundId: outcome.refundId };
  });

