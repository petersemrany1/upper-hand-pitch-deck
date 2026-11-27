// Ported from the Legal app (family-law-floater/src/lib/firm-contracts.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
/**
 * Bold Marketing Agreement — send, track, chase. Server only.
 * INTERNAL: pricing/payment data. Callers must already be admin-checked.
 */
import { randomUUID } from "node:crypto";

import { fillContract, type ContractTemplate } from "./contracts/fill";
import {
  firmExecutionFields,
  createEnvelope,
  voidEnvelope,
  getSigningLink,
  getSigningLinkWhenReady,
  unmuteRecipient,
} from "./contracts/annature.server";
import {
  createPackPaymentLink,
  deactivatePaymentLink,
  chargeSavedCard,
} from "./contracts/stripe-bold.server";
import {
  defaultBlock1Shows,
  formatCents,
  pricePack,
  splitPack,
  type PackPricing,
  type PaymentBlock,
} from "./contracts/pricing";
import { sendEmail, INTERNAL_ALERT_TO } from "./email.server";
import { sendSmsToLead } from "./twilio.server";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import type { Database } from "@/legal/integrations/supabase/types";

export type ContractRow = Database["public"]["Tables"]["firm_contracts"]["Row"];

export const APP_URL = legalEnv["APP_URL"] ?? "https://family-law-floater.lovable.app";
export const DOCUMENT_NAME = "Bold Marketing Agreement";

/** Days after send on which a reminder goes out; after the last one we flag for a call. */
export const REMINDER_DAYS = [1, 2, 3, 5, 9, 11, 14, 15] as const;

/* ------------------------------------------------------------------ */
/* Time helpers                                                         */
/* ------------------------------------------------------------------ */

/** UTC instant of 09:00 Australia/Sydney on the calendar day `daysFromNow` days after `from`. */
export function sydney9am(from: Date, daysFromNow: number): Date {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(from).map((p) => [p.type, p.value]));
  const base = new Date(
    Date.UTC(
      Number(parts["year"]),
      Number(parts["month"]) - 1,
      Number(parts["day"]) + daysFromNow,
      9,
      0,
      0,
    ),
  );
  // base is 09:00 *UTC* on that date; shift by Sydney's offset on that date.
  const offsetMin = sydneyOffsetMinutes(base);
  return new Date(base.getTime() - offsetMin * 60_000);
}

/** Weekend deferrals keep the original calendar-day cadence where possible. */
export function isSydneyWeekend(date: Date): boolean {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Australia/Sydney",
    weekday: "short",
  }).format(date);
  return day === "Sat" || day === "Sun";
}

export function nextContractReminderAt(from: Date, day: number, lastSent?: Date): Date {
  let next = sydney9am(from, day);
  // A delayed stage must never make the next stage immediately overdue.
  if (lastSent) {
    const earliest = sydney9am(lastSent, 1);
    if (next < earliest) next = earliest;
  }
  while (isSydneyWeekend(next)) next = sydney9am(next, 1);
  return next;
}

function sydneyOffsetMinutes(d: Date): number {
  const s =
    new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Sydney", timeZoneName: "shortOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+10";
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(s);
  if (!m) return 600;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/* ------------------------------------------------------------------ */
/* Build                                                                */
/* ------------------------------------------------------------------ */

export type ContractDraft = {
  firmId: string;
  firm: {
    name: string;
    abn: string;
    address: string;
    email: string;
    signatoryName: string;
    signatoryEmail: string;
    /** Signatory mobile for the SMS that goes out with the emails. Optional. */
    mobile?: string | undefined;
  };
  packName: string;
  shows: number;
  feeExCents: number;
  split: { block1Shows: number } | null;
  agreementDate?: Date;
};

export type BuiltContract = {
  template: ContractTemplate;
  pricing: PackPricing;
  blocks: { block1: PaymentBlock; block2: PaymentBlock } | null;
  amountDueCents: number;
  pdf: Uint8Array;
  agreementDate: Date;
};

export async function buildContract(draft: ContractDraft): Promise<BuiltContract> {
  const pricing = pricePack(draft.shows, draft.feeExCents);
  const blocks = draft.split ? splitPack(pricing, draft.split.block1Shows) : null;
  const template: ContractTemplate = blocks ? "schedule" : "standard";
  const agreementDate = draft.agreementDate ?? new Date();
  const pdf = await fillContract({
    template,
    firm: {
      name: draft.firm.name,
      abn: draft.firm.abn,
      address: draft.firm.address,
      email: draft.firm.email,
    },
    agreementDate,
    packName: draft.packName || `${draft.shows}-Pack`,
    pricing,
    ...(blocks ? { blocks } : {}),
  });
  return {
    template,
    pricing,
    blocks,
    amountDueCents: blocks ? blocks.block1.incCents : pricing.totalIncCents,
    pdf,
    agreementDate,
  };
}

/* ------------------------------------------------------------------ */
/* Send                                                                 */
/* ------------------------------------------------------------------ */

export type SendResult = {
  contractId: string;
  envelopeId: string;
  paymentUrl: string;
  warnings: string[];
};

/**
 * Order: fill PDF → Stripe link → Annature envelope (redirects to the link
 * after signing) → payment email → DB row + first reminder. If Stripe or
 * Annature fails nothing is sent and the real error is thrown; a Stripe link
 * created before an Annature failure is deactivated again.
 */
export async function sendFirmContract(
  draft: ContractDraft,
  createdBy: string,
): Promise<SendResult> {
  try {
    return await sendFirmContractInner(draft, createdBy);
  } catch (err) {
    // Persist the real failure so it can be diagnosed without the admin's toast.
    await supabaseAdmin
      .from("error_logs")
      .insert({
        source: "send-contract",
        message: (err as Error).message,
        detail: { firmId: draft.firmId, packName: draft.packName, split: Boolean(draft.split) },
      })
      .then(
        () => undefined,
        () => undefined,
      );
    throw err;
  }
}

async function sendFirmContractInner(draft: ContractDraft, createdBy: string): Promise<SendResult> {
  const built = await buildContract(draft);
  const contractId = randomUUID();
  const warnings: string[] = [];
  const meta = {
    firm_id: draft.firmId,
    contract_id: contractId,
    block: built.blocks ? "1" : "full",
  };

  const link = await createPackPaymentLink({
    productName: `${DOCUMENT_NAME} — ${draft.packName}${built.blocks ? " (Block 1)" : ""}`,
    amountCents: built.amountDueCents,
    metadata: meta,
    idempotencyKey: `contract:${contractId}`,
  });

  let envelope;
  try {
    envelope = await createEnvelope({
      name: `${DOCUMENT_NAME} — ${draft.firm.name}`,
      message: `Please review and sign the ${DOCUMENT_NAME}. After signing you'll be taken straight to the secure payment page for your ${draft.packName}.`,
      documentName: `${DOCUMENT_NAME} — ${draft.firm.name}.pdf`,
      pdfBase64: Buffer.from(built.pdf).toString("base64"),
      signer: {
        name: draft.firm.signatoryName,
        email: draft.firm.signatoryEmail,
        redirectAfterSign: link.url,
      },
      fields: firmExecutionFields(),
      metadata: { firm_id: draft.firmId, contract_id: contractId },
    });
  } catch (err) {
    await deactivatePaymentLink(link.linkId).catch(() => undefined);
    throw err;
  }
  const recipientId = envelope.recipients?.[0]?.id ?? null;
  // The recipient is muted (Annature sends nothing), so we deliver the signing
  // link. Annature only issues a token once the envelope is `sent`, so wait for
  // that. If it still refuses, un-mute so Annature emails the firm itself and
  // carry on — the send must never fail for want of a link.
  let signUrl: string | null = null;
  if (recipientId) {
    try {
      signUrl = await getSigningLinkWhenReady(envelope.id, recipientId);
    } catch (err) {
      warnings.push(
        `Signing link unavailable (${(err as Error).message}); Annature will email the firm directly.`,
      );
      await unmuteRecipient(recipientId).catch((e: Error) =>
        warnings.push(`Could not un-mute the Annature recipient: ${e.message}`),
      );
    }
  } else {
    warnings.push("Annature returned no recipient id; the firm may not receive a signing link.");
  }

  const payEmail = await sendEmail({
    to: uniq([draft.firm.signatoryEmail, draft.firm.email]),
    subject: `Your ${draft.packName} with Bold Marketing — agreement & payment`,
    html: paymentEmailHtml({
      firmName: draft.firm.name,
      packName: draft.packName,
      shows: built.pricing.shows,
      feeExCents: built.pricing.feeExCents,
      amountCents: built.amountDueCents,
      blockLabel: built.blocks
        ? `Block 1 of 2 (${built.blocks.block1.shows} of ${built.pricing.shows} shows)`
        : null,
      payUrl: link.url,
      signUrl,
    }),
    replyTo: INTERNAL_ALERT_TO,
  });
  if (!payEmail.ok)
    warnings.push(
      `Payment email failed: ${payEmail.error ?? "unknown"} — the link is saved and reminders will carry it.`,
    );

  if (draft.firm.mobile) {
    const sms = await sendSmsToLead(
      null,
      draft.firm.mobile,
      smsText(firstName(draft.firm.signatoryName), [
        signUrl
          ? `Here is the link to your Bold Marketing Agreement to e-sign:\n${signUrl}`
          : "Your Bold Marketing Agreement is in your inbox from Annature to e-sign.",
        `Here is the link to pay (${formatCents(built.amountDueCents)} inc GST):\n${link.url}`,
      ]),
    );
    if (!sms.ok) warnings.push(`SMS failed: ${sms.error ?? "unknown"}`);
    else await logEvent(contractId, "sms_sent", { kind: "send" });
  }

  const now = new Date();
  const { error } = await supabaseAdmin.from("firm_contracts").insert({
    id: contractId,
    firm_id: draft.firmId,
    created_by: createdBy,
    template: built.template,
    firm_name: draft.firm.name,
    firm_abn: draft.firm.abn || null,
    firm_address: draft.firm.address || null,
    firm_email: draft.firm.email || null,
    signatory_name: draft.firm.signatoryName,
    signatory_email: draft.firm.signatoryEmail,
    agreement_date: built.agreementDate.toISOString().slice(0, 10),
    pack_name: draft.packName,
    shows: built.pricing.shows,
    fee_ex_cents: built.pricing.feeExCents,
    total_ex_cents: built.pricing.totalExCents,
    gst_cents: built.pricing.gstCents,
    total_inc_cents: built.pricing.totalIncCents,
    is_split: Boolean(built.blocks),
    b1_shows: built.blocks?.block1.shows ?? null,
    b1_inc_cents: built.blocks?.block1.incCents ?? null,
    b2_shows: built.blocks?.block2.shows ?? null,
    b2_inc_cents: built.blocks?.block2.incCents ?? null,
    annature_envelope_id: envelope.id,
    annature_recipient_id: recipientId,
    contract_status: "sent",
    stripe_price_id: link.priceId,
    stripe_payment_link_id: link.linkId,
    stripe_payment_link_url: link.url,
    payment_status: "unpaid",
    amount_due_cents: built.amountDueCents,
    reminder_stage: 0,
    next_reminder_at: nextContractReminderAt(now, REMINDER_DAYS[0]).toISOString(),
  });
  if (error) throw new Error(`Contract sent but the record could not be saved: ${error.message}`);

  await logEvent(contractId, "sent", {
    envelope_id: envelope.id,
    payment_link: link.url,
    warnings,
  });
  return { contractId, envelopeId: envelope.id, paymentUrl: link.url, warnings };
}

/* ------------------------------------------------------------------ */
/* Actions                                                              */
/* ------------------------------------------------------------------ */

export async function getContract(id: string): Promise<ContractRow> {
  const { data, error } = await supabaseAdmin
    .from("firm_contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Contract not found");
  return data;
}

export async function listContracts(firmId: string): Promise<ContractRow[]> {
  const { data, error } = await supabaseAdmin
    .from("firm_contracts")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logEvent(
  contractId: string,
  kind: string,
  detail?: unknown,
  providerEventId?: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("firm_contract_events").insert({
    contract_id: contractId,
    kind,
    detail: (detail ?? null) as never,
    provider_event_id: providerEventId ?? null,
  });
  // Unique violation on provider_event_id = already processed.
  if (error && error.code === "23505") return false;
  if (error) console.error("[contracts] event log failed", error.message);
  return true;
}

async function patch(
  id: string,
  values: Database["public"]["Tables"]["firm_contracts"]["Update"],
): Promise<void> {
  const { error } = await supabaseAdmin.from("firm_contracts").update(values).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resendContractEmail(id: string): Promise<void> {
  const c = await getContract(id);
  if (!c.annature_recipient_id) throw new Error("No Annature recipient on this contract");
  const signUrl = await getSigningLink(c.annature_recipient_id);
  const payUrl = c.payment_status === "paid" ? null : c.stripe_payment_link_url;
  const r = await sendEmail({
    to: uniq([c.signatory_email, c.firm_email]),
    subject: `Your ${DOCUMENT_NAME} — link to sign`,
    html: signEmailHtml({
      firmName: c.firm_name,
      packName: c.pack_name,
      signUrl,
      payUrl,
      amountCents: c.amount_due_cents,
    }),
    replyTo: INTERNAL_ALERT_TO,
  });
  if (!r.ok) throw new Error(r.error ?? "Email failed");
  const mobile = await firmMobile(c.firm_id);
  if (mobile) {
    const lines = [`Here is the link to your Bold Marketing Agreement to e-sign:\n${signUrl}`];
    if (payUrl)
      lines.push(
        `Here is the link to pay (${formatCents(c.amount_due_cents)} inc GST):\n${payUrl}`,
      );
    await sendSmsToLead(null, mobile, smsText(firstName(c.signatory_name), lines)).catch(
      () => undefined,
    );
  }
  await logEvent(id, "reminder_sent", { manual: true, kind: "contract" });
}

export async function resendPaymentEmail(id: string): Promise<void> {
  const c = await getContract(id);
  const url =
    c.b2_requested_at && c.b2_payment_status === "unpaid"
      ? c.b2_payment_link_url
      : c.stripe_payment_link_url;
  if (!url) throw new Error("No payment link on this contract");
  const r = await sendEmail({
    to: uniq([c.signatory_email, c.firm_email]),
    subject: `Your ${c.pack_name} with Bold Marketing — payment link`,
    html: paymentEmailHtml({
      firmName: c.firm_name,
      packName: c.pack_name,
      shows: c.shows,
      feeExCents: c.fee_ex_cents,
      amountCents:
        c.b2_requested_at && c.b2_payment_status === "unpaid"
          ? (c.b2_inc_cents ?? 0)
          : c.amount_due_cents,
      blockLabel: c.is_split ? (c.b2_requested_at ? "Block 2 of 2" : "Block 1 of 2") : null,
      payUrl: url,
    }),
    replyTo: INTERNAL_ALERT_TO,
  });
  if (!r.ok) throw new Error(r.error ?? "Email failed");
  await logEvent(id, "reminder_sent", { manual: true, kind: "payment" });
}

export async function voidContract(id: string, reason: string | null): Promise<void> {
  const c = await getContract(id);
  if (c.annature_envelope_id && c.contract_status !== "signed")
    await voidEnvelope(c.annature_envelope_id).catch((e: Error) =>
      console.error("[contracts] void envelope", e.message),
    );
  if (c.stripe_payment_link_id && c.payment_status !== "paid")
    await deactivatePaymentLink(c.stripe_payment_link_id).catch(() => undefined);
  if (c.b2_stripe_payment_link_id && c.b2_payment_status !== "paid")
    await deactivatePaymentLink(c.b2_stripe_payment_link_id).catch(() => undefined);
  await patch(id, { contract_status: "voided", next_reminder_at: null, flagged_for_call: false });
  await logEvent(id, "voided", { reason });
}

export async function markPaidManually(
  id: string,
  block: "1" | "2",
  note: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  if (block === "2") await patch(id, { b2_payment_status: "paid", b2_paid_at: now });
  else await patch(id, { payment_status: "paid", paid_at: now });
  await logEvent(id, "paid", { manual: true, block, note });
  await recomputeReminders(id);
}

/** Block 2 becomes due: create its link, email the firm, restart the chase. */
export async function requestBlock2(id: string): Promise<{ url: string }> {
  const c = await getContract(id);
  if (!c.is_split || !c.b2_inc_cents || !c.b2_shows)
    throw new Error("This contract has no Block 2");
  if (c.b2_payment_status === "paid") throw new Error("Block 2 is already paid");
  let url = c.b2_payment_link_url;
  let linkId = c.b2_stripe_payment_link_id;
  if (!url) {
    const link = await createPackPaymentLink({
      productName: `${DOCUMENT_NAME} — ${c.pack_name} (Block 2)`,
      amountCents: c.b2_inc_cents,
      metadata: { firm_id: c.firm_id, contract_id: c.id, block: "2" },
      idempotencyKey: `contract:${c.id}:b2`,
    });
    url = link.url;
    linkId = link.linkId;
  }
  const hasCard = Boolean(c.stripe_customer_id && c.stripe_payment_method_id);
  const r = await sendEmail({
    to: uniq([c.signatory_email, c.firm_email]),
    subject: `${c.pack_name} — Block 2 payment now due`,
    html: block2EmailHtml({
      firmName: c.firm_name,
      packName: c.pack_name,
      b1Shows: c.b1_shows ?? 0,
      b2Shows: c.b2_shows,
      feeExCents: c.fee_ex_cents,
      amountCents: c.b2_inc_cents,
      payUrl: url,
      hasCard,
    }),
    replyTo: INTERNAL_ALERT_TO,
  });
  if (!r.ok) throw new Error(r.error ?? "Email failed");
  await patch(id, {
    b2_requested_at: new Date().toISOString(),
    b2_payment_link_url: url,
    b2_stripe_payment_link_id: linkId,
    b2_payment_status: "unpaid",
    reminder_stage: 0,
    next_reminder_at: nextContractReminderAt(new Date(), REMINDER_DAYS[0]).toISOString(),
    flagged_for_call: false,
    flagged_at: null,
  });
  await logEvent(id, "b2_requested", { url, hasCard });
  const mobile = await firmMobile(c.firm_id);
  if (mobile) {
    const sms = await sendSmsToLead(
      null,
      mobile,
      smsText(firstName(c.signatory_name), [
        `Block 2 of your ${c.pack_name} (${formatCents(c.b2_inc_cents)} inc GST) is now due.`,
        hasCard
          ? `Reply YES to the email and we'll charge the card on file, or pay here:\n${url}`
          : `Here is the link to pay:\n${url}`,
      ]),
    );
    if (sms.ok) await logEvent(id, "sms_sent", { kind: "b2" });
  }
  return { url };
}

/** After the firm replies in writing agreeing (clause 2.10): charge the card on file. */
export async function chargeBlock2Card(
  id: string,
  authorisationNote: string,
): Promise<{ paymentIntentId: string }> {
  const c = await getContract(id);
  if (!c.is_split || !c.b2_inc_cents) throw new Error("This contract has no Block 2");
  if (c.b2_payment_status === "paid") throw new Error("Block 2 is already paid");
  if (!c.stripe_customer_id || !c.stripe_payment_method_id)
    throw new Error("No card on file for this firm — send the payment link instead");
  if (!authorisationNote.trim())
    throw new Error("Record the firm's written agreement before charging (clause 2.10)");
  const pi = await chargeSavedCard({
    customerId: c.stripe_customer_id,
    paymentMethodId: c.stripe_payment_method_id,
    amountCents: c.b2_inc_cents,
    description: `${DOCUMENT_NAME} — ${c.pack_name} Block 2 — ${c.firm_name}`,
    metadata: {
      firm_id: c.firm_id,
      contract_id: c.id,
      block: "2",
      authorisation: authorisationNote.slice(0, 400),
    },
    idempotencyKey: `contract:${c.id}:b2-charge:${Date.now()}`,
  });
  if (pi.status !== "succeeded") throw new Error(`Charge not completed (status: ${pi.status})`);
  await patch(id, {
    b2_payment_status: "paid",
    b2_paid_at: new Date().toISOString(),
    b2_charge_payment_intent_id: pi.id,
  });
  if (c.b2_stripe_payment_link_id)
    await deactivatePaymentLink(c.b2_stripe_payment_link_id).catch(() => undefined);
  await logEvent(id, "b2_charged", { payment_intent: pi.id, authorisation: authorisationNote });
  await sendEmail({
    to: uniq([c.signatory_email, c.firm_email]),
    subject: `${c.pack_name} — Block 2 payment received`,
    html: receiptEmailHtml({
      firmName: c.firm_name,
      packName: c.pack_name,
      label: "Block 2 of 2",
      amountCents: c.b2_inc_cents,
    }),
    replyTo: INTERNAL_ALERT_TO,
  }).catch(() => undefined);
  await recomputeReminders(id);
  return { paymentIntentId: pi.id };
}

/* ------------------------------------------------------------------ */
/* Reminders                                                            */
/* ------------------------------------------------------------------ */

export type ChaseState = "sign_and_pay" | "sign_only" | "pay_only" | "done";

export function chaseState(c: ContractRow): ChaseState {
  const signed = c.contract_status === "signed";
  const outstandingPayment =
    c.b2_requested_at && c.b2_payment_status === "unpaid" ? true : c.payment_status !== "paid";
  if (c.contract_status === "declined" || c.contract_status === "voided") return "done";
  if (signed && !outstandingPayment) return "done";
  if (!signed && outstandingPayment) return "sign_and_pay";
  if (!signed) return "sign_only";
  return "pay_only";
}

/** Cancel the chase when there is nothing left to chase. */
export async function recomputeReminders(id: string): Promise<void> {
  const c = await getContract(id);
  if (chaseState(c) === "done")
    await patch(id, { next_reminder_at: null, flagged_for_call: false });
}

/** Called by the cron hook. Sends every due reminder (max one per contract per day). */
export async function runContractReminders(
  now = new Date(),
): Promise<{ sent: number; flagged: number }> {
  // Protect existing overdue rows as well as newly scheduled reminders.
  if (isSydneyWeekend(now) || now < sydney9am(now, 0)) return { sent: 0, flagged: 0 };
  const { data, error } = await supabaseAdmin
    .from("firm_contracts")
    .select("*")
    .not("next_reminder_at", "is", null)
    .lte("next_reminder_at", now.toISOString());
  if (error) throw new Error(error.message);
  let sent = 0,
    flagged = 0;
  for (const c of data ?? []) {
    const state = chaseState(c);
    if (state === "done") {
      await patch(c.id, { next_reminder_at: null });
      continue;
    }
    if (c.last_reminder_at && now < nextContractReminderAt(new Date(c.last_reminder_at), 1))
      continue;

    const stage = c.reminder_stage + 1; // 1-based
    const isLast = stage >= REMINDER_DAYS.length;
    const payUrl =
      c.b2_requested_at && c.b2_payment_status === "unpaid"
        ? c.b2_payment_link_url
        : c.stripe_payment_link_url;
    const amount =
      c.b2_requested_at && c.b2_payment_status === "unpaid"
        ? (c.b2_inc_cents ?? 0)
        : c.amount_due_cents;
    const html = reminderEmailHtml({
      firmName: c.firm_name,
      packName: c.pack_name,
      state,
      amountCents: amount,
      payUrl,
      stage,
      isLast,
    });
    const to = uniq([c.signatory_email, c.firm_email, ...(isLast ? [INTERNAL_ALERT_TO] : [])]);
    const r = await sendEmail({
      to,
      subject: reminderSubject(state, c.pack_name, isLast),
      html,
      replyTo: INTERNAL_ALERT_TO,
    });
    if (!r.ok) {
      await logEvent(c.id, "error", { stage, error: r.error });
      continue;
    }
    sent++;
    await logEvent(c.id, "reminder_sent", { stage, state });

    const mobile = await firmMobile(c.firm_id);
    if (mobile) {
      const who = firstName(c.signatory_name);
      let signUrl: string | null = null;
      if (state !== "pay_only" && c.annature_recipient_id) {
        signUrl = await getSigningLink(c.annature_recipient_id).catch(() => null);
      }
      const lines: string[] = [];
      if (state === "sign_only")
        lines.push("Payment received, thank you. Just the agreement left to e-sign.");
      if (state === "pay_only")
        lines.push("Agreement signed, thank you. Just the payment left so we can start.");
      if (state === "sign_and_pay")
        lines.push(`Two quick things to get your ${c.pack_name} started.`);
      if (state !== "pay_only")
        lines.push(
          signUrl
            ? `Link to e-sign the agreement:\n${signUrl}`
            : "The agreement is in your inbox from Annature to e-sign.",
        );
      if (state !== "sign_only" && payUrl)
        lines.push(`Link to pay (${formatCents(amount)} inc GST):\n${payUrl}`);
      if (isLast) lines.push("This is our last automated reminder — Peter will give you a call.");
      const sms = await sendSmsToLead(null, mobile, smsText(who, lines));
      if (sms.ok) await logEvent(c.id, "sms_sent", { stage, state });
      else await logEvent(c.id, "error", { stage, sms: sms.error });
    }

    if (isLast) {
      flagged++;
      await patch(c.id, {
        reminder_stage: stage,
        last_reminder_at: now.toISOString(),
        next_reminder_at: null,
        flagged_for_call: true,
        flagged_at: now.toISOString(),
      });
      await logEvent(c.id, "flagged", { stage });
    } else {
      // Next reminder day is measured from the original send (stage days table).
      const sentAt = new Date(
        c.b2_requested_at && c.b2_payment_status === "unpaid" ? c.b2_requested_at : c.created_at,
      );
      const nextDay: number = REMINDER_DAYS[stage] ?? 15;
      await patch(c.id, {
        reminder_stage: stage,
        last_reminder_at: now.toISOString(),
        next_reminder_at: nextContractReminderAt(sentAt, nextDay, now).toISOString(),
      });
    }
  }
  return { sent, flagged };
}

/* ------------------------------------------------------------------ */
/* Emails                                                               */
/* ------------------------------------------------------------------ */

/** "Hi X,\n\n<lines>\n\nThanks.\nBold Marketing" */
function smsText(first: string, lines: string[]): string {
  return `Hi ${first},\n\n${lines.join("\n\n")}\n\nThanks.\nBold Marketing`;
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

async function firmMobile(firmId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("firms").select("phone").eq("id", firmId).maybeSingle();
  return data?.phone ?? null;
}

function uniq(list: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      list
        .filter((s): s is string => Boolean(s && s.includes("@")))
        .map((s) => s.trim().toLowerCase()),
    ),
  );
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f8ff;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#0b1033">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#2c3af5;font-weight:700;margin:0 0 8px">Bold Marketing</p>
  <h1 style="font-size:22px;margin:0 0 18px;line-height:1.25">${esc(title)}</h1>
  <div style="background:#fff;border:1px solid #e6e8fb;border-radius:14px;padding:22px;font-size:15px;line-height:1.6">${bodyHtml}</div>
  <p style="font-size:12px;color:#6b72a6;margin:18px 0 0">Bold Marketing · ABN 98 910 419 248 · 5 George Street, North Strathfield NSW · peter@gobold.com.au</p>
</div></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:22px 0"><a href="${esc(url)}" style="display:inline-block;background:#2c3af5;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;
}

function paymentEmailHtml(a: {
  firmName: string;
  packName: string;
  shows: number;
  feeExCents: number;
  amountCents: number;
  blockLabel: string | null;
  payUrl: string;
  signUrl?: string | null;
}): string {
  return shell(
    `Your ${a.packName} — payment`,
    `
<p>Hi ${esc(a.firmName)},</p>
<p>Thanks for coming on board. Your <strong>${esc(a.packName)}</strong> is ${a.shows} qualified shows at ${formatCents(a.feeExCents)} per show (exc. GST).</p>
<p><strong>Amount due now: ${formatCents(a.amountCents)} inc. GST</strong>${a.blockLabel ? ` — ${esc(a.blockLabel)}` : ""}.</p>
${a.signUrl ? button(a.signUrl, "Review & sign the agreement") : ""}
${button(a.payUrl, "Pay securely with Stripe")}
<p>${a.signUrl ? `The ${esc(DOCUMENT_NAME)} is also in a separate email from Annature.` : `The ${esc(DOCUMENT_NAME)} has arrived separately for e-signature from Annature.`} Once both are done we book your onboarding call and get started.</p>
<p style="font-size:13px;color:#6b72a6">Your card is stored securely by Stripe, never by us, and is only ever charged as set out in the agreement.</p>`,
  );
}

function signEmailHtml(a: {
  firmName: string;
  packName: string;
  signUrl: string;
  payUrl: string | null;
  amountCents: number;
}): string {
  return shell(
    `Your ${DOCUMENT_NAME}`,
    `
<p>Hi ${esc(a.firmName)},</p>
<p>Here is the link to review and e-sign your <strong>${esc(DOCUMENT_NAME)}</strong> for the ${esc(a.packName)}.</p>
${button(a.signUrl, "Review & sign the agreement")}
${a.payUrl ? `<p>And the link to pay (<strong>${formatCents(a.amountCents)}</strong> inc. GST):</p>${button(a.payUrl, "Pay securely with Stripe")}` : ""}
<p>Thanks.<br/>Bold Marketing</p>`,
  );
}

function signedCopyEmailHtml(a: {
  firmName: string;
  packName: string;
  copyUrl: string | null;
  payUrl: string | null;
  amountCents: number;
}): string {
  return shell(
    `Signed — ${a.packName}`,
    `
<p>Hi ${esc(a.firmName)},</p>
<p>Thanks for signing the ${esc(DOCUMENT_NAME)}.${a.copyUrl ? " Your signed copy is here (link valid for 7 days):" : " We'll send your signed copy shortly."}</p>
${a.copyUrl ? button(a.copyUrl, "Download signed agreement") : ""}
${a.payUrl ? `<p>One thing left — payment of <strong>${formatCents(a.amountCents)}</strong> inc. GST so we can start:</p>${button(a.payUrl, "Pay securely with Stripe")}` : "<p>Payment is in — we'll be in touch to book your onboarding call.</p>"}
<p>Thanks.<br/>Bold Marketing</p>`,
  );
}

function block2EmailHtml(a: {
  firmName: string;
  packName: string;
  b1Shows: number;
  b2Shows: number;
  feeExCents: number;
  amountCents: number;
  payUrl: string;
  hasCard: boolean;
}): string {
  return shell(
    `${a.packName} — Block 2 now due`,
    `
<p>Hi ${esc(a.firmName)},</p>
<p>You've now had the first ${a.b1Shows} qualified shows of your ${esc(a.packName)}. Block 2 covers the remaining <strong>${a.b2Shows} shows</strong> at ${formatCents(a.feeExCents)} per show (exc. GST).</p>
<p><strong>Amount due: ${formatCents(a.amountCents)} inc. GST</strong></p>
${a.hasCard ? `<p><strong>Reply YES to this email</strong> and we'll charge the card you have on file with Stripe — nothing else to do. Or pay by link below.</p>` : ""}
${button(a.payUrl, "Pay securely with Stripe")}
<p>The next shows are booked as soon as Block 2 is received.</p>`,
  );
}

function receiptEmailHtml(a: {
  firmName: string;
  packName: string;
  label: string;
  amountCents: number;
}): string {
  return shell(
    `Payment received — ${a.packName}`,
    `
<p>Hi ${esc(a.firmName)},</p>
<p>We've received <strong>${formatCents(a.amountCents)} inc. GST</strong> for ${esc(a.label)} of your ${esc(a.packName)}. A tax invoice follows from Stripe.</p>
<p>We're straight onto your next shows.</p>`,
  );
}

function reminderSubject(state: ChaseState, pack: string, isLast: boolean): string {
  if (isLast) return `Action needed: ${pack} with Bold Marketing`;
  if (state === "sign_only") return `Reminder: please sign your Bold Marketing Agreement`;
  if (state === "pay_only") return `Reminder: ${pack} payment`;
  return `Reminder: sign and pay to start your ${pack}`;
}

function reminderEmailHtml(a: {
  firmName: string;
  packName: string;
  state: ChaseState;
  amountCents: number;
  payUrl: string | null;
  stage: number;
  isLast: boolean;
}): string {
  const sign = `<p>Your <strong>${esc(DOCUMENT_NAME)}</strong> is waiting for signature — the link is in the Annature email (search your inbox for "Annature").</p>`;
  const pay = a.payUrl
    ? `<p><strong>${formatCents(a.amountCents)} inc. GST</strong> is due for your ${esc(a.packName)}.</p>${button(a.payUrl, "Pay securely with Stripe")}`
    : "";
  const body =
    a.state === "sign_only"
      ? `<p>Hi ${esc(a.firmName)},</p><p>Payment received — thank you. One thing left:</p>${sign}`
      : a.state === "pay_only"
        ? `<p>Hi ${esc(a.firmName)},</p><p>Agreement signed — thank you. To start booking your shows we just need payment:</p>${pay}`
        : `<p>Hi ${esc(a.firmName)},</p><p>Two quick things to get your ${esc(a.packName)} started:</p>${sign}${pay}`;
  const foot = a.isLast
    ? `<p style="color:#b91c1c"><strong>This is our final automated reminder.</strong> Peter will give you a call to see if anything's in the way.</p>`
    : `<p style="font-size:13px;color:#6b72a6">Reply to this email if anything needs changing.</p>`;
  return shell(a.isLast ? "Let's get this sorted" : "Quick reminder", body + foot);
}

/* ------------------------------------------------------------------ */
/* Webhooks                                                             */
/* ------------------------------------------------------------------ */

export const SIGNED_BUCKET = "firm-contracts";

async function findByEnvelope(envelopeId: string): Promise<ContractRow | null> {
  const { data } = await supabaseAdmin
    .from("firm_contracts")
    .select("*")
    .eq("annature_envelope_id", envelopeId)
    .maybeSingle();
  return data ?? null;
}

async function notifyPeter(subject: string, lines: string[]): Promise<void> {
  await sendEmail({ to: [INTERNAL_ALERT_TO], subject, text: lines.join("\n") }).catch(
    () => undefined,
  );
}

/** Store the completed PDF privately; returns the storage path. */
async function storeSignedPdf(contractId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed [${res.status}]`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${contractId}/signed.pdf`;
    const { error } = await supabaseAdmin.storage
      .from(SIGNED_BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (error) throw new Error(error.message);
    return path;
  } catch (e) {
    console.error("[contracts] signed pdf store failed", (e as Error).message);
    return null;
  }
}

/** Fresh 1-hour download link for the stored signed PDF. */
export async function signedPdfUrl(contractId: string): Promise<string> {
  const c = await getContract(contractId);
  if (!c.signed_pdf_url) throw new Error("No signed PDF stored yet");
  const { data, error } = await supabaseAdmin.storage
    .from(SIGNED_BUCKET)
    .createSignedUrl(c.signed_pdf_url, 3600);
  if (error || !data) throw new Error(error?.message ?? "Could not create link");
  return data.signedUrl;
}

export type AnnatureEvent = {
  event: string;
  envelope_id?: string;
  recipient_id?: string;
  completed?: string;
  viewed?: string;
  declined?: string;
  declined_reason?: string;
  voided?: string;
  master?: string;
  certificate?: string;
  combined?: string;
};

export async function handleAnnatureEvent(
  ev: AnnatureEvent,
): Promise<{ handled: boolean; note?: string }> {
  if (!ev.envelope_id) return { handled: false, note: "no envelope_id" };
  const c = await findByEnvelope(ev.envelope_id);
  if (!c) return { handled: false, note: "unknown envelope" };
  const stamp = ev.completed ?? ev.viewed ?? ev.declined ?? ev.voided ?? "";
  const eventKey = `annature:${ev.event}:${ev.envelope_id}:${stamp}`;

  switch (ev.event) {
    case "recipient_viewed": {
      if (!(await logEvent(c.id, "viewed", { recipient_id: ev.recipient_id }, eventKey)))
        return { handled: true, note: "duplicate" };
      if (c.contract_status === "sent") await patch(c.id, { contract_status: "viewed" });
      return { handled: true };
    }
    case "envelope_completed": {
      if (!(await logEvent(c.id, "signed", { master: Boolean(ev.master) }, eventKey)))
        return { handled: true, note: "duplicate" };
      const path = ev.master ? await storeSignedPdf(c.id, ev.master) : null;
      await patch(c.id, {
        contract_status: "signed",
        signed_at: ev.completed ?? new Date().toISOString(),
        ...(path ? { signed_pdf_url: path } : {}),
      });
      await recomputeReminders(c.id);
      // Annature won't email a muted recipient, so we send the firm its copy.
      {
        let copyUrl: string | null = null;
        if (path) {
          const { data } = await supabaseAdmin.storage
            .from(SIGNED_BUCKET)
            .createSignedUrl(path, 7 * 24 * 3600);
          copyUrl = data?.signedUrl ?? null;
        }
        await sendEmail({
          to: uniq([c.signatory_email, c.firm_email]),
          subject: `Signed — your ${DOCUMENT_NAME}`,
          html: signedCopyEmailHtml({
            firmName: c.firm_name,
            packName: c.pack_name,
            copyUrl,
            payUrl: c.payment_status === "paid" ? null : c.stripe_payment_link_url,
            amountCents: c.amount_due_cents,
          }),
          replyTo: INTERNAL_ALERT_TO,
        }).catch(() => undefined);
      }
      await notifyPeter(`Signed: ${c.firm_name} — ${c.pack_name}`, [
        `${c.firm_name} signed the ${DOCUMENT_NAME}.`,
        `Payment: ${c.payment_status === "paid" ? "already paid" : `${formatCents(c.amount_due_cents)} still outstanding`}.`,
        path
          ? "Signed PDF is stored in the portal."
          : "Signed PDF could not be stored — download it from Annature.",
      ]);
      return { handled: true };
    }
    case "recipient_declined": {
      if (!(await logEvent(c.id, "declined", { reason: ev.declined_reason ?? null }, eventKey)))
        return { handled: true, note: "duplicate" };
      await patch(c.id, { contract_status: "declined", next_reminder_at: null });
      await notifyPeter(`Declined: ${c.firm_name} — ${c.pack_name}`, [
        `${c.firm_name} declined to sign.`,
        ev.declined_reason ? `Reason: ${ev.declined_reason}` : "No reason given.",
        "Reminders stopped. You can void or resend from the portal.",
      ]);
      return { handled: true };
    }
    case "recipient_token_request": {
      // A muted recipient's link expired and they asked for a new one: re-deliver.
      if (!c.annature_recipient_id) return { handled: false, note: "no recipient on contract" };
      const signUrl = await getSigningLink(c.annature_recipient_id);
      const payUrl = c.payment_status === "paid" ? null : c.stripe_payment_link_url;
      await sendEmail({
        to: uniq([c.signatory_email, c.firm_email]),
        subject: `Your ${DOCUMENT_NAME} — new link to sign`,
        html: signEmailHtml({
          firmName: c.firm_name,
          packName: c.pack_name,
          signUrl,
          payUrl,
          amountCents: c.amount_due_cents,
        }),
        replyTo: INTERNAL_ALERT_TO,
      });
      const mobile = await firmMobile(c.firm_id);
      if (mobile) {
        const lines = [`Here is a new link to e-sign your Bold Marketing Agreement:\n${signUrl}`];
        if (payUrl)
          lines.push(
            `Here is the link to pay (${formatCents(c.amount_due_cents)} inc GST):\n${payUrl}`,
          );
        await sendSmsToLead(null, mobile, smsText(firstName(c.signatory_name), lines)).catch(
          () => undefined,
        );
      }
      await logEvent(c.id, "reminder_sent", {
        kind: "token_request",
        method: (ev as { method?: string }).method ?? null,
      });
      return { handled: true };
    }
    case "envelope_voided": {
      if (!(await logEvent(c.id, "voided", { source: "annature" }, eventKey)))
        return { handled: true, note: "duplicate" };
      if (c.contract_status !== "voided")
        await patch(c.id, { contract_status: "voided", next_reminder_at: null });
      return { handled: true };
    }
    default:
      return { handled: false, note: `ignored ${ev.event}` };
  }
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

export async function handleStripeEvent(
  ev: StripeEvent,
): Promise<{ handled: boolean; note?: string }> {
  if (ev.type !== "checkout.session.completed")
    return { handled: false, note: `ignored ${ev.type}` };
  const session = ev.data.object as {
    id: string;
    customer?: string | null;
    payment_intent?: string | null;
    payment_status?: string;
    amount_total?: number | null;
    metadata?: Record<string, string>;
  };
  const contractId = session.metadata?.["contract_id"];
  const block = session.metadata?.["block"] ?? "full";
  if (!contractId) return { handled: false, note: "no contract_id metadata" };
  if (session.payment_status && session.payment_status !== "paid")
    return { handled: false, note: `payment_status ${session.payment_status}` };

  const { data: c } = await supabaseAdmin
    .from("firm_contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  if (!c) return { handled: false, note: "unknown contract" };

  // Idempotent on the Stripe event id — Stripe retries.
  if (
    !(await logEvent(
      c.id,
      "paid",
      { block, session: session.id, amount: session.amount_total },
      `stripe:${ev.id}`,
    ))
  ) {
    return { handled: true, note: "duplicate" };
  }

  // Card on file: the customer + payment method Stripe saved (setup_future_usage=off_session).
  let paymentMethod: string | null = null;
  if (session.payment_intent) {
    try {
      const { getPaymentIntent } = await import("./contracts/stripe-bold.server");
      paymentMethod = (await getPaymentIntent(session.payment_intent)).payment_method;
    } catch (e) {
      console.error("[contracts] payment intent lookup failed", (e as Error).message);
    }
  }
  const now = new Date().toISOString();
  const card = {
    ...(session.customer ? { stripe_customer_id: session.customer } : {}),
    ...(paymentMethod ? { stripe_payment_method_id: paymentMethod } : {}),
  };
  if (block === "2") await patch(c.id, { b2_payment_status: "paid", b2_paid_at: now, ...card });
  else await patch(c.id, { payment_status: "paid", paid_at: now, ...card });
  await recomputeReminders(c.id);

  const amount = block === "2" ? (c.b2_inc_cents ?? 0) : c.amount_due_cents;
  await notifyPeter(
    `Paid: ${c.firm_name} — ${c.pack_name}${block === "2" ? " (Block 2)" : c.is_split ? " (Block 1)" : ""}`,
    [
      `${formatCents(session.amount_total ?? amount)} received from ${c.firm_name}.`,
      `Contract: ${c.contract_status === "signed" ? "signed" : "not yet signed — reminders continue"}.`,
      session.customer && paymentMethod
        ? "Card saved on file for future charges."
        : "Card was NOT saved — check the payment link settings.",
    ],
  );
  return { handled: true };
}

/**
 * Annature puts the endpoint's signing secret (Developers → Endpoints →
 * Signature) in X-Annature-Signature. Compared in constant time.
 */
export async function verifyAnnatureSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  // The HMAC forms were the original guess; every delivery on 4–5 Sep 2026 failed
  // them. Kept in case Annature ever moves to a body signature.
  const mac = createHmac("sha256", secret).update(rawBody);
  const digest = mac.digest();
  const candidates = [secret.trim(), digest.toString("hex"), digest.toString("base64")];
  const given = Buffer.from(header.trim());
  return candidates.some((c) => {
    const b = Buffer.from(c);
    return b.length === given.length && timingSafeEqual(b, given);
  });
}
