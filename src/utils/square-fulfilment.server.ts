import { createClient } from "@supabase/supabase-js";
import type { SquarePayment } from "@/lib/square.server";
import { opsAlertEmail } from "@/utils/ops-alert.server";

/**
 * Business logic for a paid $75 booking fee taken on Square.
 *
 * Mirrors fulfilDepositPayment (Stripe) exactly: per project rule
 * (mem://rules/lead-status-no-auto-change) it only writes the deposit_*
 * columns, and only flips the status to booked_deposit_paid when an
 * appointment row already exists.
 */
export async function fulfilSquareDeposit(
  payment: SquarePayment,
  origin: string,
): Promise<{ ok: boolean; detail: string }> {
  const leadId = payment.reference_id;
  if (!leadId) return { ok: false, detail: "no reference_id on payment" };

  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceKey) return { ok: false, detail: "supabase env missing" };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase
    .from("meta_leads")
    .select("id, deposit_paid_at, square_payment_id, first_name, last_name, rep_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!existing) return { ok: false, detail: "lead not found" };

  // Idempotency — Square retries webhooks and the browser also fulfils inline.
  if (existing.deposit_paid_at && existing.square_payment_id === payment.id) {
    return { ok: true, detail: "already processed" };
  }

  const amount =
    typeof payment.amount_money?.amount === "number" ? payment.amount_money.amount / 100 : null;

  const { error: updErr } = await supabase
    .from("meta_leads")
    .update({
      deposit_paid_at: new Date().toISOString(),
      deposit_amount: amount,
      square_payment_id: payment.id,
      square_order_id: payment.order_id ?? null,
      payment_processor: "square",
    })
    .eq("id", leadId);

  if (updErr) return { ok: false, detail: `meta_leads update failed: ${updErr.message}` };

  try {
    const { data: appt } = await supabase
      .from("clinic_appointments")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (appt) {
      await supabase
        .from("clinic_appointments")
        .update({
          square_payment_id: payment.id,
          payment_processor: "square",
          deposit_amount: amount,
        })
        .eq("lead_id", leadId)
        .is("square_payment_id", null);

      const { error: statusErr } = await supabase
        .from("meta_leads")
        .update({ status: "booked_deposit_paid" })
        .eq("id", leadId)
        .neq("status", "booked_deposit_paid");
      if (statusErr) console.warn("square fulfilment: status flip failed", statusErr);
    }
  } catch (e) {
    console.warn("square fulfilment: appointment/status update non-fatal error", e);
  }

  // Best-effort ops notification — same template + idempotency scheme as Stripe.
  try {
    const patientName =
      [existing.first_name, existing.last_name].filter(Boolean).join(" ").trim() || null;

    let repName: string | null = null;
    if (existing.rep_id) {
      const { data: rep } = await supabase
        .from("sales_reps")
        .select("name, email")
        .eq("id", existing.rep_id)
        .maybeSingle();
      repName = rep?.name || rep?.email || null;
    }

    const amountLabel =
      typeof amount === "number"
        ? `$${amount.toFixed(2)} ${(payment.amount_money?.currency || "AUD").toUpperCase()}`
        : null;

    const paidAt = new Date().toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Sydney",
    });

    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: "payment-received",
        recipientEmail: opsAlertEmail(),
        idempotencyKey: `payment-received-${payment.id}`,
        templateData: { amount: amountLabel, patientName, repName, leadId, paidAt },
      }),
    });
    if (!res.ok) {
      console.warn("square fulfilment: notify email failed", res.status, await res.text());
    }
  } catch (e) {
    console.warn("square fulfilment: notify email error", e);
  }

  return { ok: true, detail: "credited" };
}

/** Handles refund.updated transitions for Square refunds. */
export async function applySquareRefundUpdate(refund: {
  id: string;
  status: string;
  payment_id?: string | null;
}): Promise<{ ok: boolean; detail: string }> {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceKey) return { ok: false, detail: "supabase env missing" };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: appt } = await supabase
    .from("clinic_appointments")
    .select("id, lead_id, refund_status, square_refund_id, square_payment_id")
    .eq("square_refund_id", refund.id)
    .maybeSingle();

  if (!appt) return { ok: true, detail: "no appointment for refund id" };

  const status = refund.status?.toUpperCase();

  if (status === "COMPLETED") {
    if (appt.refund_status === "refunded") return { ok: true, detail: "already refunded" };
    const { error } = await supabase
      .from("clinic_appointments")
      .update({ refund_status: "refunded", refund_processed_at: new Date().toISOString() })
      .eq("id", appt.id);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: "refunded" };
  }

  if (status === "FAILED" || status === "REJECTED") {
    if (appt.refund_status === "failed") return { ok: true, detail: "already failed" };
    await supabase
      .from("clinic_appointments")
      .update({ refund_status: "failed" })
      .eq("id", appt.id);

    let patientName: string | null = null;
    if (appt.lead_id) {
      const { data: lead } = await supabase
        .from("meta_leads")
        .select("first_name, last_name")
        .eq("id", appt.lead_id)
        .maybeSingle();
      patientName =
        [lead?.first_name, lead?.last_name].filter(Boolean).join(" ").trim() || null;
    }

    const { sendRefundFailureAlert } = await import("@/utils/ops-alert.server");
    await sendRefundFailureAlert({
      patientName,
      leadId: appt.lead_id,
      appointmentId: appt.id,
      processor: "square",
      paymentId: appt.square_payment_id,
      refundId: refund.id,
      error: `Square reported refund ${status}`,
    });
    return { ok: true, detail: "failed" };
  }

  return { ok: true, detail: `ignored status ${status}` };
}
