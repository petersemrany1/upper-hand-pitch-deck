import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Leads service: server-side (service-role) access to meta_leads.
 * Client-side lead access goes through src/data/leads instead.
 */

export async function getLeadClinicId(leadId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("meta_leads")
    .select("clinic_id")
    .eq("id", leadId)
    .maybeSingle();
  return (data as { clinic_id?: string | null } | null)?.clinic_id ?? null;
}

/**
 * Record a successful deposit against a lead (and its appointment row when
 * one exists). Mirrors the stripe-deposit webhook for over-phone payments.
 * IMPORTANT: never touches meta_leads.status — the rep still confirms the
 * booking themselves.
 */
export async function recordLeadDeposit(args: {
  leadId: string;
  paymentIntentId: string;
  amountDollars: number;
}): Promise<void> {
  await supabaseAdmin
    .from("meta_leads")
    .update({
      deposit_paid_at: new Date().toISOString(),
      deposit_amount: args.amountDollars,
      stripe_payment_intent_id: args.paymentIntentId,
    })
    .eq("id", args.leadId);

  await supabaseAdmin
    .from("clinic_appointments")
    .update({
      stripe_payment_intent_id: args.paymentIntentId,
      deposit_amount: args.amountDollars,
      refund_status: null,
      refund_processed_at: null,
      stripe_refund_id: null,
    })
    .eq("lead_id", args.leadId);
}
