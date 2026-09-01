// Ops alerting. The address used to be hard-coded in several places; it now
// comes from OPS_ALERT_EMAIL, falling back to the previous hard-coded value so
// behaviour is unchanged when the secret is missing.

const FALLBACK_OPS_EMAIL = "peter@gobold.com.au";

export function opsAlertEmail(): string {
  return process.env["OPS_ALERT_EMAIL"]?.trim() || FALLBACK_OPS_EMAIL;
}

const RESEND_CONNECTION_KEY = () => process.env["RESEND_API_KEY"] ?? "";
const LOVABLE_API_KEY = () => process.env["LOVABLE_API_KEY"] ?? "";

async function sendOpsEmail(subject: string, html: string): Promise<boolean> {
  const connKey = RESEND_CONNECTION_KEY();
  const lovableKey = LOVABLE_API_KEY();
  if (!connKey || !lovableKey) {
    console.warn("ops alert: email keys missing, skipping", subject);
    return false;
  }
  try {
    const response = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Connection-Api-Key": connKey,
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        from: "Bold Patients <admin@bold-patients.com>",
        to: [opsAlertEmail()],
        subject,
        html,
      }),
    });
    if (!response.ok) {
      console.warn("ops alert: send failed", response.status, await response.text());
      return false;
    }
    return true;
  } catch (e) {
    console.warn("ops alert: send error", e);
    return false;
  }
}

/**
 * Fires when a booking-fee refund could not be completed. Previously nothing
 * was notified and the failure only lived in a DB column.
 */
export async function sendRefundFailureAlert(params: {
  patientName?: string | null;
  leadId?: string | null;
  appointmentId?: string | null;
  processor: "square" | "stripe" | "unknown";
  paymentId?: string | null;
  refundId?: string | null;
  error: string;
}): Promise<boolean> {
  const rows: [string, string | null | undefined][] = [
    ["Patient", params.patientName],
    ["Lead id", params.leadId],
    ["Appointment id", params.appointmentId],
    ["Processor", params.processor],
    ["Payment id", params.paymentId],
    ["Refund id", params.refundId],
    ["Error", params.error],
  ];
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
      <h2 style="font-size:18px;margin:0 0 12px">Booking fee refund failed</h2>
      <p style="margin:0 0 12px">A $75 booking fee refund did not complete. It needs to be actioned manually.</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .filter(([, v]) => Boolean(v))
          .map(
            ([k, v]) =>
              `<tr><td style="border:1px solid #e5e5e5"><strong>${k}</strong></td><td style="border:1px solid #e5e5e5">${String(
                v,
              ).replace(/</g, "&lt;")}</td></tr>`,
          )
          .join("")}
      </table>
    </div>`;
  return sendOpsEmail("Booking fee refund failed", html);
}
