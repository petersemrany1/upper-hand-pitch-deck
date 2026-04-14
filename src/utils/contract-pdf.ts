import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

// ─── Types ───
export interface ContractData {
  clientName: string;
  clinicName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  packageName: string;
  numShows: number;
  perShowFee: number;
  totalExGst: number;
  gstAmount: number;
  totalIncGst: number;
}

// ─── Colors ───
const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);
const BLUE = rgb(0.16, 0.29, 0.53);
const LIGHT_BORDER = rgb(0.75, 0.75, 0.75);

// ─── Page constants (A4) ───
const W = 595.28;
const H = 841.89;
const ML = 60;
const MR = 60;
const MT = 60;
const MB = 60;
const CW = W - ML - MR; // content width

function fmtDollar(n: number) {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Text rendering helpers ───

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

class DocWriter {
  private pdfDoc: PDFDocument;
  private page!: PDFPage;
  private y: number = 0;
  private pageNum: number = 0;
  private totalPages: number = 7;
  private regular!: PDFFont;
  private bold!: PDFFont;
  private italic!: PDFFont;
  private boldItalic!: PDFFont;

  constructor(pdfDoc: PDFDocument) {
    this.pdfDoc = pdfDoc;
  }

  async init() {
    this.regular = await this.pdfDoc.embedFont(StandardFonts.TimesRoman);
    this.bold = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    this.italic = await this.pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    this.boldItalic = await this.pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    this.newPage();
  }

  private newPage() {
    this.page = this.pdfDoc.addPage([W, H]);
    this.pageNum++;
    this.y = H - MT;
    // Header
    this.page.drawText("Upper Hand Digital \u2014 Services Agreement", {
      x: ML, y: H - 35, size: 8, font: this.regular, color: GRAY
    });
    this.page.drawLine({
      start: { x: ML, y: H - 42 }, end: { x: W - MR, y: H - 42 },
      thickness: 0.5, color: LIGHT_BORDER
    });
    this.y = H - MT - 15;
    // Footer
    this.page.drawLine({
      start: { x: ML, y: MB - 10 }, end: { x: W - MR, y: MB - 10 },
      thickness: 0.5, color: LIGHT_BORDER
    });
    const footerText = "Page " + this.pageNum + " of " + this.totalPages;
    const ftw = this.regular.widthOfTextAtSize(footerText, 8);
    this.page.drawText(footerText, {
      x: W - MR - ftw, y: MB - 25, size: 8, font: this.regular, color: GRAY
    });
  }

  private ensureSpace(needed: number) {
    if (this.y - needed < MB + 10) {
      this.newPage();
    }
  }

  drawTitle(text: string, size: number = 16) {
    this.ensureSpace(size + 10);
    const tw = this.bold.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: ML + (CW - tw) / 2, y: this.y, size, font: this.bold, color: BLACK
    });
    this.y -= size + 6;
  }

  drawSubtitle(text: string, size: number = 11) {
    this.ensureSpace(size + 6);
    const tw = this.italic.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: ML + (CW - tw) / 2, y: this.y, size, font: this.italic, color: GRAY
    });
    this.y -= size + 8;
  }

  drawCentered(text: string, font: PDFFont, size: number, color = BLACK) {
    this.ensureSpace(size + 4);
    const tw = font.widthOfTextAtSize(text, size);
    this.page.drawText(text, {
      x: ML + (CW - tw) / 2, y: this.y, size, font, color
    });
    this.y -= size + 4;
  }

  drawHeading(text: string, size: number = 11) {
    this.ensureSpace(size + 10);
    this.y -= 6;
    this.page.drawText(text, {
      x: ML, y: this.y, size, font: this.bold, color: BLACK
    });
    this.y -= size + 6;
  }

  drawBoldLine(text: string, size: number = 10) {
    this.ensureSpace(size + 4);
    this.page.drawText(text, {
      x: ML, y: this.y, size, font: this.bold, color: BLACK
    });
    this.y -= size + 4;
  }

  drawParagraph(text: string, size: number = 10, indent: number = 0, font?: PDFFont) {
    const f = font || this.regular;
    const lines = wrapText(text, f, size, CW - indent);
    for (const line of lines) {
      this.ensureSpace(size + 3);
      this.page.drawText(line, {
        x: ML + indent, y: this.y, size, font: f, color: BLACK
      });
      this.y -= size + 3;
    }
    this.y -= 3;
  }

  // For mixed bold/regular inline — renders "**bold** regular" patterns
  drawMixedParagraph(text: string, size: number = 10, indent: number = 0) {
    // Simple approach: just render as regular text with bold segments
    // Extract bold markers **text**
    const clean = text.replace(/\*\*/g, "");
    this.drawParagraph(clean, size, indent);
  }

  drawClause(number: string, title: string, size: number = 10) {
    this.ensureSpace(size + 10);
    this.y -= 8;
    const numText = number + " ";
    const numW = this.bold.widthOfTextAtSize(numText, size);
    this.page.drawText(numText, {
      x: ML, y: this.y, size, font: this.bold, color: BLACK
    });
    this.page.drawText(title, {
      x: ML + numW, y: this.y, size, font: this.bold, color: BLACK
    });
    this.y -= size + 6;
  }

  drawSubClause(number: string, text: string, size: number = 10) {
    const prefix = number + " ";
    const prefixW = this.regular.widthOfTextAtSize(prefix, size);
    const lines = wrapText(text, this.regular, size, CW - 15 - prefixW);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(size + 3);
      if (i === 0) {
        this.page.drawText(prefix, {
          x: ML, y: this.y, size, font: this.regular, color: BLACK
        });
      }
      this.page.drawText(lines[i], {
        x: ML + prefixW, y: this.y, size, font: this.regular, color: BLACK
      });
      this.y -= size + 3;
    }
    this.y -= 2;
  }

  drawNumberedItem(number: string, text: string, size: number = 10) {
    const indent = 30;
    const prefix = number + ". ";
    const prefixW = this.regular.widthOfTextAtSize(prefix, size);
    const lines = wrapText(text, this.regular, size, CW - indent - prefixW);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(size + 3);
      if (i === 0) {
        this.page.drawText(prefix, {
          x: ML + indent, y: this.y, size, font: this.regular, color: BLACK
        });
      }
      this.page.drawText(lines[i], {
        x: ML + indent + prefixW, y: this.y, size, font: this.regular, color: BLACK
      });
      this.y -= size + 3;
    }
    this.y -= 2;
  }

  drawBullet(text: string, size: number = 10) {
    const indent = 30;
    const bullet = "\u2022 ";
    const bw = this.regular.widthOfTextAtSize(bullet, size);
    const lines = wrapText(text, this.regular, size, CW - indent - bw);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(size + 3);
      if (i === 0) {
        this.page.drawText(bullet, {
          x: ML + indent, y: this.y, size, font: this.regular, color: BLACK
        });
      }
      this.page.drawText(lines[i], {
        x: ML + indent + bw, y: this.y, size, font: this.regular, color: BLACK
      });
      this.y -= size + 3;
    }
    this.y -= 2;
  }

  space(n: number = 8) {
    this.y -= n;
  }

  drawSignatureLine(label: string, width: number = 200, xOffset: number = 0) {
    this.ensureSpace(25);
    const x = ML + xOffset;
    this.page.drawLine({
      start: { x, y: this.y }, end: { x: x + width, y: this.y },
      thickness: 0.5, color: BLACK
    });
    this.page.drawText(label, {
      x, y: this.y - 12, size: 8, font: this.regular, color: GRAY
    });
  }

  drawScheduleRow(label: string, value: string) {
    this.ensureSpace(22);
    // Label
    this.page.drawText(label, {
      x: ML, y: this.y, size: 10, font: this.regular, color: BLACK
    });
    // Value right-aligned or at fixed position
    this.page.drawText(value, {
      x: ML + 250, y: this.y, size: 10, font: this.bold, color: BLACK
    });
    this.y -= 8;
    this.page.drawLine({
      start: { x: ML, y: this.y }, end: { x: W - MR, y: this.y },
      thickness: 0.3, color: LIGHT_BORDER
    });
    this.y -= 14;
  }

  forceNewPage() {
    this.newPage();
  }

  getY() { return this.y; }
  getPage() { return this.page; }
}

// ─── Main generator ───

export async function generateContractFromTemplate(data: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const w = new DocWriter(pdfDoc);
  await w.init();

  // ═══════ PAGE 1 ═══════
  w.space(10);
  w.drawTitle("SERVICES AGREEMENT", 18);
  w.drawSubtitle("Hair Transplant Patient Acquisition Services");
  w.space(8);

  w.drawParagraph("This Agreement is entered into on: " + data.date);
  w.space(6);

  w.drawCentered("BETWEEN", w["bold"], 11);
  w.space(4);
  w.drawParagraph("Upper Hand Digital (ABN 98 910 419 248) of 5 George Street, North Strathfield, NSW (\"Agency\")", 10, 0, w["bold"]);
  w.space(4);
  w.drawCentered("AND", w["bold"], 11);
  w.space(4);
  w.drawParagraph(data.clinicName + " (" + data.clientName + ", " + data.clientEmail + ", " + data.clientPhone + ") (\"Client\")", 10, 0, w["bold"]);
  w.space(10);

  // RECITALS
  w.drawHeading("RECITALS");
  w.drawParagraph("(A) The Agency is in the business of providing patient acquisition and lead generation services to hair transplant clinics, including advertising, lead qualification, appointment booking and post-consult follow up.");
  w.drawParagraph("(B) The Client wishes to engage the Agency to provide patient acquisition services on a pay-per-show basis.");
  w.drawParagraph("(C) The Agency has agreed to provide those services on the terms set out in this Agreement.");
  w.space(6);

  // 1. DEFINITIONS
  w.drawClause("1.", "DEFINITIONS");
  w.drawSubClause("1.1", "In this Agreement:");
  w.space(2);
  const defs = [
    ["Agreement", "means this Services Agreement including any Schedule attached to it;"],
    ["Commencement Date", "means the date on which the first payment is received by the Agency from the Client;"],
    ["Confidential Information", "means all non-public information disclosed by one party to the other in connection with this Agreement including business information, client lists, pricing, strategies and systems;"],
    ["GST", "means goods and services tax as defined in the A New Tax System (Goods and Services Tax) Act 1999 (Cth);"],
    ["Laws", "means all applicable Commonwealth and State laws including the Australian Consumer Law, Privacy Act 1988, and the AHPRA advertising guidelines;"],
    ["Package", "means the number of Qualified Shows purchased by the Client as specified in Schedule 1;"],
    ["Per Show Fee", "means the dollar amount payable by the Client for each Qualified Show as specified in Schedule 1;"],
    ["Qualified Show", "means a prospective patient who: (a) has been pre-qualified by the Agency against agreed criteria; (b) has confirmed their appointment; and (c) physically attends the consultation at the Client's clinic;"],
    ["Services", "means the patient acquisition services described in clause 4 of this Agreement;"],
    ["Term", "means the period from the Commencement Date until this Agreement is terminated in accordance with clause 12."],
  ];
  for (const [term, def] of defs) {
    w.drawParagraph(term + " " + def, 10, 15);
  }

  // 2. COMMENCEMENT
  w.drawClause("2.", "COMMENCEMENT AND PAYMENT REQUIRED TO ACTIVATE");
  w.drawSubClause("2.1", "This Agreement commences on the Commencement Date.");
  w.drawSubClause("2.2", "The Agency will not commence any work, including advertising, lead generation, or call handling, until the Client has made full payment for the agreed Package as set out in Schedule 1.");
  w.drawSubClause("2.3", "Payment of the Package fee activates this Agreement and authorises the Agency to begin performing the Services.");

  // 3. PACKAGES AND PRICING
  w.drawClause("3.", "PACKAGES AND PRICING");
  w.drawSubClause("3.1", "The Client has selected the Package described in Schedule 1, which sets out the number of Qualified Shows purchased and the Per Show Fee.");
  w.drawSubClause("3.2", "The total Package fee is payable upfront in full prior to the commencement of any Services.");
  w.drawSubClause("3.3", "All amounts are in Australian dollars and are exclusive of GST unless otherwise stated.");
  w.drawSubClause("3.4", "GST will be added to all invoices where applicable.");

  // 4. SERVICES
  w.drawClause("4.", "SERVICES");
  w.drawSubClause("4.1", "In consideration of payment of the Package fee, the Agency will provide the following services:");
  w.drawNumberedItem("1", "Creation and management of targeted advertising campaigns on Meta (Facebook/Instagram) and/or other agreed platforms;");
  w.drawNumberedItem("2", "AHPRA-compliant ad creative \u2014 nothing goes live without the Client's prior written approval;");
  w.drawNumberedItem("3", "Lead qualification \u2014 every enquiry is called within 5 minutes during business hours and pre-qualified against agreed criteria including budget, intent and readiness to proceed;");
  w.drawNumberedItem("4", "Appointment booking \u2014 qualified patients are booked directly into the Client's calendar;");
  w.drawNumberedItem("5", "Post-consult follow up \u2014 patients who did not book on the day receive a structured follow-up sequence to bring them back to the clinic.");
  w.drawSubClause("4.2", "The Agency will use its own Meta advertising account to run campaigns. The Client grants page access to enable this. The risk of the advertising account remains with the Agency.");
  w.drawSubClause("4.3", "The Agency will perform the Services with due care, skill and diligence.");

  // 5. QUALIFIED SHOW
  w.drawClause("5.", "WHAT COUNTS AS A QUALIFIED SHOW");
  w.drawSubClause("5.1", "A Qualified Show is counted only when a prospective patient:");
  w.drawNumberedItem("a", "Has been contacted and pre-qualified by the Agency;");
  w.drawNumberedItem("b", "Has confirmed their appointment with the Client; and");
  w.drawNumberedItem("c", "Physically attends the consultation at the Client's clinic on the agreed date and time.");
  w.drawSubClause("5.2", "The following do not count as a Qualified Show:");
  w.drawNumberedItem("a", "A patient who enquires but does not meet the pre-qualification criteria;");
  w.drawNumberedItem("b", "A patient who books but does not attend (no-show);");
  w.drawNumberedItem("c", "A patient who cancels or reschedules and does not subsequently attend.");

  // 6. NO-SHOW GUARANTEE
  w.drawClause("6.", "NO-SHOW GUARANTEE");
  w.drawSubClause("6.1", "If a patient does not attend their scheduled consultation (a no-show), the Client will not be charged for that appointment. The Agency will credit or refund the Per Show Fee for any confirmed no-show immediately upon notification.");
  w.drawSubClause("6.2", "A no-show must be reported to the Agency within 24 hours of the missed appointment time.");

  // 7. PERFORMANCE GUARANTEE
  w.drawClause("7.", "PERFORMANCE GUARANTEE");
  w.drawSubClause("7.1", "If the Client does not achieve a minimum of 2 procedure bookings from the first 10 Qualified Shows delivered, the Agency will provide 5 additional Qualified Shows at no charge.");
  w.drawSubClause("7.2", "This guarantee applies to the first Package only and is subject to the Client:");
  w.drawNumberedItem("a", "Providing accurate and timely feedback on all consultations;");
  w.drawNumberedItem("b", "Making all reasonable efforts to convert qualified patients during consultations;");
  w.drawNumberedItem("c", "Notifying the Agency within 7 days of completing the 10th show.");

  // 8. CLIENT OBLIGATIONS
  w.drawClause("8.", "CLIENT OBLIGATIONS");
  w.drawSubClause("8.1", "The Client must:");
  w.drawNumberedItem("a", "Respond promptly to Agency communications;");
  w.drawNumberedItem("b", "Provide timely approval of all advertising creative before it goes live;");
  w.drawNumberedItem("c", "Make their calendar available and honour confirmed appointments;");
  w.drawNumberedItem("d", "Notify the Agency of all no-shows within 24 hours;");
  w.drawNumberedItem("e", "Provide honest feedback on consultation outcomes to assist optimisation;");
  w.drawNumberedItem("f", "Ensure that any information provided to the Agency is accurate and not misleading;");
  w.drawNumberedItem("g", "Comply with all applicable Laws in the conduct of their clinic and consultations.");

  // 9. AHPRA
  w.drawClause("9.", "AHPRA COMPLIANCE");
  w.drawSubClause("9.1", "All advertising material will be created in compliance with AHPRA advertising guidelines.");
  w.drawSubClause("9.2", "No advertisement will go live without the Client's prior written approval.");
  w.drawSubClause("9.3", "The Client warrants that any information or content they provide to the Agency for use in advertising does not breach AHPRA guidelines or any other applicable Laws.");
  w.drawSubClause("9.4", "The Agency is not responsible for regulatory issues arising from content or information provided by the Client.");

  // 10. IP
  w.drawClause("10.", "INTELLECTUAL PROPERTY");
  w.drawSubClause("10.1", "All advertising creative, strategies, systems and materials created by the Agency remain the intellectual property of the Agency.");
  w.drawSubClause("10.2", "The Client may not use, copy, reproduce or share the Agency's materials without prior written consent.");
  w.drawSubClause("10.3", "The Client retains all intellectual property rights in materials they provide to the Agency.");

  // 11. CONFIDENTIALITY
  w.drawClause("11.", "CONFIDENTIALITY");
  w.drawSubClause("11.1", "Each party agrees to keep the other's Confidential Information secret and to not disclose it to any third party without prior written consent.");
  w.drawSubClause("11.2", "The Agency will not disclose the Client's identity or business information to any other party including other clinics.");
  w.drawSubClause("11.3", "The confidentiality obligations in this clause survive the termination of this Agreement.");

  // 12. CANCELLATION
  w.drawClause("12.", "CANCELLATION AND TERMINATION");
  w.drawSubClause("12.1", "There is no lock-in. The Client may cancel this Agreement at any time by providing written notice to the Agency.");
  w.drawSubClause("12.2", "Upon cancellation:");
  w.drawBullet("Any unused Qualified Shows remaining in the Client's Package will be refunded at the Per Show Fee rate within 14 days;");
  w.drawBullet("Any Shows already delivered will be payable in full;");
  w.drawBullet("The Agency will cease all advertising activity promptly upon receiving notice.");
  w.drawSubClause("12.3", "The Agency may terminate this Agreement immediately if:");
  w.drawBullet("The Client fails to comply with AHPRA guidelines or any applicable Laws;");
  w.drawBullet("The Client acts in a way that may damage the reputation or business of the Agency;");
  w.drawBullet("The Client provides false or misleading information.");

  // 13. LIMITATION OF LIABILITY
  w.drawClause("13.", "LIMITATION OF LIABILITY");
  w.drawSubClause("13.1", "The Agency does not guarantee any specific number of procedure bookings or revenue outcomes. Results depend on many factors including the Client's consultation process, pricing, and market conditions.");
  w.drawSubClause("13.2", "To the maximum extent permitted by law, the Agency's total liability to the Client is limited to the total Package fee paid by the Client in the 3 months preceding the claim.");
  w.drawSubClause("13.3", "Neither party is liable for indirect, consequential or special loss or damage.");

  // 14. PRIVACY
  w.drawClause("14.", "PRIVACY");
  w.drawSubClause("14.1", "Each party must comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles in connection with the handling of personal information collected under this Agreement.");
  w.drawSubClause("14.2", "The Agency will only use patient personal information for the purpose of providing the Services and will not sell or share that information with third parties.");

  // 15. GENERAL
  w.drawClause("15.", "GENERAL");
  w.drawSubClause("15.1", "Entire Agreement. This Agreement is the entire agreement between the parties and replaces all prior agreements, representations and understandings.");
  w.drawSubClause("15.2", "Variation. No variation of this Agreement is effective unless made in writing and signed by both parties.");
  w.drawSubClause("15.3", "Governing Law. This Agreement is governed by the laws of New South Wales. Each party submits to the non-exclusive jurisdiction of the courts of New South Wales.");
  w.drawSubClause("15.4", "Severability. If any provision of this Agreement is void or unenforceable, it is severed without affecting the remaining provisions.");
  w.drawSubClause("15.5", "Relationship. Nothing in this Agreement creates a partnership, joint venture or employment relationship between the parties.");
  w.drawSubClause("15.6", "Waiver. Failure to exercise a right under this Agreement does not constitute a waiver of that right.");

  // ═══════ SCHEDULE 1 ═══════
  w.forceNewPage();
  w.space(10);
  w.drawTitle("SCHEDULE 1 \u2014 PACKAGE DETAILS", 14);
  w.space(15);

  w.drawScheduleRow("Package Selected:", data.packageName);
  w.drawScheduleRow("Number of Qualified Shows:", String(data.numShows));
  w.drawScheduleRow("Per Show Fee (exc. GST):", fmtDollar(data.perShowFee));
  w.drawScheduleRow("Total Package Fee (exc. GST):", fmtDollar(data.totalExGst));
  w.drawScheduleRow("GST (10%):", fmtDollar(data.gstAmount));
  w.drawScheduleRow("Total Amount Payable (inc. GST):", fmtDollar(data.totalIncGst));

  w.space(15);
  w.drawParagraph("Note: Services commence only upon receipt of full payment of the Total Amount Payable.", 9, 0, w["italic"]);

  // ═══════ SIGNATURE PAGE ═══════
  w.forceNewPage();
  w.space(10);
  w.drawTitle("EXECUTED AS AN AGREEMENT", 14);
  w.space(20);

  // Agency block
  w.drawParagraph("Signed for and on behalf of Upper Hand Digital", 10, 0, w["bold"]);
  w.drawParagraph("by its authorised representative:");
  w.space(10);
  w.drawBoldLine("Upper Hand Digital");
  w.space(30);
  w.drawSignatureLine("Signature", 200, 0);
  w.space(25);
  w.drawScheduleRow("Full Name:", "Peter Semrany");
  w.drawScheduleRow("Date:", "");
  w.space(30);

  // Client block
  w.drawParagraph("Signed for and on behalf of the Client", 10, 0, w["bold"]);
  w.drawParagraph("by its authorised representative:");
  w.space(10);
  w.drawBoldLine(data.clinicName);
  w.space(30);
  w.drawSignatureLine("Signature", 200, 0);
  w.space(25);
  w.drawScheduleRow("Full Name:", data.clientName);
  w.drawScheduleRow("Date:", "");

  return pdfDoc.save();
}
