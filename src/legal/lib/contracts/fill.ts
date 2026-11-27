// Ported from the Legal app (family-law-floater/src/lib/contracts/fill.ts). Re-run the port script to refresh.
/**
 * Fills the Bold Marketing Agreement PDFs. The lawyer-approved body is never
 * re-typeset: values are drawn as text at fixed 72-DPI coordinates measured
 * from the source PDFs (see contracts/*.pdf). Both templates share pages 1–9;
 * the Payment Schedule template adds Schedule A on page 10.
 *
 * Coordinates: pdf-lib uses a bottom-left origin; the measurements below are
 * baselines from the TOP of an A4 page (842pt), converted with y = 842 - top.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatCents, type PackPricing, type PaymentBlock } from "./pricing";
import {
  AGENCY_SIGNATURE_PNG_B64,
  AGREEMENT_SCHEDULE_B64,
  AGREEMENT_STANDARD_B64,
} from "./templates.generated";

export type ContractTemplate = "standard" | "schedule";

export type ContractFillInput = {
  template: ContractTemplate;
  firm: { name: string; abn: string; address: string; email: string };
  /** Shown in the Parties block and used as the Agency signing date. */
  agreementDate: Date;
  packName: string;
  pricing: PackPricing;
  /** Required when template === "schedule". */
  blocks?: { block1: PaymentBlock; block2: PaymentBlock };
  /** Draw Peter's signature on the Agency execution block. Default true when available. */
  agencySignature?: boolean;
};

const PAGE_H = 842;
const INK = rgb(0.08, 0.09, 0.2);

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
}

/** Locate the nth run of underscores in a line laid out at (x, width). Proportional estimate. */
function blankSpan(
  line: string,
  x: number,
  width: number,
  nth: number,
): { x: number; width: number } {
  const re = /_+/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (i === nth) {
      const per = width / line.length;
      return { x: x + m.index * per, width: m[0].length * per };
    }
    i++;
  }
  throw new Error(`blank ${nth} not found in "${line}"`);
}

export async function fillContract(input: ContractFillInput): Promise<Uint8Array> {
  const src = input.template === "schedule" ? AGREEMENT_SCHEDULE_B64 : AGREEMENT_STANDARD_B64;
  const pdf = await PDFDocument.load(Buffer.from(src, "base64"));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  const text = (page: PDFPage, s: string, x: number, top: number, size = 10, f: PDFFont = font) =>
    page.drawText(s, { x, y: PAGE_H - top, size, font: f, color: INK });
  const centred = (
    page: PDFPage,
    s: string,
    cx: number,
    top: number,
    size = 10,
    f: PDFFont = font,
  ) => text(page, s, cx - f.widthOfTextAtSize(s, size) / 2, top, size, f);

  // ---- Page 1: Parties -------------------------------------------------
  const p1 = pages[0]!;
  text(p1, input.firm.name, 197, 261);
  text(p1, input.firm.abn, 197, 285);
  text(p1, input.firm.address, 197, 310);
  text(p1, input.firm.email, 197, 334);
  text(p1, fmtDate(input.agreementDate), 197, 359);

  // ---- Page 3: clause 2.2 table ---------------------------------------
  const p3 = pages[2]!;
  const pr = input.pricing;
  const row = 132;
  text(p3, input.packName, 77, row, 9);
  text(p3, String(pr.shows), 154, row, 9);
  text(p3, formatCents(pr.feeExCents), 219, row, 9);
  text(p3, formatCents(pr.totalExCents), 299, row, 9);
  text(p3, formatCents(pr.gstCents), 374, row, 9);
  text(p3, formatCents(pr.totalIncCents), 434, row, 9, bold);

  // ---- Page 9: Agency execution block ---------------------------------
  const p9 = pages[8]!;
  if (input.agencySignature ?? true) {
    if (AGENCY_SIGNATURE_PNG_B64) {
      const png = await pdf.embedPng(Buffer.from(AGENCY_SIGNATURE_PNG_B64, "base64"));
      // Sits on the "Signature: ____" line (baseline top=304), just right of the
      // label, and short enough to clear the "Signed for and on behalf" heading above.
      const h = 20;
      const w = (png.width / png.height) * h;
      p9.drawImage(png, { x: 128, y: PAGE_H - 304 + 1, width: Math.min(w, 120), height: h });
    } else {
      // No signature image supplied yet: typed signature in italic on the line.
      const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
      text(p9, "Peter Semrany", 128, 304 - 2, 13, italic);
    }
  }
  // The Agency signs on send, so the Agency date is always the agreement date.
  text(p9, fmtDate(input.agreementDate), 105, 354, 9);

  // ---- Page 10: Schedule A (payment schedule template only) -----------
  if (input.template === "schedule") {
    const b = input.blocks;
    if (!b) throw new Error("Payment schedule blocks are required for the schedule template");
    const p10 = pages[9]!;

    // Heading: "Initial Pack — _______ Qualified Shows" at x=218, width 160.
    const h = blankSpan("Initial Pack — _______ Qualified Shows", 218, 160, 0);
    centred(p10, String(pr.shows), h.x + h.width / 2, 166 - 1, 10, bold);

    // A2 line 1 (x=130, w=374): "... Pack of _______ Qualified Shows at $__________ (exc. GST) per"
    const l1 =
      "The Firm purchases a single Pack of _______ Qualified Shows at $__________ (exc. GST) per";
    const l1a = blankSpan(l1, 130, 374, 0);
    const l1b = blankSpan(l1, 130, 374, 1);
    centred(p10, String(pr.shows), l1a.x + l1a.width / 2, 304 - 1, 9, bold);
    centred(
      p10,
      formatCents(pr.feeExCents).replace(/^\$/, ""),
      l1b.x + l1b.width / 2 + 4,
      304 - 1,
      9,
      bold,
    );

    // A2 line 2 (x=72, w=436): "Qualified Show — $__________ (exc. GST) / $__________ (inc. GST). ..."
    const l2 =
      "Qualified Show — $__________ (exc. GST) / $__________ (inc. GST). The Firm commits to the full Pack. The";
    const l2a = blankSpan(l2, 72, 436, 0);
    const l2b = blankSpan(l2, 72, 436, 1);
    centred(
      p10,
      formatCents(pr.totalExCents).replace(/^\$/, ""),
      l2a.x + l2a.width / 2 + 4,
      317 - 1,
      9,
      bold,
    );
    centred(
      p10,
      formatCents(pr.totalIncCents).replace(/^\$/, ""),
      l2b.x + l2b.width / 2 + 4,
      317 - 1,
      9,
      bold,
    );

    // A3 table. Columns: BLOCK 77 | AMOUNT EXC 152 | GST 227 | AMOUNT INC 282 | WHEN PAYABLE 357.
    const drawBlock = (blk: PaymentBlock, showsTop: number, valuesTop: number) => {
      text(p10, String(blk.shows), 77 + 30, showsTop, 9, bold); // after "Shows "
      text(p10, formatCents(blk.exCents), 152, valuesTop, 9);
      text(p10, formatCents(blk.gstCents), 227, valuesTop, 9);
      text(p10, formatCents(blk.incCents), 282, valuesTop, 9, bold);
      const lines = wrap(blk.whenPayable, font, 8, 160);
      lines.forEach((ln, i) => text(p10, ln, 357, valuesTop - 8 + i * 10, 8));
    };
    drawBlock(b.block1, 435, 428);
    drawBlock(b.block2, 475, 468);
    text(p10, formatCents(pr.totalExCents), 152, 502, 9, bold);
    text(p10, formatCents(pr.gstCents), 227, 502, 9, bold);
    text(p10, formatCents(pr.totalIncCents), 282, 502, 9, bold);
  }

  return pdf.save({ useObjectStreams: false });
}

function wrap(s: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
