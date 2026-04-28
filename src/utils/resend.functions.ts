import { createServerFn } from "@tanstack/react-start";
import { logError } from "./error-logger.functions";
import { createClient } from "@supabase/supabase-js";
import { createStripeCheckoutSession, createHtgDepositSession } from "./stripe.functions";

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

export const sendContractSMS = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      to: string;
      clinicName: string;
      clinicAddress: string;
      contactName: string;
      packageName: string;
      shows: number;
      perShowFee: number;
    }) => data
  )
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER ?? "+61483938205";

    if (!accountSid || !authToken) {
      const msg = "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured";
      await logError("sendContractSMS", msg, {
        phone: data.to,
        clinicName: data.clinicName,
        stepsToReproduce: "Server env vars missing for Twilio SMS",
      });
      return { success: false as const, error: msg };
    }

    const totalExcGst = data.shows * data.perShowFee;
    const gst = Math.round(totalExcGst * 0.10);
    const totalIncGst = totalExcGst + gst;
    const today = new Date().toLocaleDateString("en-AU");

    // Step 1 — Create DocuSeal submission (no email, we want the URL ourselves)
    let signingUrl: string | null = null;
    try {
      const docusealResponse = await fetch("https://api.docuseal.com/submissions", {
        method: "POST",
        headers: {
          "X-Auth-Token": DOCUSEAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: 3486637,
          send_email: false,
          submitters: [
            {
              role: "Client",
              email: data.to,
              name: data.contactName,
              values: { "Client Name": data.contactName, "Client Date": today },
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
        }),
      });

      const docusealResult = await docusealResponse.json();
      if (!docusealResponse.ok) {
        await logError("sendContractSMS", "DocuSeal API returned error", {
          phone: data.to,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: docusealResult,
        });
        return { success: false as const, error: "Failed to prepare contract" };
      }

      if (Array.isArray(docusealResult)) {
        const clientSub = docusealResult.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      } else if (docusealResult?.submitters) {
        const clientSub = docusealResult.submitters.find((s: any) => s.role?.toLowerCase() === "client");
        if (clientSub?.slug) signingUrl = `https://docuseal.com/s/${clientSub.slug}`;
      }

      if (!signingUrl) {
        await logError("sendContractSMS", "Could not extract signing URL from DocuSeal response", {
          phone: data.to,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: docusealResult,
        });
        return { success: false as const, error: "Could not get signing link — please try again." };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logError("sendContractSMS", errMsg, {
        phone: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
      });
      return { success: false as const, error: "Failed to prepare contract" };
    }

    // Step 2 — Format AU phone
    let formattedPhone = data.to.replace(/[\s\-()]/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+61" + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+61" + formattedPhone;
    }

    const firstName = data.contactName.trim().split(" ")[0] || "there";
    const message = `Hi ${firstName}, here's your Bold Patients Services Agreement ready to review and sign: ${signingUrl} — any questions, just reply.`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: fromNumber,
          Body: message,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        await logError("sendContractSMS", result.message || "Twilio SMS failed", {
          phone: data.to,
          formattedPhone,
          clinicName: data.clinicName,
          packageName: data.packageName,
          rawResponse: result,
        });
        return { success: false as const, error: result.message || "Failed to send SMS" };
      }

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

      return { success: true as const, sid: result.sid };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logError("sendContractSMS", errMsg, {
        phone: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
      });
      return { success: false as const, error: "Request failed" };
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
    if (!data.stripeLink.trim()) {
      await logError("sendInvoiceEmail", "Missing payment link", {
        email: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
        stepsToReproduce: `Sending payment link to ${data.to} for ${data.packageName} pack (${data.amount}) without a configured Stripe URL`,
      });
      return { success: false, error: "No Stripe payment link is configured for this package at the current price." };
    }

    const firstName = data.contactName.trim().split(" ")[0];

    const html = [
      '<!DOCTYPE html><html><head><meta charset="utf-8" /></head>',
      '<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">',
      '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">',
      '<tr><td align="center">',
      '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">',

      // Header — Bold branding
      '<tr><td style="background:#0f172a;padding:32px 40px;">',
      '<span style="color:#ffffff;font-weight:800;font-size:22px;letter-spacing:-0.02em;">BOLD</span>',
      '</td></tr>',

      // Body
      '<tr><td style="padding:40px;">',
      '<p style="margin:0 0 20px;color:#0f172a;font-size:18px;font-weight:600;">Hi ' + firstName + ',</p>',
      '<p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">Here\'s your payment link for the <strong>' + data.packageName + '</strong> package (' + data.amount + ' inc GST). Click the button below to pay securely.</p>',

      // Button
      '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="' + data.stripeLink + '" style="display:inline-block;background:' + BOLD_BLUE + ';color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:8px;">Pay Now &rarr;</a></td></tr></table>',

      '<p style="margin:32px 0 0;color:#374151;font-size:14px;line-height:1.6;">Any questions, just reply to this email.</p>',

      // Divider
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 24px;" />',

      // Footer
      '<p style="margin:0;color:#0f172a;font-size:14px;font-weight:700;">Bold Patients</p>',
      '<p style="margin:2px 0 0;font-size:13px;"><a href="mailto:admin@bold-patients.com" style="color:' + BOLD_BLUE + ';text-decoration:none;">admin@bold-patients.com</a></p>',

      '</td></tr></table></td></tr></table></body></html>',
    ].join("");

    const result = await sendViaResend(data.to, "Your Bold Patients Payment Link", html);

    if (!result.success) {
      await logError("sendInvoiceEmail", result.error || "Resend failed", {
        email: data.to,
        clinicName: data.clinicName,
        packageName: data.packageName,
        rawResponse: (result as any).rawResponse,
        stepsToReproduce: `Sending payment link to ${data.to} for ${data.packageName} pack (${data.amount})`,
      });
    }

    return result;
  });

export const sendClinicHandoverEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      leadId: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      callNotes: string;
      fundingPreference: string | null;
      financeEligible: boolean | null;
      bookingDate: string;
      bookingTime: string;
      clinicName: string;
      clinicEmail: string | null;
      doctorName: string | null;
      depositPaid: boolean;
    }) => data
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
    const bookingDisplay = (() => {
      try {
        const d = new Date(`${data.bookingDate}T${data.bookingTime}`);
        return d.toLocaleString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return `${data.bookingDate} at ${data.bookingTime}`;
      }
    })();

    const fundingLabel = (() => {
      const f = (data.fundingPreference ?? "").toLowerCase();
      if (f.includes("super")) return "Superannuation";
      if (f.includes("finance") || f.includes("payment")) return "Payment Plan / Finance";
      if (f.includes("saving")) return "Savings";
      return data.fundingPreference || "Not specified";
    })();

    let aiSummary = "";
    if (apiKey && data.callNotes?.trim()) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 300,
            system: `You are writing a warm internal handover note for a hair transplant clinic. Based on call notes from a sales consultant, write 2-3 sentences summarising: the patient's main pain points (what's bothering them about their hair loss), their emotional motivation (why now), and anything else that will help the clinic team build rapport on the day. Write in third person (e.g. "Michael has been..."). Be warm, specific, and use the patient's own words where possible. Do not mention prices, deposits, or funding — those are shown separately. Do not use bullet points. Plain prose only.`,
            messages: [{ role: "user", content: `Patient name: ${fullName}\n\nCall notes:\n${data.callNotes}` }],
          }),
        });
        const json = await res.json();
        aiSummary = json?.content?.[0]?.text?.trim() ?? "";
      } catch {
        /* non-fatal */
      }
    }

    const CORAL = "#f4522d";
    const LIGHT_CORAL = "#fff5f3";
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const intelBody = aiSummary
      ? `<p style="margin:0;font-size:15px;line-height:1.6;color:#2a2a2a;">${esc(aiSummary)}</p>`
      : data.callNotes
      ? `<p style="margin:0;font-size:14px;line-height:1.6;color:#444;white-space:pre-wrap;">${esc(
          data.callNotes.slice(0, 400)
        )}${data.callNotes.length > 400 ? "…" : ""}</p>`
      : `<p style="margin:0;font-size:14px;color:#888;font-style:italic;">No call notes recorded.</p>`;

    const financeCell =
      data.financeEligible === true
        ? "✅ Yes"
        : data.financeEligible === false
        ? "❌ No"
        : "Not checked";

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
            <tr>
              <td style="background:${CORAL};padding:28px 32px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;">Hair Transplant Group</div>
                <div style="font-size:24px;font-weight:700;margin-top:6px;">New Booking — ${esc(fullName)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Hi ${esc(data.clinicName)} team,</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">We've just confirmed a consultation booking with <b>${esc(fullName)}</b>. Here's everything you need to know before they arrive.</p>

                <div style="background:${LIGHT_CORAL};border-left:4px solid ${CORAL};padding:16px 20px;border-radius:6px;margin-bottom:24px;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${CORAL};font-weight:600;margin-bottom:6px;">Appointment</div>
                  <div style="font-size:17px;font-weight:600;color:#1a1a1a;">${esc(bookingDisplay)}</div>
                  ${data.doctorName ? `<div style="font-size:14px;color:#555;margin-top:4px;">With ${esc(data.doctorName)}</div>` : ""}
                </div>

                <div style="margin-bottom:24px;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${CORAL};font-weight:600;margin-bottom:10px;">Patient Intel</div>
                  ${intelBody}
                </div>

                <div style="margin-bottom:24px;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${CORAL};font-weight:600;margin-bottom:10px;">Key Facts</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;width:45%;">Funding Method</td>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-weight:600;">${esc(fundingLabel)}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Finance Eligible</td>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-weight:600;">${financeCell}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Deposit Paid</td>
                      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#1a1a1a;font-weight:600;">${data.depositPaid ? "✅ Yes — $75" : "❌ No deposit recorded"}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0;color:#666;">Understands Cost</td>
                      <td style="padding:10px 0;color:#1a1a1a;font-weight:600;">✅ Yes — quoted range</td>
                    </tr>
                  </table>
                </div>

                <div style="background:#fafafa;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
                  <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:${CORAL};font-weight:600;margin-bottom:10px;">Patient Contact</div>
                  ${data.phone ? `<div style="font-size:14px;color:#1a1a1a;margin-bottom:4px;">📞 <a href="tel:${esc(data.phone)}" style="color:#1a1a1a;text-decoration:none;">${esc(data.phone)}</a></div>` : ""}
                  ${data.email ? `<div style="font-size:14px;color:#1a1a1a;">✉️ <a href="mailto:${esc(data.email)}" style="color:#1a1a1a;text-decoration:none;">${esc(data.email)}</a></div>` : ""}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#888;line-height:1.5;">
                This handover was generated automatically by Hair Transplant Group after a confirmed booking. If you have any questions about this patient, reply to this email.<br/>
                — Hair Transplant Group
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const clinicEmailTo = data.clinicEmail || "peter@gobold.com.au";
    const result = await sendViaResend(
      clinicEmailTo,
      `New Booking: ${fullName} — ${bookingDisplay}`,
      html
    );

    if (!result.success) {
      await logError("sendClinicHandoverEmail", result.error || "Resend failed", {
        leadId: data.leadId,
        clinicName: data.clinicName,
      });
    }

    return result;
  });

export const sendDepositSmsToPatient = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      leadId: string;
      firstName: string;
      phone: string;
      clinicName: string;
      doctorName: string | null;
      bookingDate: string;
      bookingTime: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM = "+61468031075";

    if (!accountSid || !authToken) {
      return { success: false as const, error: "Twilio credentials not configured" };
    }

    const stripeResult = await createHtgDepositSession({
      data: {
        firstName: data.firstName,
        lastName: "",
        email: "",
        amount: 75,
        leadId: data.leadId,
      },
    });

    if (!stripeResult.success) {
      return { success: false as const, error: `Stripe failed: ${stripeResult.error}` };
    }

    const stripeUrl = stripeResult.url;

    const bookingDisplay = (() => {
      try {
        const d = new Date(`${data.bookingDate}T${data.bookingTime}`);
        return d.toLocaleString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return `${data.bookingDate} at ${data.bookingTime}`;
      }
    })();

    const doctorDisplay = data.doctorName ?? "your specialist";

    const message = `Hi ${data.firstName}, your consultation with ${doctorDisplay} is confirmed for ${bookingDisplay}. To secure your spot, please pay the $75 refundable deposit here: ${stripeUrl} — it's fully refunded when you arrive. See you soon!`;

    const raw = data.phone.replace(/[\s\-()]/g, "");
    const formatted = raw.startsWith("+")
      ? raw
      : raw.startsWith("0")
      ? "+61" + raw.slice(1)
      : "+61" + raw;

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formatted,
            From: TWILIO_FROM,
            Body: message,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        await logError("sendDepositSmsToPatient", result.message || "Twilio SMS failed", {
          leadId: data.leadId,
          phone: formatted,
        });
        return { success: false as const, error: result.message || "SMS failed" };
      }

      return { success: true as const, sid: result.sid as string, stripeUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await logError("sendDepositSmsToPatient", msg, { leadId: data.leadId });
      return { success: false as const, error: msg };
    }
  });

export const sendBookingConfirmationSms = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      leadId: string;
      firstName: string;
      phone: string;
      clinicName: string;
      doctorName: string | null;
      bookingDate: string;
      bookingTime: string;
      clinicAddress?: string | null;
    }) => data
  )
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM = "+61468031075";

    if (!accountSid || !authToken) {
      return { success: false as const, error: "Twilio credentials not configured" };
    }

    const bookingDisplay = (() => {
      try {
        const d = new Date(`${data.bookingDate}T${data.bookingTime}`);
        return d.toLocaleString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return `${data.bookingDate} at ${data.bookingTime}`;
      }
    })();

    const doctorDisplay = data.doctorName ?? "your specialist";
    const address = data.clinicAddress || "64 Lincoln Rd Essendon VIC 3040";

    const message = `Hi ${data.firstName}, your hair transplant consultation is confirmed for ${bookingDisplay} with ${doctorDisplay} at ${data.clinicName}. Address: ${address}. Free parking on site. See you soon! — Hair Transplant Group`;

    const raw = data.phone.replace(/[\s\-()]/g, "");
    const formatted = raw.startsWith("+")
      ? raw
      : raw.startsWith("0")
      ? "+61" + raw.slice(1)
      : "+61" + raw;

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: formatted,
            From: TWILIO_FROM,
            Body: message,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        await logError("sendBookingConfirmationSms", result.message || "Twilio SMS failed", {
          leadId: data.leadId,
          phone: formatted,
        });
        return { success: false as const, error: result.message || "SMS failed" };
      }

      return { success: true as const, sid: result.sid as string };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await logError("sendBookingConfirmationSms", msg, { leadId: data.leadId });
      return { success: false as const, error: msg };
    }
  });

/* ──────────────── Manual SMS from sales call portal ──────────────── */

export const sendManualSms = createServerFn({ method: "POST" })
  .inputValidator((data: { leadId: string; phone: string; body: string }) => data)
  .handler(async ({ data }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM = "+61468031075";
    if (!accountSid || !authToken) {
      return { success: false as const, error: "Twilio not configured" };
    }
    if (!data.body.trim()) {
      return { success: false as const, error: "Message is empty" };
    }

    const raw = data.phone.replace(/[\s\-()]/g, "");
    const formatted = raw.startsWith("+")
      ? raw
      : raw.startsWith("0")
      ? "+61" + raw.slice(1)
      : "+61" + raw;

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: formatted, From: TWILIO_FROM, Body: data.body }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        await logError("sendManualSms", result.message || "Twilio SMS failed", {
          leadId: data.leadId,
          phone: formatted,
        });
        return { success: false as const, error: result.message || "SMS failed" };
      }

      // Log to sms_messages
      try {
        const admin = getAdminClient();
        await admin.from("sms_messages").insert({
          lead_id: data.leadId,
          body: data.body,
          direction: "outbound",
          sent_at: new Date().toISOString(),
          phone: formatted,
          to_number: formatted,
          from_number: TWILIO_FROM,
          twilio_message_sid: result.sid,
          status: "sent",
        });
      } catch (logErr) {
        // Logging failure shouldn't block success response
        console.error("Failed to log SMS:", logErr);
      }

      return { success: true as const, sid: result.sid as string };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      await logError("sendManualSms", msg, { leadId: data.leadId });
      return { success: false as const, error: msg };
    }
  });

/* ──────────────── Pattern analysis (Claude via Lovable AI Gateway) ──────────────── */

export const analyseCallPatterns = createServerFn({ method: "POST" })
  .inputValidator((data: { range: "today" | "yesterday" | "week" | "lastweek" | "30d" }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { success: false as const, error: "AI gateway not configured" };
    }

    const now = new Date();
    const from = new Date();
    let to = new Date(now);
    if (data.range === "today") {
      from.setHours(0, 0, 0, 0);
    } else if (data.range === "yesterday") {
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date();
      to.setHours(0, 0, 0, 0);
    } else if (data.range === "week") {
      from.setDate(from.getDate() - 7);
    } else if (data.range === "lastweek") {
      from.setDate(from.getDate() - 14);
      to = new Date();
      to.setDate(to.getDate() - 7);
    } else {
      from.setDate(from.getDate() - 30);
    }

    const admin = getAdminClient();
    const { data: leads } = await admin
      .from("meta_leads")
      .select("call_notes, status, first_name")
      .gte("updated_at", from.toISOString())
      .lte("updated_at", to.toISOString())
      .not("call_notes", "is", null);

    const notes = (leads ?? [])
      .map((l: { call_notes: string | null; status: string | null; first_name: string | null }) =>
        `[${l.status ?? "unknown"}] ${l.first_name ?? ""}: ${l.call_notes}`
      )
      .filter((n: string) => n.length > 20)
      .join("\n\n---\n\n");

    if (!notes.trim()) {
      return { success: true as const, text: "No call notes found for this period.", count: 0 };
    }

    const systemPrompt = `You are a sales performance analyst for Hair Transplant Group, an Australian hair transplant lead generation business. Analyse the following call notes and patient summaries and provide insights in these exact sections:

1. TOP OBJECTIONS — What are the most common reasons people are saying no or getting off the phone?
2. MAIN PAIN POINTS — What hair loss concerns keep coming up?
3. DREAM OUTCOMES — What are people most excited about? What do they want?
4. WHAT'S KEEPING PEOPLE ON THE PHONE — What topics or approaches are generating the longest conversations?
5. PATTERNS TO ACT ON — 2-3 specific things the rep should change or double down on based on this data.

Be specific. Use numbers where possible (e.g. "6 out of 10 mentioned..."). Plain prose, no fluff.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Call notes from ${leads?.length ?? 0} leads:\n\n${notes}` },
          ],
          max_tokens: 1200,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { success: false as const, error: json?.error?.message || "AI request failed" };
      }
      const text = json?.choices?.[0]?.message?.content ?? "No analysis returned.";
      return { success: true as const, text, count: leads?.length ?? 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      return { success: false as const, error: msg };
    }
  });

