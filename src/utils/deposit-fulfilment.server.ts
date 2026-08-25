import { createClient } from "@supabase/supabase-js";

type StripeCheckoutSession = {
  id: string;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  metadata?: Record<string, string> | null;
};

/**
 * Business logic for a paid $75 booking fee.
 *
 * Per project rule (mem://rules/lead-status-no-auto-change) this only writes
 * the deposit_* columns; the status is only flipped to booked_deposit_paid when
 * an appointment row already exists (the DB trigger requires it).
 */
export async function fulfilDepositPayment(
  session: StripeCheckoutSession,
  origin: string,
): Promise<{ ok: boolean; detail: string }> {
  const leadId = session.metadata?.lead_id;
  if (!leadId) return { ok: false, detail: "no lead_id in metadata" };

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { ok: false, detail: "supabase env missing" };

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase
    .from("meta_leads")
    .select("id, deposit_paid_at, stripe_checkout_session_id, first_name, last_name, rep_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!existing) return { ok: false, detail: "lead not found" };

  // Idempotency — Stripe retries and sends both sync + async events.
  if (existing.deposit_paid_at && existing.stripe_checkout_session_id === session.id) {
    return { ok: true, detail: "already processed" };
  }

  const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : null;

  const { error: updErr } = await supabase
    .from("meta_leads")
    .update({
      deposit_paid_at: new Date().toISOString(),
      deposit_amount: amount,
      stripe_payment_intent_id: session.payment_intent ?? null,
      stripe_checkout_session_id: session.id,
    })
    .eq("id", leadId);

  if (updErr) return { ok: false, detail: `meta_leads update failed: ${updErr.message}` };

  // Backfill the appointment and flip status only when a booking exists.
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
          stripe_payment_intent_id: session.payment_intent ?? null,
          deposit_amount: amount,
        })
        .eq("lead_id", leadId)
        .is("stripe_payment_intent_id", null);

      const { error: statusErr } = await supabase
        .from("meta_leads")
        .update({ status: "booked_deposit_paid" })
        .eq("id", leadId)
        .neq("status", "booked_deposit_paid");
      if (statusErr) console.warn("deposit fulfilment: status flip failed", statusErr);
    }
  } catch (e) {
    console.warn("deposit fulfilment: appointment/status update non-fatal error", e);
  }

  // Best-effort ops notification.
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
        ? `$${amount.toFixed(2)} ${(session.currency || "AUD").toUpperCase()}`
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
        recipientEmail: "peter@gobold.com.au",
        idempotencyKey: `payment-received-${session.id}`,
        templateData: { amount: amountLabel, patientName, repName, leadId, paidAt },
      }),
    });
    if (!res.ok) {
      console.warn("deposit fulfilment: notify email failed", res.status, await res.text());
    }
  } catch (e) {
    console.warn("deposit fulfilment: notify email error", e);
  }

  return { ok: true, detail: "credited" };
}
