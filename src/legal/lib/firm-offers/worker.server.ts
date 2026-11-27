// Ported from the Legal app (family-law-floater/src/lib/firm-offers/worker.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import {
  automaticPayments,
  paymentState,
  reminderSlot,
  reminderAction,
  message,
  type Offer,
} from "./model";
import {
  annatureCall,
  verifiedSignatureState,
  providerActionsEnabled,
  paymentAdapter,
  safeProviderUrl,
  squareTransport,
  type Envelope,
} from "./providers.server";
import { db, loadOffer, saveOffer, workspaceLink, privateUpload } from "./store.server";
import { requestInvoice } from "./service.server";
import { sendEmail } from "@/legal/lib/email.server";
import { sendBoldOfferSms } from "@/legal/lib/twilio.server";

async function archiveProviderFile(o: Offer, url: string, kind: string) {
  const allowed = (legalEnv["BOLD_ANNATURE_DOWNLOAD_HOSTS"] ?? "").split(",").filter(Boolean);
  if (!allowed.length)
    throw new Error(
      "Configure BOLD_ANNATURE_DOWNLOAD_HOSTS after verifying Annature download hosts",
    );
  const response = await fetch(safeProviderUrl(url, allowed), { redirect: "error" });
  if (!response.ok) throw new Error("Executed document download failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 15000000 || Buffer.from(bytes.slice(0, 5)).toString() !== "%PDF-")
    throw new Error("Invalid executed PDF");
  const path = `${o.id}/${o.documentDigest}/${kind}.pdf`;
  await privateUpload(path, bytes);
  return path;
}
export async function reconcileOffer(id: string) {
  let o = await loadOffer(id);
  if (o.envelopeId && o.signature !== "executed") {
    const envelope = await annatureCall<Envelope>(
      `/v1/envelopes/${encodeURIComponent(o.envelopeId)}`,
    );
    const signature = verifiedSignatureState(
      o,
      envelope,
      legalEnv["BOLD_ANNATURE_ACCOUNT_ID"] ?? "",
    );
    if (signature === "executed") {
      if (!envelope.master || !envelope.certificate)
        throw new Error("Awaiting executed agreement and certificate");
      const signedPath = await archiveProviderFile(o, envelope.master, "executed");
      const certificatePath = await archiveProviderFile(o, envelope.certificate, "certificate");
      o = await saveOffer(
        { ...o, signature: "executed", signedPath, certificatePath },
        "Both signatures verified",
      );
    } else if (["declined", "voided"].includes(envelope.status))
      o = await saveOffer(
        { ...o, proposal: "declined", paused: true },
        "Annature declined or voided",
      );
    else if (signature === "awaiting_peter" && o.signature !== "awaiting_peter")
      o = await saveOffer(
        { ...o, signature: "awaiting_peter" },
        "Awaiting Peter’s countersignature",
      );
  }
  if (
    automaticPayments(o) &&
    o.signature === "executed" &&
    o.proposal === "sent" &&
    !o.payments[0]?.invoiceId
  )
    o = await requestInvoice(o, 1);
  for (const request of o.payments) {
    if (!request.invoiceId) continue;
    const response = await paymentAdapter(request.paymentProvider).retrieve(request);
    const invoice = response["invoice"] as {
      id: string;
      location_id: string;
      order_id: string;
      status: string;
      version: number;
      payment_requests: {
        total_completed_amount_money?: { amount: number; currency: string };
        computed_amount_money?: { amount: number; currency: string };
      }[];
    };
    if (invoice.version < (request.version ?? -1)) continue;
    let status: typeof request.status;
    let paid = 0;
    try {
      if (invoice.order_id !== request.orderId) throw new Error("Invoice/order mismatch");
      const entries = invoice.payment_requests;
      if (
        !entries?.length ||
        entries.some((p) => p.computed_amount_money?.currency !== "AUD") ||
        entries.reduce((n, p) => n + (p.computed_amount_money?.amount ?? 0), 0) !==
          request.amountCents
      )
        throw new Error("Invoice amount/currency mismatch");
      paid = entries.reduce((n, p) => n + (p.total_completed_amount_money?.amount ?? 0), 0);
      if (
        entries.some(
          (p) =>
            p.total_completed_amount_money && p.total_completed_amount_money.currency !== "AUD",
        )
      )
        throw new Error("Payment currency mismatch");
      status = paymentState(
        {
          id: invoice.id,
          locationId: invoice.location_id,
          currency: "AUD",
          status: invoice.status,
          version: invoice.version,
          amount: paid,
        },
        request,
        legalEnv["BOLD_SQUARE_LOCATION_ID"] ?? "",
      );
    } catch {
      o = await saveOffer(
        {
          ...o,
          paused: true,
          payments: o.payments.map((p) => (p.id === request.id ? { ...p, status: "disputed" } : p)),
        },
        "Payment reconciliation discrepancy",
        "Invoice identity, currency or amount needs admin review before more services are booked.",
      );
      continue;
    }
    if (status !== request.status || invoice.version !== (request.version ?? -1))
      o = await saveOffer(
        {
          ...o,
          payments: o.payments.map((p) =>
            p.id === request.id
              ? {
                  ...p,
                  status,
                  version: Math.max(invoice.version, p.version ?? 0),
                  receivedCents: paid,
                }
              : p,
          ),
        },
        `Block ${request.block}: ${status}`,
      );
  }
  const { data: milestone, error } = await db
    .from("firm_offer_milestones")
    .select("*")
    .eq("offer_id", o.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (
    automaticPayments(o) &&
    milestone &&
    !o.payments.some((p) => p.block === 2) &&
    o.signature === "executed"
  )
    o = await requestInvoice(o, 2, String(milestone.due_at).slice(0, 10));
  if (
    milestone?.review_required &&
    !o.activity.some((a) => a.kind === "Attendance correction requires review")
  )
    o = await saveOffer(
      o,
      "Attendance correction requires review",
      "An issued Block 2 debt remains in place; reconcile the corrected attendance with an admin.",
    );
  return o;
}
async function notify(o: Offer, step: string, channel: "email" | "sms" | "internal", now: Date) {
  const { error } = await db.from("firm_offer_outbox").insert({ offer_id: o.id, step, channel });
  if (error && error.code !== "23505") throw new Error(error.message);
  const { data: claim, error: claimError } = await db
    .from("firm_offer_outbox")
    .update({ state: "submitting", updated_at: now.toISOString() })
    .eq("offer_id", o.id)
    .eq("step", step)
    .eq("channel", channel)
    .eq("state", "queued")
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claim) return;
  let state = "skipped",
    providerId: string | undefined;
  try {
    // Re-read at dispatch time, not at queue time. Delays never replay old steps.
    o = await loadOffer(o.id);
    const internal = channel === "internal";
    const block2 = step === "block2";
    const day = Number(step);
    const eligible = internal
      ? step === "countersign"
        ? o.signature === "awaiting_peter"
        : o.activity.some(
            (a) =>
              a.kind ===
              (step === "attendance"
                ? "Attendance correction requires review"
                : "Change requested"),
          )
      : block2
        ? o.proposal === "sent" &&
          !o.optedOut &&
          o.payments.some((p) => p.block === 2 && p.status === "awaiting_payment")
        : !!o.sentAt && reminderSlot(o.sentAt, now, o.timezone) === day && !!reminderAction(o);
    if (eligible) {
      const link = workspaceLink(o);
      const content = internal
        ? {
            subject: `${o.draft.firmName} — ${step === "countersign" ? "countersignature due" : step === "attendance" ? "attendance correction requires review" : "change requested"}`,
            text: `Review this application in Firm Applications. ${step === "countersign" ? "The firm has signed. Please countersign the same agreement." : step === "attendance" ? "The fifth-show record was corrected. Reconcile the existing Block 2 debt; it has not been cancelled." : "Reminders are paused pending review."}`,
          }
        : block2
          ? {
              subject: `${o.draft.firmName} — Block 2 invoice`,
              text: `Block 2 is ready: ${(o.payments.find((p) => p.block === 2)?.amountCents ?? 0) / 100} AUD including GST. Due ${o.payments.find((p) => p.block === 2)?.dueDate}, and before the sixth appointment is booked. Continue securely: ${link}`,
            }
          : message(o, day, link);
      if (content) {
        const email = internal ? o.company.email : o.draft.email;
        const allowEmails = (legalEnv["BOLD_TEST_RECIPIENT_EMAILS"] ?? "")
          .toLowerCase()
          .split(",")
          .map((v) => v.trim());
        const allowMobiles = (legalEnv["BOLD_TEST_RECIPIENT_MOBILES"] ?? "")
          .split(",")
          .map((v) => v.trim());
        if (channel === "sms") {
          if (
            legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
            !allowMobiles.includes(o.draft.mobile)
          )
            throw new Error("Sandbox mobile not allowlisted");
          const r = await sendBoldOfferSms(o.draft.mobile, content.text, claim.id);
          state = r.ok ? "submitted" : "failed";
          providerId = r.sid;
        } else {
          if (
            legalEnv["BOLD_OFFERS_MODE"] === "sandbox" &&
            !allowEmails.includes(email.toLowerCase())
          )
            throw new Error("Sandbox email not allowlisted");
          if (!legalEnv["BOLD_OFFER_FROM_EMAIL"])
            throw new Error("Missing BOLD_OFFER_FROM_EMAIL");
          const r = await sendEmail({
            to: [email],
            subject: content.subject,
            text: content.text,
            from: legalEnv["BOLD_OFFER_FROM_EMAIL"],
            replyTo: o.company.email,
            redactErrors: true,
          });
          state = r.ok ? "submitted" : "failed";
        }
      }
    }
    if (state === "failed" && channel !== "internal")
      await saveOffer({ ...o, paused: true }, "Delivery failed; destination review required");
  } catch {
    state = "uncertain";
  } // Never automatically resend after a timeout; reconcile provider logs.
  const result = await db
    .from("firm_offer_outbox")
    .update({ state, provider_id: providerId ?? null, updated_at: new Date().toISOString() })
    .eq("id", claim.id)
    .eq("state", "submitting");
  if (result.error) throw new Error(result.error.message);
}
export async function runWorker(now = new Date()) {
  if (!providerActionsEnabled()) return { disabled: true };
  const messagingEnabled =
    legalEnv["BOLD_OFFER_REMINDERS_ENABLED"] === "true" &&
    legalEnv["BOLD_SENDER_APPROVED"] === "true";
  const { data: rows, error } = await db
    .from("firm_offers")
    .select("id,snapshot")
    .eq("snapshot->>proposal", "sent");
  if (error) throw new Error(error.message);
  let processed = 0,
    failed = 0;
  for (const row of rows ?? [])
    try {
      if (!messagingEnabled && row.snapshot?.draft?.workflow !== "call_signing") continue;
      const o = await reconcileOffer(row.id);
      if (!messagingEnabled || o.draft.workflow === "call_signing") {
        processed++;
        continue;
      }
      if (o.signature === "awaiting_peter") await notify(o, "countersign", "internal", now);
      if (o.activity.some((a) => a.kind === "Change requested"))
        await notify(o, "change", "internal", now);
      if (o.activity.some((a) => a.kind === "Attendance correction requires review"))
        await notify(o, "attendance", "internal", now);
      if (o.payments.some((p) => p.block === 2 && p.invoiceId))
        await notify(o, "block2", "email", now);
      const day = o.sentAt ? reminderSlot(o.sentAt, now, o.timezone) : null;
      if (day !== null) {
        await notify(o, String(day), "email", now);
        await notify(o, String(day), "sms", now);
      }
      processed++;
    } catch {
      failed++;
    }
  // Events are an audit/inbox; re-fetch provider state rather than trusting delivered status.
  const { data: events } = await db
    .from("firm_offer_events")
    .select("*")
    .is("processed_at", null)
    .limit(100);
  for (const event of events ?? [])
    try {
      if (event.provider === "square" && event.event_type.startsWith("dispute.")) {
        const result = await squareTransport()(
          `/payments/${encodeURIComponent(event.resource_id)}`,
          "GET",
        );
        const payment = result["payment"] as { order_id: string; location_id: string };
        if (payment.location_id === legalEnv["BOLD_SQUARE_LOCATION_ID"]) {
          for (const row of rows ?? []) {
            let o = await loadOffer(row.id);
            if (o.payments.some((p) => p.orderId === payment.order_id))
              o = await saveOffer(
                {
                  ...o,
                  payments: o.payments.map((p) =>
                    p.orderId === payment.order_id ? { ...p, status: "disputed" } : p,
                  ),
                  paused: true,
                },
                "Payment dispute requires review",
              );
          }
        }
      }
      // Full sweep above repairs missed and out-of-order events. Failed sweeps retain the inbox.
      if (!failed)
        await db
          .from("firm_offer_events")
          .update({ processed_at: now.toISOString() })
          .eq("key", event.key);
    } catch {
      failed++;
    }
  return { processed, failed };
}
