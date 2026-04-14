import { createServerFn } from "@tanstack/react-start";

const RESEND_API_KEY = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";

function fmtDollar(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

async function sendViaResend(to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Upper Hand <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", JSON.stringify(result));
      return { success: false, error: result.message || "Failed to send email" };
    }

    return { success: true, id: result.id };
  } catch (error) {
    console.error("Resend request failed:", error);
    return { success: false, error: "Request failed" };
  }
}

function buildContractHtml(d: {
  contactName: string;
  clinicName: string;
  packageName: string;
  shows: number;
  perShowFee: number;
  totalFee: number;
}) {
  const row = (label: string, value: string, bold?: boolean) =>
    '<tr><td style="padding:12px 20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:160px;">' +
    label +
    '</td><td style="padding:12px 20px;border-top:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:' +
    (bold ? "800" : "600") +
    ';">' +
    value +
    "</td></tr>";

  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
    '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',
    '<tr><td style="background:#0f172a;padding:32px 40px;">',
    '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Upper Hand</h1>',
    '<p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Digital Services Agreement</p>',
    "</td></tr>",
    '<tr><td style="padding:40px;">',
    '<h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">Hi ' + d.contactName + ",</h2>",
    '<p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">Thank you for choosing Upper Hand. Please find below the details of your Digital Services Agreement for <strong>' + d.clinicName + "</strong>. Kindly review the terms and reply to this email with your signed confirmation.</p>",
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">',
    '<tr style="background:#f8fafc;"><td style="padding:16px 20px;color:#0f172a;font-size:16px;font-weight:700;" colspan="2">Agreement Summary</td></tr>',
    row("Clinic", d.clinicName),
    row("Contact", d.contactName),
    row("Package", d.packageName),
    row("Number of Shows", String(d.shows)),
    row("Per Show Fee", fmtDollar(d.perShowFee)),
    '<tr style="background:#f0f9ff;"><td style="padding:16px 20px;border-top:2px solid #3b82f6;color:#0f172a;font-size:16px;font-weight:700;">Total Package Fee</td><td style="padding:16px 20px;border-top:2px solid #3b82f6;color:#3b82f6;font-size:22px;font-weight:800;">' + fmtDollar(d.totalFee) + "</td></tr>",
    "</table>",
    '<p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">To confirm this agreement, please reply to this email with <strong>&quot;I agree to the terms above&quot;</strong> along with your full name and the date.</p>',
    '<p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">If you have any questions or would like to discuss any aspect of this agreement, don\'t hesitate to reach out.</p>',
    '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Questions? Reply to this email or contact petersemrany1@gmail.com</p>',
    "</td></tr></table></td></tr></table></body></html>",
  ].join("");
}

export const sendContractEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      clinicName: string;
      contactName: string;
      packageName: string;
      shows: number;
      perShowFee: number;
      totalFee: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const html = buildContractHtml(data);
    return sendViaResend(
      data.to,
      "Your Upper Hand Digital Services Agreement \u2014 Please Review and Sign",
      html
    );
  });

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      clinicName: string;
      contactName: string;
      phone: string;
      packageName: string;
      amount: string;
      stripeLink: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
      '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
      '<tr><td align="center">',
      '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',
      '<tr><td style="background:#0f172a;padding:32px 40px;">',
      '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Upper Hand</h1>',
      "</td></tr>",
      '<tr><td style="padding:40px;">',
      '<h2 style="margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:700;">Invoice</h2>',
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">',
      '<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Clinic</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">' + data.clinicName + "</td></tr>",
      '<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Contact</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">' + data.contactName + "</td></tr>",
      '<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Phone</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">' + data.phone + "</td></tr>",
      '<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Package</td><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">' + data.packageName + "</td></tr>",
      '<tr><td style="padding:16px 0;color:#6b7280;font-size:14px;">Investment</td><td style="padding:16px 0;color:#0f172a;font-size:22px;font-weight:800;">' + data.amount + "</td></tr>",
      "</table>",
      data.stripeLink
        ? '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="' + data.stripeLink + '" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:18px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Pay Now</a></td></tr></table>'
        : "",
      '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Questions? Reply to this email or contact petersemrany1@gmail.com</p>',
      "</td></tr></table></td></tr></table></body></html>",
    ].join("");

    return sendViaResend(data.to, "Your Upper Hand Invoice", html);
  });
