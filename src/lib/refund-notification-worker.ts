import { refundAlert, refundPhone, refundText, type CheckedRefund, type RefundNotice } from "./refund-notifications";

export type RefundAppointment = {
  id: string; refund_status: string | null; square_refund_id: string | null; stripe_refund_id: string | null;
  square_payment_id: string | null; stripe_payment_intent_id: string | null; deposit_amount: number | null;
};
export type SmsSendResult = { ok: true; sid: string; status: string } | { ok: false; error: string; retryable?: boolean };
export interface RefundWorkerDependencies {
  appointment(id: string | null): Promise<RefundAppointment | null>;
  verify(notice: RefundNotice): Promise<CheckedRefund>;
  save(patch: Record<string, unknown>): Promise<boolean>;
  flag(category: string, reason: string): Promise<void>;
  settle(state: "refunded" | "failed", reason?: string): Promise<void>;
  send(to: string, body: string): Promise<SmsSendResult>;
  recordSms(sid: string, status: string, error?: string): Promise<void>;
  queueEmail(content: { subject: string; html: string; text: string }): Promise<boolean>;
  now(): number;
}

/** Only 'checking' jobs are handed here after an atomic DB claim. No payment is initiated here. */
export async function processRefundNotice(e: RefundNotice, d: RefundWorkerDependencies): Promise<void> {
  const later = (minutes: number) => new Date(d.now() + minutes * 60_000).toISOString();
  if (e.kind === "ops_email") {
    try { await d.queueEmail(refundAlert(e)); }
    catch (error) { await d.save({ status: "pending", next_attempt_at: later(5), last_error: String(error) }); }
    return;
  }

  let amount: number;
  let phone: string;
  let body: string;
  try {
    const appointment = await d.appointment(e.appointment_id);
    if (!appointment) throw new Error("Appointment could not be found; refund text needs manual review");
    if (e.payload.manual) {
      if (appointment.refund_status !== "refunded_manual") {
        await d.save({ status: "cancelled", last_error: "Manual refund is no longer marked completed" });
        return;
      }
      amount = Number(appointment.deposit_amount);
    } else {
      const square = e.payload.processor === "square";
      const refundId = square ? appointment.square_refund_id : appointment.stripe_refund_id;
      const paymentId = square ? appointment.square_payment_id : appointment.stripe_payment_intent_id;
      if (refundId !== e.payload.refund_id || paymentId !== e.payload.payment_id) throw new Error("Appointment payment references changed; review before notifying the patient");
      const checked = await d.verify(e);
      if (checked.state === "pending") {
        if (checked.error) await d.flag("verification", checked.error);
        await d.save({ status: "pending", next_attempt_at: later(5), last_error: checked.error || null });
        return;
      }
      if (checked.state === "failed") {
        await d.settle("failed", checked.error);
        await d.save({ status: "cancelled", last_error: checked.error || "Refund failed" });
        return;
      }
      amount = checked.amount!;
      await d.settle("refunded");
    }
    phone = refundPhone(e.payload.patient_phone);
    body = refundText(amount);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await d.save({ status: "pending", next_attempt_at: later(5), last_error: reason });
    if (e.attempts >= 3 || /phone|amount|references changed|could not be found/i.test(reason)) await d.flag("verification", reason);
    return;
  }

  // This durable boundary is what prevents duplicate SMS after process termination.
  if (!(await d.save({ status: "sending", sms_body: body, claimed_at: new Date(d.now()).toISOString() }))) return;
  let result: SmsSendResult;
  try { result = await d.send(phone, body); }
  catch {
    const reason = "SMS send result is uncertain. Check Twilio history before any resend; the refund must not be repeated.";
    await d.save({ status: "uncertain", last_error: reason });
    await d.flag("sms", reason);
    return;
  }
  if (result.ok) {
    // If this write fails, leave 'sending' for recovery; never repeat the send.
    await d.recordSms(result.sid, result.status);
  } else if (result.retryable) {
    await d.save({ status: "pending", next_attempt_at: later(5), last_error: result.error });
    if (e.attempts >= 3) await d.flag("sms", result.error);
  } else {
    await d.save({ status: "failed", last_error: result.error });
    await d.flag("sms", result.error);
  }
}
