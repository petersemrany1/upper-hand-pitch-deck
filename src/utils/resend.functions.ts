import { createServerFn } from "@tanstack/react-start";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const RESEND_API_KEY = "re_dxcYHrZP_6hcbp9cubtwmL72hA55zYBuv";

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

// ─── PDF CONTRACT GENERATOR ───

async function generateContractPdf(d: {
  contactName: string;
  clinicName: string;
  email: string;
  phone: string;
  packageName: string;
  shows: number;
  perShowFee: number;
  totalFee: number;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28; // A4
  const H = 841.89;
  const M = 50; // margin
  const contentW = W - M * 2;

  const navy = rgb(15 / 255, 23 / 255, 42 / 255);
  const blue = rgb(59 / 255, 130 / 255, 246 / 255);
  const gray = rgb(107 / 255, 114 / 255, 128 / 255);
  const lightGray = rgb(229 / 255, 231 / 255, 235 / 255);
  const bgLight = rgb(248 / 255, 250 / 255, 252 / 255);
  const white = rgb(1, 1, 1);

  const gst = d.totalFee * 0.1;
  const totalIncGst = d.totalFee + gst;

  const today = new Date();
  const dateStr =
    today.getDate() +
    " " +
    [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ][today.getMonth()] +
    " " +
    today.getFullYear();

  // ────── PAGE 1 ──────
  const page1 = pdfDoc.addPage([W, H]);
  let y = H;

  // Header bar
  page1.drawRectangle({ x: 0, y: H - 100, width: W, height: 100, color: navy });
  page1.drawText("UPPER HAND", { x: M, y: H - 55, size: 28, font: helveticaBold, color: white });
  page1.drawText("Digital Services Agreement", { x: M, y: H - 78, size: 13, font: helvetica, color: rgb(148 / 255, 163 / 255, 184 / 255) });

  y = H - 130;

  // Date
  page1.drawText("Date: " + dateStr, { x: M, y, size: 10, font: helvetica, color: gray });
  y -= 30;

  // Party details box
  const boxH = 110;
  page1.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: bgLight, borderColor: lightGray, borderWidth: 1 });

  const col1X = M + 15;
  const col2X = M + contentW / 2 + 10;
  let bY = y - 20;

  page1.drawText("SERVICE PROVIDER", { x: col1X, y: bY, size: 8, font: helveticaBold, color: gray });
  page1.drawText("CLIENT", { x: col2X, y: bY, size: 8, font: helveticaBold, color: gray });
  bY -= 18;
  page1.drawText("Upper Hand Digital", { x: col1X, y: bY, size: 11, font: helveticaBold, color: navy });
  page1.drawText(d.clinicName, { x: col2X, y: bY, size: 11, font: helveticaBold, color: navy });
  bY -= 16;
  page1.drawText("petersemrany1@gmail.com", { x: col1X, y: bY, size: 9, font: helvetica, color: gray });
  page1.drawText(d.contactName, { x: col2X, y: bY, size: 9, font: helvetica, color: gray });
  bY -= 14;
  page1.drawText(d.email, { x: col2X, y: bY, size: 9, font: helvetica, color: gray });
  bY -= 14;
  page1.drawText(d.phone, { x: col2X, y: bY, size: 9, font: helvetica, color: gray });

  y -= boxH + 30;

  // Package summary header
  page1.drawText("PACKAGE SUMMARY", { x: M, y, size: 12, font: helveticaBold, color: navy });
  y -= 5;
  page1.drawLine({ start: { x: M, y }, end: { x: M + contentW, y }, thickness: 2, color: blue });
  y -= 25;

  // Summary table
  const drawRow = (label: string, value: string, bold?: boolean, highlight?: boolean) => {
    if (highlight) {
      page1.drawRectangle({ x: M, y: y - 6, width: contentW, height: 28, color: rgb(239 / 255, 246 / 255, 255 / 255) });
    }
    page1.drawText(label, { x: M + 15, y, size: 10, font: helvetica, color: gray });
    page1.drawText(value, {
      x: M + contentW - 15 - (bold ? helveticaBold : helvetica).widthOfTextAtSize(value, bold ? 13 : 11),
      y,
      size: bold ? 13 : 11,
      font: bold ? helveticaBold : helvetica,
      color: bold ? blue : navy,
    });
    y -= 28;
  };

  drawRow("Package", d.packageName);
  drawRow("Number of Shows", String(d.shows));
  drawRow("Per Show Fee", fmtDollar(d.perShowFee));

  // Divider
  page1.drawLine({ start: { x: M + 15, y: y + 14 }, end: { x: M + contentW - 15, y: y + 14 }, thickness: 0.5, color: lightGray });

  drawRow("Subtotal (ex. GST)", fmtDollar(d.totalFee));
  drawRow("GST (10%)", fmtDollar(gst));
  drawRow("Total (inc. GST)", fmtDollar(totalIncGst), true, true);

  y -= 20;

  // Terms heading
  page1.drawText("TERMS & CONDITIONS", { x: M, y, size: 12, font: helveticaBold, color: navy });
  y -= 5;
  page1.drawLine({ start: { x: M, y }, end: { x: M + contentW, y }, thickness: 2, color: blue });
  y -= 22;

  const terms = [
    "1. Upper Hand Digital (\"Provider\") agrees to deliver the digital marketing services described above to the Client.",
    "2. The Client agrees to pay the Total Package Fee as outlined in the Package Summary above.",
    "3. Payment is due within 7 days of signing this agreement unless otherwise agreed in writing.",
    "4. Each \"show\" refers to one qualified patient consultation appointment generated through the Provider's digital marketing services.",
    "5. The Provider will use commercially reasonable efforts to deliver the agreed number of shows within the campaign period.",
    "6. The Client is responsible for ensuring adequate availability to receive and conduct consultations with referred patients.",
    "7. Either party may terminate this agreement with 14 days written notice. Fees for shows already delivered remain payable.",
    "8. All pricing is in Australian Dollars (AUD). GST is calculated at 10% as required by Australian tax law.",
    "9. The Provider makes no guarantees regarding patient conversion rates, as these depend on the Client's consultation quality and follow-up processes.",
    "10. This agreement constitutes the entire understanding between the parties and supersedes all prior discussions.",
  ];

  for (const term of terms) {
    const words = term.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (helvetica.widthOfTextAtSize(test, 9) > contentW - 20) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    for (const l of lines) {
      if (y < M + 20) {
        // Overflow guard — shouldn't happen with 10 terms but just in case
        break;
      }
      page1.drawText(l, { x: M + 10, y, size: 9, font: helvetica, color: navy });
      y -= 14;
    }
    y -= 4;
  }

  // ────── PAGE 2 — SIGNATURE ──────
  const page2 = pdfDoc.addPage([W, H]);
  let y2 = H;

  // Small header
  page2.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: navy });
  page2.drawText("UPPER HAND", { x: M, y: H - 38, size: 18, font: helveticaBold, color: white });
  page2.drawText("Digital Services Agreement — Signature Page", { x: M, y: H - 52, size: 9, font: helvetica, color: rgb(148 / 255, 163 / 255, 184 / 255) });

  y2 = H - 100;

  page2.drawText("ACCEPTANCE & SIGNATURE", { x: M, y: y2, size: 14, font: helveticaBold, color: navy });
  y2 -= 5;
  page2.drawLine({ start: { x: M, y: y2 }, end: { x: M + contentW, y: y2 }, thickness: 2, color: blue });
  y2 -= 30;

  const wrapText = (text: string, maxW: number, font: typeof helvetica, size: number) => {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(test, size) > maxW) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const acceptText =
    "By signing below, I confirm that I have read, understood, and agree to the terms set out in this Digital Services Agreement. I authorise Upper Hand Digital to commence the services described in the Package Summary and agree to pay the Total Package Fee as specified.";

  const acceptLines = wrapText(acceptText, contentW - 20, helvetica, 10);
  for (const l of acceptLines) {
    page2.drawText(l, { x: M + 10, y: y2, size: 10, font: helvetica, color: navy });
    y2 -= 16;
  }

  y2 -= 30;

  // Signature blocks side by side
  const sigBoxW = (contentW - 30) / 2;

  // Provider
  page2.drawText("SERVICE PROVIDER", { x: M, y: y2, size: 8, font: helveticaBold, color: gray });
  page2.drawText("CLIENT", { x: M + sigBoxW + 30, y: y2, size: 8, font: helveticaBold, color: gray });
  y2 -= 25;

  // Name labels
  page2.drawText("Name: Peter Semrany", { x: M, y: y2, size: 10, font: helvetica, color: navy });
  page2.drawText("Name: " + d.contactName, { x: M + sigBoxW + 30, y: y2, size: 10, font: helvetica, color: navy });
  y2 -= 20;

  page2.drawText("Company: Upper Hand Digital", { x: M, y: y2, size: 10, font: helvetica, color: navy });
  page2.drawText("Company: " + d.clinicName, { x: M + sigBoxW + 30, y: y2, size: 10, font: helvetica, color: navy });
  y2 -= 40;

  // Signature lines
  page2.drawText("Signature:", { x: M, y: y2 + 5, size: 9, font: helvetica, color: gray });
  page2.drawLine({ start: { x: M + 55, y: y2 }, end: { x: M + sigBoxW, y: y2 }, thickness: 0.5, color: navy });

  page2.drawText("Signature:", { x: M + sigBoxW + 30, y: y2 + 5, size: 9, font: helvetica, color: gray });
  page2.drawLine({ start: { x: M + sigBoxW + 85, y: y2 }, end: { x: M + contentW, y: y2 }, thickness: 0.5, color: navy });
  y2 -= 35;

  // Date lines
  page2.drawText("Date:", { x: M, y: y2 + 5, size: 9, font: helvetica, color: gray });
  page2.drawLine({ start: { x: M + 35, y: y2 }, end: { x: M + sigBoxW, y: y2 }, thickness: 0.5, color: navy });

  page2.drawText("Date:", { x: M + sigBoxW + 30, y: y2 + 5, size: 9, font: helvetica, color: gray });
  page2.drawLine({ start: { x: M + sigBoxW + 65, y: y2 }, end: { x: M + contentW, y: y2 }, thickness: 0.5, color: navy });

  y2 -= 60;

  // Contact footer
  page2.drawRectangle({ x: M, y: y2 - 40, width: contentW, height: 50, color: bgLight, borderColor: lightGray, borderWidth: 0.5 });
  page2.drawText("Questions? Contact petersemrany1@gmail.com", {
    x: M + 15,
    y: y2 - 20,
    size: 9,
    font: helvetica,
    color: gray,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ─── Uint8Array to base64 (works in all runtimes) ───
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
    const pdfBytes = await generateContractPdf({
      contactName: data.contactName,
      clinicName: data.clinicName,
      email: data.to,
      phone: data.phone,
      packageName: data.packageName,
      shows: data.shows,
      perShowFee: data.perShowFee,
      totalFee: data.totalFee,
    });

    const pdfBase64 = uint8ToBase64(pdfBytes);
    const firstName = data.contactName.trim().split(" ")[0];

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
      '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Hi ' + firstName + ",</p>",
      '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Please find your Upper Hand Digital Services Agreement attached.</p>',
      '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">Review the terms, sign the last page, and reply to this email with the signed copy.</p>',
      '<p style="margin:0 0 16px;color:#0f172a;font-size:15px;line-height:1.6;">If you have any questions just reply to this message.</p>',
      '<p style="margin:32px 0 0;color:#9ca3af;font-size:12px;">— Upper Hand Digital</p>',
      "</td></tr></table></td></tr></table></body></html>",
    ].join("");

    return sendViaResend(
      data.to,
      "Your Upper Hand Digital Services Agreement \u2014 Please Review and Sign",
      html,
      [
        {
          filename: "Upper_Hand_Agreement_" + data.clinicName.replace(/[^a-zA-Z0-9]/g, "_") + ".pdf",
          content: pdfBase64,
        },
      ]
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
