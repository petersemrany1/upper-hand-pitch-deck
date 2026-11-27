// Ported from the Legal app (family-law-floater/src/lib/deposit.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireSalesAccess } from "@/legal/lib/portal-access-middleware";

/**
 * Create a $75 AUD Square payment link for a lead and text the link to them
 * from a rotating pool number. Rep-initiated only.
 */
export const sendDepositLink = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; firmId?: string | null; lawyerId?: string | null }) => {
    if (!input?.leadId || typeof input.leadId !== "string") throw new Error("leadId is required");
    return {
      leadId: input.leadId,
      firmId: typeof input.firmId === "string" && input.firmId ? input.firmId : null,
      lawyerId: typeof input.lawyerId === "string" && input.lawyerId ? input.lawyerId : null,
    };
  })
  .handler(async ({ data, context }) => {
    const { assertManualDepositLeadAccess } = await import("./manual-deposit-access.server");
    await assertManualDepositLeadAccess(context.supabase, data.leadId);
    const { supabase } = context;

    const { data: lead, error } = await supabase
      .from("client_leads")
      .select("id, first_name, phone, email, firm_id, lawyer_id, rep_id")
      .eq("id", data.leadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead not found");

    // The rep's Step 10 selections are the source of truth — the lead row may not
    // have firm_id/lawyer_id saved yet, so persist them now and use them directly.
    const firmId = data.firmId ?? lead.firm_id ?? null;
    const lawyerId = data.lawyerId ?? lead.lawyer_id ?? null;

    let firmName: string | null = null;
    let firmAddress: string | null = null;
    if (firmId) {
      const { data: firm } = await supabase
        .from("firms")
        .select("firm_name, address, city, state")
        .eq("id", firmId)
        .maybeSingle();
      firmName = firm?.firm_name ?? null;
      firmAddress =
        [firm?.address, firm?.city, firm?.state].filter(Boolean).join(", ").trim() || null;
    }

    let lawyerName: string | null = null;
    if (lawyerId) {
      const { data: lawyer } = await supabase
        .from("firm_lawyers")
        .select("name")
        .eq("id", lawyerId)
        .maybeSingle();
      lawyerName = lawyer?.name ?? null;
    }

    if (firmId !== lead.firm_id || lawyerId !== lead.lawyer_id) {
      await supabase
        .from("client_leads")
        .update({ firm_id: firmId, lawyer_id: lawyerId })
        .eq("id", lead.id);
    }

    // Square's own hosted checkout: it supports Apple Pay / Google Pay natively and
    // carries Square's trusted branding, so we don't host the card form ourselves.
    const { createDepositSession } = await import("./square-deposit.server");
    const session = await createDepositSession({
      leadId: lead.id,
      firmName,
      lawyerName,
      firmAddress,
      email: lead.email ?? null,
    });

    const firstName = lead.first_name?.trim() || "there";
    const body = `Hi ${firstName}, here's the secure Square checkout link for your $75 refundable booking deposit to lock in your free consultation: ${session.url} — payments are processed by Square, and it's fully refundable, it just confirms your spot.`;

    const { sendSmsToLead } = await import("./twilio.server");
    const sms = await sendSmsToLead(lead.id, lead.phone, body);

    return {
      url: session.url,
      sessionId: session.id,
      smsSent: sms.ok,
      smsError: sms.error ?? null,
    };
  });

/** Checks the saved Square order without charging the client or sending a message. */
export const checkDepositPayment = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string }) => {
    if (!input?.leadId || typeof input.leadId !== "string") throw new Error("leadId is required");
    return { leadId: input.leadId };
  })
  .handler(async ({ data, context }) => {
    const { assertManualDepositLeadAccess } = await import("./manual-deposit-access.server");
    await assertManualDepositLeadAccess(context.supabase, data.leadId);
    const { reconcileLeadDeposit } = await import("./square-deposit.server");
    return reconcileLeadDeposit(data.leadId);
  });
