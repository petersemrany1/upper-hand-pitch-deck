// Ported from the Legal app (family-law-floater/src/lib/eligibility.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireSalesAccess } from "@/legal/lib/portal-access-middleware";
import { z } from "zod";

import { computeEligibility, FUNDING_ISSUES, type EligibilityFlags } from "./eligibility";

/**
 * Litigation Funding Eligibility — INTERNAL ONLY.
 *
 * The verdict, pool, answers and flags live on client_leads and must never be
 * denormalised onto firm_appointments, included in the handover email, or
 * returned to any firm portal user. Firms have no RLS path to client_leads.
 */

const eligibilityDataSchema = z.object({
  applicant_profile: z.enum(["adult_au", "adult_overseas", "under_18", "unsure"]).optional(),
  funding_issue: z
    .enum(["details", ...Object.keys(FUNDING_ISSUES)] as [
      "details",
      ...(keyof typeof FUNDING_ISSUES)[],
    ])
    .optional(),
  signed_scope: z.enum(["remaining", "unsure"]).optional(),
  business_valued: z.enum(["yes", "no", "unsure"]).optional(),
  equity_unknown: z.boolean().optional(),
  q1_resident: z.enum(["yes", "no", "unsure"]).optional(),
  q2_bankrupt: z.enum(["no", "discharged", "yes", "unsure"]).optional(),
  q3_separated: z.enum(["yes", "no", "unsure"]).optional(),
  signed_papers: z.enum(["yes", "no", "unsure"]).optional(),
  signed_document: z.enum(["transfer", "orders", "agreement", "other", "unsure"]).optional(),
  property_status: z
    .enum([
      "open",
      "agreed",
      "agreed_unsure",
      "awaiting_payout",
      "payout_to_caller",
      "payout_to_ex",
      "non_cash_payment",
      "unpaid",
      "reopen",
      "settled",
      "none",
      "unsure",
    ])
    .optional(),
  q4_property_in_au: z.enum(["yes", "no", "no_property", "unsure"]).optional(),
  q5_title: z.array(z.enum(["yours", "theirs", "joint", "trust_company", "unsure"])).optional(),
  q6_other_owner: z.enum(["no", "yes", "unsure"]).optional(),
  house_plan: z
    .enum(["keep", "sell", "ex_keeps", "transferred", "undecided", "no_house"])
    .optional(),
  agreed_cash_amount: z.number().int().safe().nonnegative().optional(),
  repayment_source: z.enum(["sale", "payout", "refinance", "none", "unsure"]).optional(),
  refinance_approved: z.enum(["yes", "no", "unsure"]).optional(),
  fee_estimate_confirmed: z.boolean().optional(),
  funding_needed: z.number().int().safe().nonnegative().nullish(),
  repayment_budget: z.number().int().safe().nonnegative().nullish(),
  payout_basis: z.enum(["written", "professional", "personal", "unsure"]).optional(),
  sale_money_identified: z.enum(["yes", "no", "unsure"]).optional(),
  other_asset_value: z.enum(["zero", "unknown"]).optional(),
  pool_checked: z.enum(["yes", "no", "unsure"]).optional(),
  timing_cleared: z.enum(["yes", "no", "unsure"]).optional(),
  expected_cash: z.number().int().nonnegative().safe().nullish(),
  repayment_when: z.enum(["at_settlement", "later", "unsure"]).optional(),
  q7: z.object({ net_equity: z.number().int().safe() }).optional(),
  q8: z
    .object({
      answer: z.enum(["no", "yes", "unsure"]),
      business_value: z.number().int().safe().nonnegative(),
      money_with_lawyer: z.number().int().safe().nonnegative(),
    })
    .optional(),
  q9_out_of_time: z.enum(["no", "yes", "unsure", "existing_order"]).optional(),
  cash_access: z.enum(["yes", "no", "depends", "unsure"]).optional(),
  cash_range_access: z.enum(["all", "some", "none", "unsure"]).optional(),
  cash_for_fees: z.number().int().nonnegative().safe().nullish(),
});

async function assertLeadAccess(
  supabase: { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> },
  leadId: string,
): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: isAdmin } = await supabase.rpc("is_admin_user");
  if (isAdmin === true) return;
  const { data: repId } = await supabase.rpc("current_sales_rep_id");
  const { data: lead } = await supabaseAdmin
    .from("client_leads")
    .select("rep_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!repId || !lead || (lead as { rep_id: string | null }).rep_id !== repId) {
    throw new Error("You cannot act on this lead");
  }
}

export const saveEligibilityFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((data: { leadId: string; answers: EligibilityFlags }) =>
    z.object({ leadId: z.string().uuid(), answers: eligibilityDataSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertLeadAccess(context.supabase as never, data.leadId);

    const result = computeEligibility({ ...data.answers } as EligibilityFlags);
    const unresolved = result.verdict === "incomplete" || result.verdict === "unconfirmed";
    const cleared = Object.keys(data.answers).length === 0;
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("client_leads")
      .update({
        eligibility_verdict: unresolved || result.code === "no_loan_needed" ? null : result.verdict,
        eligibility_net_pool: cleared ? null : result.netPool,
        eligibility_data: cleared
          ? null
          : {
              version: 3,
              answers: data.answers,
              reason: result.reason,
              verdict: result.verdict,
              code: result.code,
            },
        eligibility_flags: cleared ? null : result.flags,
        eligibility_completed_at: result.missing.length ? null : new Date().toISOString(),
      })
      .eq("id", data.leadId);
    if (error) throw error;

    return { verdict: result.verdict, netPool: result.netPool };
  });
