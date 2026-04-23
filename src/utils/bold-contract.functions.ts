import { createServerFn } from "@tanstack/react-start";
import { logError } from "./error-logger.functions";
import { createClient } from "@supabase/supabase-js";

const RESEND_API_KEY = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";
const DOCUSEAL_API_KEY = "pF2cT3WqaK5YZGS6KYu8CXjWzrwW36PrKqNTeub1spt";
const BOLD_TEMPLATE_ID = 3486637;
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

export const sendBoldContractEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      clinicName: string;
      clinicAddress: string;
      contactName: string;
      packName: string;
      shows: number;
      perShowFee: number;
      totalExGst: number;
      gstAmount: number;
      totalIncGst: number;
      agreementDate: string;
    }) => data
  )
  .handler(async ({ data }) => {
    try {
      // Step 1 — Create DocuSeal submission
      const docusealResponse = await fetch("https://api.docuseal.com/submissions", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: BOLD_TEMPLATE_ID,
          send_email: false,
          submitters: [
            {
              role: "First Party",
              email: "admin@bold-patients.com",
              name: "Bold Patients",
              completed: true,
              values: {
                agreement_date: data.agreementDate,
                clinic_name: data.clinicName,
                clinic_address: data.clinicAddress || "",
                package_selected: data.packName,
                num_shows: String(data.shows),
                per_show_fee: fmtDollar(data.perShowFee),
                total_fee: fmtDollar(data.totalExGst),
                gst_amount: fmtDollar(data.gstAmount),
                total_inc_gst: fmtDollar(data.totalIncGst),
                agency_date: data.agreementDate,
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

      if (!docusealResponse.ok) {
        await logError("sendBoldContractEmail", "DocuSeal API returned error", {
          email: data.to,
          clinicName: data.clinicName,
          packName: data.packName,
          rawResponse: docusealResult,
        });
        return { success: false, error: "Failed to prepare contract" };
      }

      // Step 2 — Extract client signing URL
      let signingUrl: string | null = null;
      if (Array.isArray(docusealResult)) {
        const clientSub = docusealResult.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      } else if (docusealResult?.submitters) {
        const clientSub = docusealResult.submitters.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      }
      if (!signingUrl) {
        await logError("sendBoldContractEmail", "Could not extract signing URL", {
          email: data.to,
          clinicName: data.clinicName,
          rawResponse: docusealResult,
        });
        return { success: false, error: "Could not get signing link — please try again." };
      }

      // Step 3 — Send branded Bold Patients email via Resend
      const firstName = data.contactName.trim().split(" ")[0] || "there";
      const html = [
        '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
        '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
        '<tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',

        // Header — Bold Patients branding
        '<tr><td style="background:#0f172a;padding:32px 40px;">',
        '<span style="color:#ffffff;font-weight:800;font-size:22px;letter-spacing:-0.02em;">BOLD</span><span style="color:' + BOLD_BLUE + ';font-weight:800;font-size:22px;letter-spacing:-0.02em;"> PATIENTS</span>',
        "</td></tr>",

        // Body
        '<tr><td style="padding:40px;">',
        '<p style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">Hi ' + firstName + ",</p>",
        '<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Thank you for choosing Bold Patients. Please find your Services Agreement ready for review and signature.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">Please click the button below to review and sign your agreement. It only takes a few minutes.</p>',

        // CTA Button
        '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
        '<a href="' + signingUrl + '" style="display:inline-block;background:' + BOLD_BLUE + ';color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Review &amp; Sign Agreement &rarr;</a>',
        "</td></tr></table>",

        '<p style="margin:32px 0 16px;color:#374151;font-size:15px;line-height:1.6;">Once signed we will be in touch to get everything underway.</p>',
        '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">If you have any questions please reply to this email or reach out directly.</p>',

        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;" />',

        // Signature
        '<p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">Bold Patients</p>',
        '<p style="margin:2px 0 0;font-size:13px;"><a href="mailto:admin@bold-patients.com" style="color:' + BOLD_BLUE + ';text-decoration:none;">admin@bold-patients.com</a></p>',

        "</td></tr></table></td></tr></table></body></html>",
      ].join("");

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

      const resendResult = await response.json();

      if (!response.ok) {
        await logError("sendBoldContractEmail", resendResult.message || "Resend failed", {
          email: data.to,
          clinicName: data.clinicName,
          packName: data.packName,
          rawResponse: resendResult,
        });
        return { success: false, error: resendResult.message || "Failed to send email" };
      }

      // Log successful contract send
      try {
        const admin = getAdminClient();
        await admin.from("contract_logs").insert({
          clinic_name: data.clinicName,
          contact_name: data.contactName,
          email: data.to,
          package_name: data.packName,
          status: "sent",
          source: "bold_patients",
        });
      } catch (logErr) {
        console.error("Failed to log Bold contract:", logErr);
      }

      return { success: true, id: resendResult.id };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await logError("sendBoldContractEmail", errMsg, {
        email: data.to,
        clinicName: data.clinicName,
        packName: data.packName,
      });
      return { success: false, error: "Request failed" };
    }
  });
