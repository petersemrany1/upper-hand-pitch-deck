// Ported from the Legal app (family-law-floater/src/lib/manual-deposit.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireSalesAccess } from "@/legal/lib/portal-access-middleware";

/** Public config for mounting the Square card form in the browser. */
export const stripePublishableKeyFn = createServerFn({ method: "GET" })
  .middleware([requireSalesAccess])
  .handler(async () => {
    const { squareApplicationId, squareLocationId } = await import("./manual-deposit.server");
    return { key: squareApplicationId(), locationId: squareLocationId() };
  });


/** Start a real $75 card charge for a lead, to be completed in the browser. */
export const createManualDepositIntentFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string }) => {
    if (!input?.leadId) throw new Error("leadId is required");
    return { leadId: input.leadId };
  })
  .handler(async ({ data, context }) => {
    const { assertManualDepositLeadAccess } = await import("./manual-deposit-access.server");
    await assertManualDepositLeadAccess(context.supabase as never, data.leadId);
    const { supabase } = context;

    const { data: lead } = await supabase
      .from("client_leads")
      .select("id, first_name, last_name, email, firm_id, lawyer_id, deposit_paid_at")
      .eq("id", data.leadId)
      .maybeSingle();
    if (!lead) throw new Error("Lead not found");
    if (lead.deposit_paid_at) return { alreadyPaid: true as const };

    let firmName: string | null = null;
    let firmAddress: string | null = null;
    if (lead.firm_id) {
      const { data: firm } = await supabase
        .from("firms")
        .select("firm_name, address, city, state")
        .eq("id", lead.firm_id)
        .maybeSingle();
      firmName = firm?.firm_name ?? null;
      firmAddress =
        [firm?.address, firm?.city, firm?.state].filter(Boolean).join(", ").trim() || null;
    }
    let lawyerName: string | null = null;
    if (lead.lawyer_id) {
      const { data: lawyer } = await supabase
        .from("firm_lawyers")
        .select("name")
        .eq("id", lead.lawyer_id)
        .maybeSingle();
      lawyerName = lawyer?.name ?? null;
    }

    const description = ["Refundable booking fee", firmName, lawyerName, firmAddress]
      .filter(Boolean)
      .join(" · ");

    const { DEPOSIT_CENTS } = await import("./manual-deposit.server");
    return {
      alreadyPaid: false as const,
      amount: DEPOSIT_CENTS,
      description,
      clientName: `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim(),
    };
  });

/** Charge the Square card token the rep keyed in over the phone. */
export const confirmManualDepositFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator(
    (input: { leadId: string; sourceId: string; verificationToken?: string | null }) => {
      if (!input?.leadId || !input?.sourceId) throw new Error("Missing payment details");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { assertManualDepositLeadAccess } = await import("./manual-deposit-access.server");
    await assertManualDepositLeadAccess(context.supabase as never, data.leadId);
    const { chargeManualDeposit } = await import("./manual-deposit.server");
    return chargeManualDeposit({
      leadId: data.leadId,
      sourceId: data.sourceId,
      verificationToken: data.verificationToken ?? null,
      description: "Refundable booking fee",
      email: null,
    });
  });


/** Verify the charge with Square and stamp the deposit on the lead. */
export const settleManualDepositFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; paymentIntentId: string }) => {
    if (!input?.leadId || !input?.paymentIntentId) throw new Error("Missing payment reference");
    return { leadId: input.leadId, paymentIntentId: input.paymentIntentId };
  })
  .handler(async ({ data, context }) => {
    const { assertManualDepositLeadAccess } = await import("./manual-deposit-access.server");
    await assertManualDepositLeadAccess(context.supabase as never, data.leadId);
    const { settleDepositIntent } = await import("./manual-deposit.server");
    return settleDepositIntent(data.paymentIntentId, data.leadId);
  });
