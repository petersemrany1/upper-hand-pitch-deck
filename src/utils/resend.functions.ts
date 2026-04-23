import { createServerFn } from "@tanstack/react-start";
import { logError } from "./error-logger.functions";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";
const DOCUSEAL_API_KEY = "pF2cT3WqaK5YZGS6KYu8CXjWzrwW36PrKqNTeub1spt";
const BOLD_BLUE = "#2020E8";

function getAdminClient() {
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars for server");
  return createClient(url, key);
}

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
      from: "Bold Patients <admin@bold-patients.com>",
      reply_to: "admin@bold-patients.com",
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
      return { success: false, error: result.message || "Failed to send email", rawResponse: result };
    }

    return { success: true, id: result.id };
  } catch (error) {
    console.error("Resend request failed:", error);
    return { success: false, error: "Request failed" };
  }
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
    // data.totalFee is exc-GST. Forward-calculate from shows × perShowFee.
    const totalExcGst = data.shows * data.perShowFee;
    const gst = Math.round(totalExcGst * 0.10);
    const totalIncGst = totalExcGst + gst;

    // Format today as DD/MM/YYYY (en-AU)
    const today = new Date().toLocaleDateString("en-AU");

    // Template 3486637 was updated in DocuSeal so most contract fields now belong
    // to the Agency signer, while the Client signer only owns Client Name/Date.
    const docusealPayload = {
      template_id: 3486637,
      send_email: false,
      submitters: [
        {
          role: "Client",
          email: data.to,
          name: data.contactName,
          values: {
            "Client Name": data.contactName,
            "Client Date": today,
          },
        },
        {
          role: "Agency",
          email: "admin@bold-patients.com",
          name: "Bold Patients",
          completed: true,
          values: {
            "Agency Date": today,
            "Clinic Name": data.clinicName,
            "Clinic Address": data.clinicAddress || "",
            "Date": today,
            "Pack Name": data.packageName,
            "Number of Shows": String(data.shows),
            "Per Show Fee": String(Math.round(data.perShowFee)),
            "Total exc GST": String(Math.round(totalExcGst)),
            "GST Amount": String(Math.round(gst)),
            "Total inc GST": String(Math.round(totalIncGst)),
          },
        },
      ],
    };

    console.log("DocuSeal request payload:", JSON.stringify(docusealPayload, null, 2));

    try {
      // Step 1 — Create DocuSeal submission but don't send their email
      const docusealResponse = await fetch("https://api.docuseal.com/submissions", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(docusealPayload),
      });

      const docusealResult = await docusealResponse.json();
      console.log("DocuSeal full response:", JSON.stringify(docusealResult, null, 2));

      if (!docusealResponse.ok) {
        console.error("DocuSeal error:", JSON.stringify(docusealResult));
        await logError("sendContractEmail", "DocuSeal API returned error", {
          email: data.to,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: docusealResult,
          stepsToReproduce: `Sending contract to ${data.to} for ${data.packageName} pack`,
        });
        return { success: false, error: "Failed to prepare contract" };
      }

      // Step 2 — Extract the client signing URL from DocuSeal response
      let signingUrl: string | null = null;
      if (Array.isArray(docusealResult)) {
        const clientSub = docusealResult.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      } else if (docusealResult?.submitters) {
        const clientSub = docusealResult.submitters.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      }
      if (!signingUrl) {
        console.error("Could not extract signing URL. Full DocuSeal response:", JSON.stringify(docusealResult));
        await logError("sendContractEmail", "Could not extract signing URL from DocuSeal response", {
          email: data.to,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: docusealResult,
          stepsToReproduce: `Sending contract to ${data.to} for ${data.packageName} pack`,
        });
        return { success: false, error: "Could not get signing link — please try again." };
      }

      // Step 3 — Send our own branded Bold Patients email via Resend
      const firstName = data.contactName.trim().split(" ")[0];
      const html = [
        '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
        '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
        '<tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',

        // Header — Bold Patients branding
        '<tr><td style="background:#0f172a;padding:32px 40px;">',
        '<span style="color:#ffffff;font-weight:800;font-size:22px;letter-spacing:-0.02em;">BOLD</span>',
        '</td></tr>',

        // Body
        '<tr><td style="padding:40px;">',

        '<p style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">Hi ' + firstName + ',</p>',
        '<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Thank you for choosing Bold. Please find your Services Agreement ready for review and signature.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">Please click the button below to review and sign your agreement. It only takes a few minutes.</p>',

        // Button
        '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
        '<a href="' + signingUrl + '" style="display:inline-block;background:' + BOLD_BLUE + ';color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Review &amp; Sign Agreement &rarr;</a>',
        '</td></tr></table>',

        '<p style="margin:32px 0 16px;color:#374151;font-size:15px;line-height:1.6;">Once signed we will be in touch to get everything underway.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">If you have any questions please reply to this email or reach out directly.</p>',

        // Divider
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />',

        // Signature
        '<p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">Bold Patients</p>',
        '<p style="margin:2px 0 0;font-size:13px;"><a href="mailto:admin@bold-patients.com" style="color:' + BOLD_BLUE + ';text-decoration:none;">admin@bold-patients.com</a></p>',

        '</td></tr></table></td></tr></table></body></html>',
      ].join("");

      // Send directly via Resend so we can override the "from" address to Bold Patients
      let resendResult: { success: boolean; id?: string; error?: string };
      let rawResendResponse: unknown = null;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Bold Patients <admin@bold-patients.com>",
            reply_to: "admin@bold-patients.com",
            to: [data.to],
            subject: "Your Bold Patients Services Agreement",
            html,
          }),
        });
        const r = await response.json();
        rawResendResponse = r;
        if (!response.ok) {
          console.error("Resend error:", JSON.stringify(r));
          resendResult = { success: false, error: r.message || "Failed to send email" };
        } else {
          resendResult = { success: true, id: r.id };
        }
      } catch (err) {
        console.error("Resend request failed:", err);
        resendResult = { success: false, error: "Request failed" };
      }

      if (!resendResult.success) {
        await logError("sendContractEmail", resendResult.error || "Resend failed", {
          email: data.to,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: rawResendResponse,
          stepsToReproduce: `Sending contract to ${data.to} for ${data.packageName} pack`,
        });
      } else {
        // Log successful contract send
        try {
          const admin = getAdminClient();
          await admin.from("contract_logs").insert({
            clinic_name: data.clinicName,
            contact_name: data.contactName,
            email: data.to,
            package_name: data.packageName,
            status: "sent",
          });
        } catch (logErr) {
          console.error("Failed to log contract:", logErr);
        }
      }

      return resendResult;

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Contract email failed:", error);
      await logError("sendContractEmail", errMsg, {
        email: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
        stepsToReproduce: `Sending contract to ${data.to} for ${data.packageName} pack`,
      });
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
      '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;text-align:center;">Questions? Reply to this email or contact admin@bold-patients.com</p>',
      "</td></tr></table></td></tr></table></body></html>",
    ].join("");

    const result = await sendViaResend(data.to, "Your Upper Hand Invoice", html);

    if (!result.success) {
      await logError("sendInvoiceEmail", result.error || "Resend failed", {
        email: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
        rawResponse: (result as any).rawResponse,
        stepsToReproduce: `Sending invoice to ${data.to} for ${data.packageName} pack (${data.amount})`,
      });
    }

    return result;
  });
