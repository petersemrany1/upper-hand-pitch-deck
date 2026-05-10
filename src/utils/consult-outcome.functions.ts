import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logError } from "./error-logger.functions";

type ProcessInput = {
  appointmentId: string;
  summary: string;
  proceeded: boolean;
};

async function findPaidDepositPaymentIntent(stripeKey: string, leadId: string | null, appointmentId: string) {
  if (!leadId) return null;

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
  return typeof intent === "string" ? intent : intent?.id || null;
}

// Marks a clinic appointment as "show" or "proceeded" and, when not proceeded,
// refunds the patient's deposit on the HTG Stripe account.
//
// Hard rules:
// - Re-fetches the appointment server-side and refuses to refund if
//   stripe_refund_id is already set (double-refund prevention).
// - Outcome + summary are saved even if the refund call fails.
// - On refund failure, sets refund_status='failed' but leaves
//   stripe_refund_id null so the user can retry.
export const processConsultOutcome = createServerFn({ method: "POST" })
  .inputValidator((data: ProcessInput) => data)
  .handler(async ({ data }) => {
    const { appointmentId, summary, proceeded } = data;

    // 1. Re-fetch authoritative appointment state.
    const { data: appt, error: fetchErr } = await supabaseAdmin
      .from("clinic_appointments")
      .select("id, clinic_id, lead_id, stripe_payment_intent_id, stripe_refund_id, refund_status, deposit_amount")
      .eq("id", appointmentId)
      .maybeSingle();

    if (fetchErr || !appt) {
      return { success: false as const, error: fetchErr?.message || "Appointment not found" };
    }

    if (!proceeded && appt.stripe_refund_id) {
      return { success: false as const, error: "Refund already processed for this appointment" };
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

    // 3. If proceeded, no refund.
    if (proceeded) {
      return { success: true as const, refunded: false as const };
    }

    // 4. Fire Stripe refund. If older bookings don't have the payment ID saved,
    // recover it from the latest paid HTG Checkout Sessions using the lead ID.
    const stripeKey = process.env.STRIPE_HTG_SECRET_KEY;
    if (!stripeKey) {
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "failed" })
        .eq("id", appointmentId);
      await logError("processConsultOutcome", "STRIPE_HTG_SECRET_KEY not configured", { appointmentId });
      return { success: false as const, error: "Stripe is not configured — contact admin", outcomeSaved: true as const };
    }

    let paymentIntentId = appt.stripe_payment_intent_id;
    if (!paymentIntentId) {
      paymentIntentId = await findPaidDepositPaymentIntent(stripeKey, appt.lead_id, appointmentId);
      if (paymentIntentId) {
        await supabaseAdmin
          .from("clinic_appointments")
          .update({ stripe_payment_intent_id: paymentIntentId })
          .eq("id", appointmentId)
          .is("stripe_refund_id", null);
      }
    }

    if (!paymentIntentId) {
      return { success: true as const, refunded: false as const, manual: true as const };
    }

    try {
      const params = new URLSearchParams();
      params.append("payment_intent", paymentIntentId);
      params.append("metadata[appointment_id]", appointmentId);

      const response = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + stripeKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const result = (await response.json()) as { id?: string; error?: { message?: string } };

      if (!response.ok || !result.id) {
        const errMsg = result?.error?.message || "Stripe refund failed";
        await supabaseAdmin
          .from("clinic_appointments")
          .update({ refund_status: "failed" })
          .eq("id", appointmentId);
        await logError("processConsultOutcome", errMsg, { appointmentId, rawResponse: result });
        return { success: false as const, error: errMsg, outcomeSaved: true as const };
      }

      const processedAt = new Date().toISOString();
      await supabaseAdmin
        .from("clinic_appointments")
        .update({
          refund_status: "refunded",
          stripe_refund_id: result.id,
          refund_processed_at: processedAt,
        })
        .eq("id", appointmentId);

      return {
        success: true as const,
        refunded: true as const,
        refundId: result.id,
        refundProcessedAt: processedAt,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await supabaseAdmin
        .from("clinic_appointments")
        .update({ refund_status: "failed" })
        .eq("id", appointmentId);
      await logError("processConsultOutcome", errMsg, { appointmentId });
      return { success: false as const, error: errMsg, outcomeSaved: true as const };
    }
  });
