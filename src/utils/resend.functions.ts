import { createServerFn } from "@tanstack/react-start";
import { generateContractFromTemplate } from "./contract-pdf";

const RESEND_API_KEY = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";
const DOCUSEAL_API_KEY = "pF2cT3WqaK5YZGS6KYu8CXjWzrwW36PrKqNTeub1spt";

function fmtDollar(n: number) {
  return "$" + Math.round(n).toLocaleString();
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: string }>
) {
  try {
    const body: Record<string, unknown> = {
      from: "Upper Hand <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    };
    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify(body),
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

// ─── Uint8Array to base64 ───
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── SERVER FUNCTIONS ───

export const sendContractEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      clinicName: string;
      contactName: string;
      phone: string;
      packageName: string;
      shows: number;
      perShowFee: number;
      totalFee: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const gst = data.totalFee * 0.1;
    const totalIncGst = data.totalFee + gst;

    const today = new Date();
    const dateStr =
      today.getDate() +
      " " +
      ["January","February","March","April","May","June","July","August","September","October","November","December"][today.getMonth()] +
      " " +
      today.getFullYear();

    const pdfBytes = await generateContractFromTemplate({
      clientName: data.contactName,
      clinicName: data.clinicName,
      clientEmail: data.to,
      clientPhone: data.phone,
      date: dateStr,
      packageName: data.packageName,
      numShows: data.shows,
      perShowFee: data.perShowFee,
      totalExGst: data.totalFee,
      gstAmount: gst,
      totalIncGst: totalIncGst,
    });

    const pdfBase64 = uint8ToBase64(pdfBytes);

    try {
      const response = await fetch("https://api.docuseal.com/submissions/pdf", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Upper Hand Agreement — " + data.clinicName,
          send_email: false,
          order: "preserved",
          documents: [
            {
              name: "Upper_Hand_Agreement_" + data.clinicName.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf",
              file: pdfBase64,
              fields: [
                {
                  name: "Provider Signature",
                  type: "signature",
                  role: "Provider",
                  required: true,
                  areas: [{ x: 60, y: 680, w: 200, h: 40, page: -1 }],
                },
                {
                  name: "Provider Date",
                  type: "date",
                  role: "Provider",
                  required: true,
                  areas: [{ x: 60, y: 730, w: 150, h: 20, page: -1 }],
                },
                {
                  name: "Client Signature",
                  type: "signature",
                  role: "Client",
                  required: true,
                  areas: [{ x: 320, y: 680, w: 200, h: 40, page: -1 }],
                },
                {
                  name: "Client Date",
                  type: "date",
                  role: "Client",
                  required: true,
                  areas: [{ x: 320, y: 730, w: 150, h: 20, page: -1 }],
                },
              ],
            },
          ],
          submitters: [
            {
              name: "Peter Semrany",
              email: "petersemrany1@gmail.com",
              role: "Provider",
              completed: true,
              send_email: false,
            },
            {
              name: data.contactName,
              email: data.to,
              role: "Client",
              send_email: false,
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("DocuSeal error:", JSON.stringify(result));
        return { success: false, error: result.error || result.message || "Failed to send contract for signing" };
      }

      // Extract client signing URL from DocuSeal response
      // Response is an array of submitter objects with embed_src / slug
      const submitters = Array.isArray(result) ? result : [];
      const clientSubmitter = submitters.find(
        (s: { role?: string; email?: string }) => s.role === "Client" || s.email === data.to
      );
      const signingUrl = clientSubmitter?.embed_src || "";

      if (!signingUrl) {
        console.error("DocuSeal response missing signing URL:", JSON.stringify(result));
        return { success: false, error: "Failed to get signing link" };
      }

      // Send email via Resend with the signing link
      const firstName = data.contactName.trim().split(" ")[0];
      const emailHtml = [
        '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
        '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
        '<tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',
        '<tr><td style="background:#0f172a;padding:32px 40px;">',
        '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Upper Hand</h1>',
        "</td></tr>",
        '<tr><td style="padding:40px;">',
        '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Hi ' + firstName + ",</p>",
        '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Your Upper Hand Digital Services Agreement is ready to sign.</p>',
        '<p style="margin:0 0 24px;color:#0f172a;font-size:15px;line-height:1.6;">Click the button below to review and sign your agreement:</p>',
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">',
        '<a href="' + signingUrl + '" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:18px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Review & Sign Agreement</a>',
        "</td></tr></table>",
        '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Once signed, both parties will automatically receive a fully executed copy.</p>',
        '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Any questions just reply to this message.</p>',
        '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;">\u2014 Upper Hand Digital</p>',
        "</td></tr></table></td></tr></table></body></html>",
      ].join("");

      const emailResult = await sendViaResend(
        data.to,
        "Your Upper Hand Digital Services Agreement \u2014 Please Review and Sign",
        emailHtml
      );

      if (!emailResult.success) {
        return { success: false, error: emailResult.error || "Failed to send email" };
      }

      return { success: true };
    } catch (error) {
      console.error("DocuSeal/Resend request failed:", error);
      return { success: false, error: "Request failed" };
    }
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
