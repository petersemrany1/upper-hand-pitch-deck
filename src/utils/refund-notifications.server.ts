import { createClient } from "@supabase/supabase-js";
import { createStripeClient, resolveStripeEnv } from "@/lib/stripe.server";
import { squareApiBase } from "@/lib/square.server";
import { PATIENT_SMS_FROM } from "@/lib/booking-confirmation-sms";
import { checkRefundObject, type RefundNotice } from "@/lib/refund-notifications";
import { processRefundNotice, type SmsSendResult } from "@/lib/refund-notification-worker";

export const REFUND_STATUS_CALLBACK = "https://hairtransplantgroup.lovable.app/api/public/hooks/twilio-message-status";
const timeout = () => AbortSignal.timeout(12_000);
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);
function checked<T extends { error: any; data?: any }>(result: T): T["data"] {
  if (result.error) throw new Error(result.error.message || String(result.error));
  return result.data;
}
export function refundDatabase() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Refund notification database is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function verifyRecordedRefund(e: RefundNotice) {
  const refundId = e.payload.refund_id, paymentId = e.payload.payment_id;
  if (!refundId || !paymentId) throw new Error("Refund/payment reference is missing");
  let raw: any;
  if (e.payload.processor === "square") {
    if (!process.env.SQUARE_ACCESS_TOKEN) throw new Error("Square credentials are not configured");
    const response = await fetch(`${squareApiBase()}/v2/refunds/${encodeURIComponent(refundId)}`, {
      headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, "Square-Version": "2025-01-23" }, signal: timeout(),
    });
    if (!response.ok) throw new Error(`Could not verify Square refund (HTTP ${response.status})`);
    raw = (await response.json()).refund;
  } else if (e.payload.processor === "stripe") {
    let tryLegacy = false;
    if (process.env.STRIPE_LIVE_API_KEY || process.env.STRIPE_SANDBOX_API_KEY) {
      try { raw = await createStripeClient(resolveStripeEnv()).refunds.retrieve(refundId, {}, { timeout: 12_000, maxNetworkRetries: 0 }); }
      catch (error) {
        if ((error as any)?.code !== "resource_missing") throw error;
        tryLegacy = true;
      }
    } else tryLegacy = true;
    if (tryLegacy) {
      if (!process.env.STRIPE_HTG_SECRET_KEY) throw new Error("The Stripe account holding this refund is unavailable");
      const response = await fetch(`https://api.stripe.com/v1/refunds/${encodeURIComponent(refundId)}`, {
        headers: { Authorization: `Bearer ${process.env.STRIPE_HTG_SECRET_KEY}` }, signal: timeout(),
      });
      if (!response.ok) throw new Error(`Could not verify Stripe refund (HTTP ${response.status})`);
      raw = await response.json();
    }
  } else throw new Error("Refund payment provider is missing");
  return checkRefundObject(e.payload.processor, raw, { refundId, paymentId });
}

export async function sendRefundSms(id: string, to: string, body: string, transport: typeof fetch = fetch): Promise<SmsSendResult> {
  const account = process.env.TWILIO_ACCOUNT_SID, token = process.env.TWILIO_AUTH_TOKEN;
  if (!account || !token) return { ok: false, error: "Twilio credentials are not configured" };
  const response = await transport(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`, {
    method: "POST", signal: timeout(),
    headers: { Authorization: `Basic ${btoa(`${account}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: PATIENT_SMS_FROM, Body: body, StatusCallback: `${REFUND_STATUS_CALLBACK}?refund_notification_id=${id}` }),
  });
  if (response.status >= 500 || response.status === 408) throw new Error("Twilio result is uncertain");
  const data = await response.json();
  if (!response.ok) return { ok: false, error: data.message || `Twilio HTTP ${response.status}`, retryable: response.status === 429 };
  if (!/^SM[0-9a-fA-F]{32}$/.test(data.sid || "")) throw new Error("Twilio response did not contain a valid message reference");
  return { ok: true, sid: data.sid, status: data.status || "queued" };
}

export async function recordRefundSmsStatus(db: any, id: string, sid: string, status: string, error?: string | null) {
  checked(await db.rpc("record_refund_sms_status", { p_id: id, p_sid: sid, p_status: status, p_error: error || null }));
}

async function logRefundSms(db: any, e: RefundNotice) {
  checked(await db.rpc("log_refund_sms", { p_id: e.id, p_from: PATIENT_SMS_FROM }));
}

/** Called only after provider signature verification. Retrieve current state to handle out-of-order events. */
export async function applyRecordedRefundWebhook(processor: "stripe" | "square", refundId: string) {
  const db = refundDatabase();
  const field = processor === "square" ? "square_refund_id" : "stripe_refund_id";
  const appointment = checked(await db.from("clinic_appointments")
    .select("id,refund_status,square_payment_id,stripe_payment_intent_id").eq(field, refundId).maybeSingle());
  if (!appointment) return { ok: true, detail: "no appointment for refund id" };
  const state = await verifyRecordedRefund({ payload: { processor, refund_id: refundId,
    payment_id: processor === "square" ? appointment.square_payment_id : appointment.stripe_payment_intent_id } } as RefundNotice);
  const status = state.state === "completed" ? "refunded" : state.state === "failed" ? "failed" : "refund_pending";
  if (status !== appointment.refund_status) {
    let query = db.from("clinic_appointments").update({ refund_status: status, refund_error: state.error || null,
      ...(state.state === "completed" ? { refund_processed_at: new Date().toISOString() } : {}),
    }).eq("id", appointment.id).eq(field, refundId);
    query = appointment.refund_status == null ? query.is("refund_status", null) : query.eq("refund_status", appointment.refund_status);
    checked(await query);
  }
  return { ok: true, detail: status };
}

export async function processRefundNotifications(db: any, dryRun = false) {
  if (dryRun) {
    const rows = checked(await db.from("refund_notifications").select("kind,status").limit(1000));
    return { dryRun: true, notifications: rows, smsConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      emailConfigured: Boolean(process.env.LOVABLE_API_KEY), alertRecipient: "peter@gobold.com.au" };
  }
  const started = Date.now();
  checked(await db.rpc("recover_refund_notifications"));
  const due: RefundNotice[] = checked(await db.from("refund_notifications").select("*")
    .in("status", ["pending", "checking"]).lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(20));
  let processed = 0;
  const errors: string[] = [];
  for (const candidate of due) {
    if (Date.now() - started > 35_000) break;
    const [e] = checked(await db.rpc("claim_refund_notification", { p_id: candidate.id })) as RefundNotice[];
    if (!e) continue;
    let expectedState = "checking";
    try {
      await processRefundNotice(e, {
        now: Date.now,
        async appointment(id) {
          return checked(await db.from("clinic_appointments").select("id,refund_status,square_refund_id,stripe_refund_id,square_payment_id,stripe_payment_intent_id,deposit_amount").eq("id", id).maybeSingle());
        },
        verify: verifyRecordedRefund,
        async save(patch) {
          const rows = checked(await db.from("refund_notifications").update({ ...patch, updated_at: new Date().toISOString() })
            .eq("id", e.id).eq("claim_token", e.claim_token).eq("status", expectedState).select("id"));
          if (rows?.length) { expectedState = String(patch.status || expectedState); return true; }
          return false;
        },
        async flag(category, reason) { checked(await db.rpc("flag_refund_notification", { p_id: e.id, p_category: category, p_reason: reason })); },
        async settle(state, reason) {
          const field = e.payload.processor === "square" ? "square_refund_id" : "stripe_refund_id";
          checked(await db.from("clinic_appointments").update({ refund_status: state, refund_error: reason || null,
            ...(state === "refunded" ? { refund_processed_at: new Date().toISOString() } : {}),
          }).eq("id", e.appointment_id).eq(field, e.payload.refund_id).neq("refund_status", state));
        },
        send: (phone, body) => sendRefundSms(e.id, phone, body),
        recordSms: (sid, status, error) => recordRefundSmsStatus(db, e.id, sid, status, error),
        async queueEmail(content) { return checked(await db.rpc("enqueue_refund_alert", { p_id: e.id, p_claim: e.claim_token, p_subject: content.subject, p_html: content.html, p_text: content.text })); },
      });
      processed++;
    } catch (error) { errors.push(`${e.id}: ${errorText(error)}`); }
  }

  // Recover missed Twilio callbacks without ever issuing a second SMS.
  const accepted: RefundNotice[] = checked(await db.from("refund_notifications").select("*").eq("kind", "patient_sms")
    .eq("status", "accepted").lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(10));
  for (const e of accepted) {
    if (!e.sms_sid || Date.now() - started > 45_000) break;
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages/${e.sms_sid}.json`, {
        headers: { Authorization: `Basic ${btoa(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`)}` }, signal: timeout(),
      });
      if (!response.ok) throw new Error(`Could not check SMS delivery (HTTP ${response.status})`);
      const message = await response.json();
      await recordRefundSmsStatus(db, e.id, e.sms_sid, message.status, message.error_message);
      checked(await db.from("refund_notifications").update({ next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString() }).eq("id", e.id));
      if (Date.now() - Date.parse(e.created_at) > 24 * 60 * 60_000 && !["delivered", "read", "undelivered", "failed", "canceled"].includes(message.status)) {
        checked(await db.rpc("flag_refund_notification", { p_id: e.id, p_category: "sms", p_reason: "SMS delivery is still unconfirmed after 24 hours. Check the message history before any resend." }));
      }
    } catch (error) { errors.push(`${e.id}: ${errorText(error)}`); }
  }
  const unlogged: RefundNotice[] = checked(await db.from("refund_notifications").select("*").eq("kind", "patient_sms").eq("inbox_logged", false).not("sms_sid", "is", null).limit(20));
  for (const e of unlogged) {
    try { await logRefundSms(db, e); } catch (error) { errors.push(`${e.id}: inbox: ${errorText(error)}`); }
  }
  // A bank can reject a refund after initial success. Poll new refunds for 45 days
  // as a fallback when a provider webhook is delayed or its subscription omits refunds.
  const monitoring: RefundNotice[] = checked(await db.from("refund_notifications").select("*")
    .eq("kind", "patient_sms").in("status", ["accepted", "delivered", "failed", "uncertain", "cancelled"])
    .not("payload->>refund_id", "is", null).gte("created_at", new Date(Date.now() - 45 * 86400_000).toISOString())
    .lte("verification_next_at", new Date().toISOString()).order("verification_next_at").limit(5));
  for (const e of monitoring) {
    if (Date.now() - started > 45_000) break;
    try {
      const state = await verifyRecordedRefund(e);
      if (state.state === "failed" || state.state === "completed") {
        const field = e.payload.processor === "square" ? "square_refund_id" : "stripe_refund_id";
        const status = state.state === "completed" ? "refunded" : "failed";
        checked(await db.from("clinic_appointments").update({ refund_status: status,
          refund_error: state.state === "failed" ? state.error || "The payment provider reported a refund failure" : null,
          ...(state.state === "completed" ? { refund_processed_at: new Date().toISOString() } : {}),
        }).eq("id", e.appointment_id).eq(field, e.payload.refund_id).neq("refund_status", status));
      }
      if (state.state === "pending" && state.error) {
        checked(await db.rpc("flag_refund_notification", { p_id: e.id, p_category: "verification", p_reason: state.error }));
      }
      // Processing receipts and cancelled texts must not stop refund settlement checks.
      // This updates the refund only; the original unique notice is never re-opened.
      const recheckMs = state.state === "pending" ? 5 * 60_000 : 6 * 3600_000;
      checked(await db.from("refund_notifications").update({ verification_next_at: new Date(Date.now() + recheckMs).toISOString() }).eq("id", e.id));
    } catch (error) {
      errors.push(`${e.id}: refund recheck: ${errorText(error)}`);
      checked(await db.from("refund_notifications").update({ verification_next_at: new Date(Date.now() + 3600_000).toISOString() }).eq("id", e.id));
      checked(await db.rpc("flag_refund_notification", { p_id: e.id, p_category: "verification", p_reason: "A follow-up check of the refund failed: " + errorText(error) }));
    }
  }
  return { processed, errors };
}
