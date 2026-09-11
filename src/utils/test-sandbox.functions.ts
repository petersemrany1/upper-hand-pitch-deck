// Test-sandbox-only server functions for the Peter Test lead.
// Hard-gated to: (a) admin role, (b) the PETER_TEST_LEAD_ID constant.
// Never callable against a real lead.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PETER_TEST_LEAD_ID = "5e70f557-73ce-4bb7-a11a-6b718dbd092f";
const TEST_TESTED_LEAD_ID = "b2828129-1c28-4502-927a-11f43a0a8473";
const ALLOWED_TEST_LEAD_IDS = new Set([PETER_TEST_LEAD_ID, TEST_TESTED_LEAD_ID]);

async function assertAdminAndPeter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  leadId: string,
) {
  if (!ALLOWED_TEST_LEAD_IDS.has(leadId)) {
    throw new Error("Test sandbox functions only allowed on test leads.");
  }
  const { data: isAdmin, error } = await supabase.rpc("is_admin_user");
  if (error) throw error;
  if (!isAdmin) throw new Error("Forbidden: admin only.");
}

/**
 * Simulate the Stripe deposit webhook for Peter Test.
 * Mirrors the writes done by /api/public/hooks/stripe-deposit:
 *  - meta_leads.deposit_paid_at / deposit_amount / stripe_* fields
 *  - clinic_appointments test booking + deposit fields
 * Does NOT send the ops notification email (test mode).
 * Explicit sandbox button click promotes status to booked_deposit_paid.
 */
export const simulateDepositPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdminAndPeter(supabase, data.leadId);

    const fakeSessionId = `cs_test_sim_${Date.now()}`;
    const fakePiId = `pi_test_sim_${Date.now()}`;
    const amount = 75;

    const { error: updErr } = await supabase
      .from("meta_leads")
      .update({
        deposit_paid_at: new Date().toISOString(),
        deposit_amount: amount,
        stripe_payment_intent_id: fakePiId,
        stripe_checkout_session_id: fakeSessionId,
      })
      .eq("id", data.leadId);
    if (updErr) throw updErr;

    // Behave like a real Stripe payment: record the money only. We never
    // invent a booking here — the rep still has to pick clinic, doctor, date
    // and time in the portal, exactly like a live call.
    const { data: existingAppt, error: apptLookupErr } = await supabase
      .from("clinic_appointments")
      .select("id")
      .eq("lead_id", data.leadId)
      .maybeSingle();
    if (apptLookupErr) throw apptLookupErr;

    if (existingAppt) {
      // A booking already exists (rep booked first, then payment landed):
      // attach the payment and promote the status, like the webhook does.
      await supabase
        .from("clinic_appointments")
        .update({
          stripe_payment_intent_id: fakePiId,
          deposit_amount: amount,
        })
        .eq("lead_id", data.leadId)
        .is("stripe_payment_intent_id", null);

      const { error: statusErr } = await supabase
        .from("meta_leads")
        .update({ status: "booked_deposit_paid" })
        .eq("id", data.leadId)
        .neq("status", "booked_deposit_paid");
      if (statusErr) {
        console.warn("simulateDepositPaid: status flip failed", statusErr);
      }
    }

    return {
      ok: true,
      simulated: true,
      sessionId: fakeSessionId,
      statusFlipped: Boolean(existingAppt),
      needsBooking: !existingAppt,
    };
  });

/**
 * Reset Peter Test back to a clean intake-stage lead.
 * Scope (per user spec): payment + status only.
 *  - clears deposit_* and stripe_* fields on meta_leads
 *  - sets status back to 'intake'
 * Notes, call records, appointments, sent links etc. are left alone.
 */
export const resetPeterTestLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leadId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdminAndPeter(supabase, data.leadId);

    const { error } = await supabase
      .from("meta_leads")
      .update({
        status: "intake",
        deposit_paid_at: null,
        deposit_amount: null,
        stripe_payment_intent_id: null,
        stripe_checkout_session_id: null,
      })
      .eq("id", data.leadId);
    if (error) throw error;

    return { ok: true, reset: true };
  });
