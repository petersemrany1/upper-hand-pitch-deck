import { createServerFn } from "@tanstack/react-start";


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
      from: "Peter Semrany <hello@upperhand.digital>",
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
      clinicAddress: string;
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

    try {
      // Step 1 — Create DocuSeal submission but don't send their email
      const docusealResponse = await fetch("https://api.docuseal.com/submissions", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: 3431176,
          send_email: false,
          submitters: [
            {
              role: "First Party",
              email: "hello@upperhand.digital",
              name: "Peter Semrany",
              completed: true,
              values: {
                "agreement_date": new Date().toLocaleDateString("en-AU"),
                "clinic_name": data.clinicName,
                "clinic_address": data.clinicAddress || "",
                "package_selected": data.packageName,
                "num_shows": String(data.shows),
                "per_show_fee": fmtDollar(data.perShowFee),
                "total_fee": fmtDollar(data.totalFee),
                "gst_amount": fmtDollar(gst),
                "total_inc_gst": fmtDollar(totalIncGst),
                "agency_date": new Date().toLocaleDateString("en-AU"),
              },
            },
            {
              role: "client",
              email: data.to,
              name: data.contactName,
              values: {},
            },
          ],
        }),
      });

      const docusealResult = await docusealResponse.json();
      console.error("DocuSeal full response:", JSON.stringify(docusealResult));

      if (!docusealResponse.ok) {
        console.error("DocuSeal error:", JSON.stringify(docusealResult));
        return { success: false, error: "Failed to prepare contract" };
      }

      // Step 2 — Extract the client signing URL from DocuSeal response
      let signingUrl: string | null = null;

      if (Array.isArray(docusealResult)) {
        const clientSub = docusealResult.find(
          (s: any) => s.role?.toLowerCase() === "client"
        );
        if (clientSub?.slug) {
          signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
        } else if (clientSub?.uuid) {
          signingUrl = `https://docuseal.com/s/${clientSub.uuid}`;
        }
      } else if (docusealResult?.submitters) {
        const clientSub = docusealResult.submitters.find(
          (s: any) => s.role?.toLowerCase() === "client"
        );
        if (clientSub?.slug) {
          signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
        }
      }

      if (!signingUrl) {
        return { success: false, error: "Could not get signing link" };
      }

      // Step 3 — Send our own branded email via Resend
      const firstName = data.contactName.trim().split(" ")[0];
      const html = [
        '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
        '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
        '<tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',

        // Header
        '<tr><td style="background:#0f172a;padding:32px 40px;">',
        '<span style="color:#ffffff;font-weight:800;font-size:20px;letter-spacing:-0.02em;">UPPER</span><span style="color:#2D6BE4;font-weight:800;font-size:20px;letter-spacing:-0.02em;">HAND</span>',
        '</td></tr>',

        // Body
        '<tr><td style="padding:40px;">',

        '<p style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">Hi ' + firstName + ',</p>',
        '<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Thank you for choosing Upper Hand Digital. Please find your Services Agreement ready for review and signature.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">Please click the button below to review and sign your agreement. It only takes a few minutes.</p>',

        // Button
        '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
        '<a href="' + signingUrl + '" style="display:inline-block;background:#2D6BE4;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Review &amp; Sign Agreement &rarr;</a>',
        '</td></tr></table>',

        '<p style="margin:32px 0 16px;color:#374151;font-size:15px;line-height:1.6;">Once signed we will be in touch to get everything underway.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">If you have any questions please reply to this email or reach out directly.</p>',

        // Divider
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />',

        // Signature
        '<p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">Peter Semrany</p>',
        '<p style="margin:2px 0 0;color:#6b7280;font-size:13px;">Upper Hand Digital</p>',
        '<p style="margin:2px 0 0;font-size:13px;"><a href="mailto:hello@upperhand.digital" style="color:#2D6BE4;text-decoration:none;">hello@upperhand.digital</a></p>',
        '<p style="margin:2px 0 0;font-size:13px;"><a href="https://www.upperhand.digital" style="color:#2D6BE4;text-decoration:none;">www.upperhand.digital</a></p>',

        '</td></tr></table></td></tr></table></body></html>',
      ].join("");

      return sendViaResend(
        data.to,
        "Your Upper Hand Digital Services Agreement",
        html
      );

    } catch (error) {
      console.error("Contract email failed:", error);
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
      '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Questions? Reply to this email or contact hello@upperhand.digital</p>',
      "</td></tr></table></td></tr></table></body></html>",
    ].join("");

    return sendViaResend(data.to, "Your Upper Hand Invoice", html);
  });
