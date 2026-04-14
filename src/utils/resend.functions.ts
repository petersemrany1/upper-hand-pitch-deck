import { createServerFn } from "@tanstack/react-start";

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
    const apiKey = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Upper Hand</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 24px;color:#0f172a;font-size:20px;font-weight:700;">Invoice</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:140px;">Clinic</td>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">${data.clinicName}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Contact</td>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">${data.contactName}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Phone</td>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">${data.phone}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Package</td>
              <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:14px;font-weight:600;">${data.packageName}</td>
            </tr>
            <tr>
              <td style="padding:16px 0;color:#6b7280;font-size:14px;">Investment</td>
              <td style="padding:16px 0;color:#0f172a;font-size:22px;font-weight:800;">${data.amount}</td>
            </tr>
          </table>
          ${data.stripeLink ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${data.stripeLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:18px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Pay Now</a>
          </td></tr></table>` : ''}
          <p style="margin:32px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Questions? Reply to this email or contact petersemrany1@gmail.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "Upper Hand <onboarding@resend.dev>",
          to: [data.to],
          subject: "Your Upper Hand Invoice",
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
  });
