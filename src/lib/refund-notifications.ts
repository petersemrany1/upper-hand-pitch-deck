export type RefundNotice = {
  id: string;
  kind: "patient_sms" | "ops_email";
  appointment_id: string | null;
  dedupe_key: string;
  payload: {
    patient_name?: string; patient_phone?: string; lead_id?: string | null;
    clinic_name?: string; amount?: number | string | null; processor?: string;
    payment_id?: string | null; refund_id?: string | null; reason?: string;
    category?: string; manual?: boolean;
  };
  status: string;
  attempts: number;
  created_at: string;
  claimed_at?: string | null;
  claim_token?: string | null;
  sms_sid?: string | null;
  sms_body?: string | null;
  last_error?: string | null;
};

export function refundText(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new Error("Refund amount is missing or invalid");
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `Hi, your $${value} deposit refund has been initiated. The time it takes to appear in your account depends on your bank.`;
}

export function refundPhone(phone: string | undefined): string {
  let value = (phone || "").replace(/[^\d+]/g, "");
  if (/^0\d{9}$/.test(value)) value = "+61" + value.slice(1);
  else if (/^61\d{9}$/.test(value)) value = "+" + value;
  if (!/^\+[1-9]\d{7,14}$/.test(value)) throw new Error("Patient phone number is missing or invalid");
  return value;
}

export type CheckedRefund = { state: "completed" | "pending" | "failed"; amount?: number; error?: string };

/** A refund reference alone is not proof of a completed refund. */
export function checkRefundObject(processor: string, raw: any, expected: { refundId: string; paymentId: string }): CheckedRefund {
  if (raw?.id !== expected.refundId) throw new Error("Refund reference does not match the appointment");
  const payment = processor === "square" ? raw.payment_id : typeof raw.payment_intent === "string" ? raw.payment_intent : raw.payment_intent?.id;
  if (!expected.paymentId || payment !== expected.paymentId) throw new Error("Refund payment does not match the appointment");
  const status = String(raw.status || "").toUpperCase();
  if (["FAILED", "REJECTED", "CANCELED"].includes(status)) return { state: "failed", error: raw.failure_reason || `Payment provider reported refund ${status.toLowerCase()}` };
  if (status === "REQUIRES_ACTION") return { state: "pending", error: "The payment provider requires action to complete this refund" };
  if (status === "PENDING" && raw.pending_reason === "insufficient_funds") return { state: "pending", error: "Refund is pending because the payment provider has insufficient funds" };
  // Only Square's verified PENDING refunds qualify for the processing receipt.
  // Stripe retains its existing completed-only notification policy.
  const processing = processor === "square" && status === "PENDING";
  if (status === "PENDING" && !processing) return { state: "pending" };
  if (!processing && !(processor === "square" ? status === "COMPLETED" : status === "SUCCEEDED")) throw new Error(`Unrecognised refund status: ${status || "missing"}`);
  const cents = processor === "square" ? Number(raw.amount_money?.amount) : Number(raw.amount);
  const currency = processor === "square" ? raw.amount_money?.currency : raw.currency;
  if (String(currency).toUpperCase() !== "AUD" || !Number.isSafeInteger(cents) || cents <= 0) throw new Error("Refund currency or amount could not be verified");
  return { state: processing ? "pending" : "completed", amount: cents / 100 };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function refundAlert(notice: RefundNotice) {
  const p = notice.payload;
  const title = p.category === "sms" ? "Refund text needs attention" : p.category === "verification" ? "Refund needs checking" : "Deposit refund needs attention";
  const explanation = p.category === "sms"
    ? "The refund notification text could not be confirmed as delivered. Check the SMS history before sending another message. Do not refund the payment again."
    : "Check the refund in the payment provider before retrying or arranging a manual refund.";
  const rows = [
    ["Patient", p.patient_name || "Unknown patient"], ["Phone", p.patient_phone || "Missing"],
    ["Clinic", p.clinic_name || "Not recorded"], ["Deposit", p.amount == null ? "Not recorded" : `$${Number(p.amount).toFixed(2)}`],
    ["Reason", p.reason || "Refund needs manual review"], ["Payment provider", p.processor || "Manual / unknown"],
    ["Payment reference", p.payment_id || "Not recorded"], ["Refund reference", p.refund_id || "Not recorded"],
    ["Appointment reference", notice.appointment_id || "Not recorded"],
  ];
  const text = `${title}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${explanation}\n\nhttps://hairtransplantgroup.lovable.app/booked-appointments`;
  const html = `<div style="font-family:Arial,sans-serif;color:#222;max-width:640px"><h2>${title}</h2><table cellpadding="7" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><th align="left" style="border-bottom:1px solid #eee">${escapeHtml(k)}</th><td style="border-bottom:1px solid #eee">${escapeHtml(v)}</td></tr>`).join("")}</table><p>${explanation}</p><p><a href="https://hairtransplantgroup.lovable.app/booked-appointments">Open appointments</a></p></div>`;
  return { subject: `${title} — ${p.patient_name || "Patient"}`, text, html };
}
