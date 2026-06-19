// Test-sandbox-only server functions for the Peter Test lead.
// Hard-gated to: (a) admin role, (b) the PETER_TEST_LEAD_ID constant.
// Never callable against a real lead.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sydneyTodayISO } from "@/lib/timezone";

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

    const { data: lead, error: leadErr } = await supabase
      .from("meta_leads")
      .select("id, first_name, last_name, phone, clinic_id, booking_date, booking_time")
      .eq("id", data.leadId)
      .single();
    if (leadErr) throw leadErr;
    if (!lead?.clinic_id) throw new Error("Sandbox lead has no clinic selected.");

    // The status trigger requires a clinic appointment first. In sandbox,
    // create a minimal test booking if the handover flow has not created one yet.
    const { data: existingAppt, error: apptLookupErr } = await supabase
      .from("clinic_appointments")
      .select("id")
      .eq("lead_id", data.leadId)
      .maybeSingle();
    if (apptLookupErr) throw apptLookupErr;

    let appt = existingAppt;
    if (!appt) {
      const patientName = `${lead.first_name ?? "Peter"} ${lead.last_name ?? "Test"}`.trim();
      const { data: insertedAppt, error: insertApptErr } = await supabase
        .from("clinic_appointments")
        .insert({
          lead_id: data.leadId,
          clinic_id: lead.clinic_id,
          patient_name: patientName || "Peter Test",
          patient_phone: lead.phone ?? null,
          appointment_date: lead.booking_date ?? sydneyTodayISO(),
          appointment_time: lead.booking_time ?? "09:00",
          intel_notes: "Sandbox deposit simulation appointment.",
          deposit_amount: amount,
          stripe_payment_intent_id: fakePiId,
        })
        .select("id")
        .single();
      if (insertApptErr) throw insertApptErr;
      appt = insertedAppt;
    }

    if (appt) {
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

    return { ok: true, simulated: true, sessionId: fakeSessionId, statusFlipped: Boolean(appt) };
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
