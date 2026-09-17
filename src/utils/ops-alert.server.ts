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

/**
 * Fires when the ad spend feed has gone quiet (or errored), so the Numbers
 * page can never quietly show marketing figures that are missing days.
 */
export async function sendSpendFeedStaleAlert(params: {
  newestDate: string | null;
  reason: string;
  checkedAtSydney: string;
}): Promise<boolean> {
  const esc = (s: string) => s.replace(/</g, "&lt;");
  const since = params.newestDate
    ? `The last day of ad spend we hold is <strong>${esc(params.newestDate)}</strong>.`
    : "There is no ad spend recorded at all.";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55">
      <h2 style="font-size:18px;margin:0 0 12px">Ad spend feed has stopped updating</h2>
      <p style="margin:0 0 10px">The daily ad spend feed from Make.com is not delivering, so the marketing
      figures on the Numbers page are missing days and will read low.</p>
      <p style="margin:0 0 10px">${since}</p>
      <p style="margin:0 0 14px"><strong>What the check found:</strong> ${esc(params.reason)}</p>
      <p style="margin:0 0 6px"><strong>Two likely fixes, in this order:</strong></p>
      <ol style="margin:0 0 14px;padding-left:20px">
        <li style="margin-bottom:6px">Open Make.com &rsaquo; Connections and reauthorize the Facebook connection.</li>
        <li>Check the &lsquo;MASTER - Meta Ad Spend -&gt; HTG Portal&rsquo; scenario history at
          <a href="https://eu2.make.com">eu2.make.com</a>.</li>
      </ol>
      <p style="margin:0;font-size:12px;color:#666">Checked ${esc(params.checkedAtSydney)} (Sydney). You will get
      at most one of these a day.</p>
    </div>`;
  return sendOpsEmail("Ad spend feed has stopped updating", html);
}
