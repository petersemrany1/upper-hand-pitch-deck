// Ported from the Legal app (family-law-floater/src/lib/firm-offers/documents.server.ts). Re-run the port script to refresh.
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import templates from "./templates.server.json";
import editorial from "./editorial.server.json";
import commercial from "./commercial.server.json";
import { money, pricing, TEMPLATE_VERSION, type Offer } from "./model";
export function templateDigest(variant: "upfront" | "split", version = TEMPLATE_VERSION) {
  if (version === "bold-combined-2026-10-03-v1") return templates[variant].sourceDigest;
  if (
    version !== editorial.version &&
    version !== "bold-combined-2026-10-04-v3" &&
    version !== "bold-combined-2026-10-04-v4" &&
    version !== TEMPLATE_VERSION
  )
    throw new Error("Unsupported template version");
  return createHash("sha256")
    .update(
      `${templates[variant].sourceDigest}:${editorial.digest}:${version}${version === commercial.version ? `:${commercial[variant].digest}` : ""}`,
    )
    .digest("hex");
}
export async function generateDocument(o: Offer) {
  const t = templates[o.draft.arrangement];
  if (o.templateDigest !== templateDigest(o.draft.arrangement, o.templateVersion))
    throw new Error("Template checksum mismatch");
  const revised = o.templateVersion !== "bold-combined-2026-10-03-v1";
  const direct = o.draft.workflow === "call_signing";
  // Keep previously reviewed/sent PDFs byte-identical. Only new revisions leave Bold's name blank.
  const customPacks = o.templateVersion === commercial.version;
  const editableCountersigner =
    direct && (o.templateVersion === "bold-combined-2026-10-04-v4" || customPacks);
  if (
    !customPacks &&
    ((o.draft.showCount ?? 10) !== 10 ||
      (o.draft.arrangement === "split" && (o.draft.firstBlockShows ?? 5) !== 5))
  )
    throw new Error("Save a new draft revision to use a custom pack");
  const p = pricing(
    o.draft.priceCents,
    o.draft.arrangement,
    o.draft.showCount,
    o.draft.firstBlockShows,
  );
  const mergeFields = customPacks ? commercial[o.draft.arrangement].fields : t.fields;
  const amount = (n: number) => money(n).replace(/\.00$/, "");
  const values: Record<string, string> = {
    pageCount: String(t.pages),
    firmName: o.details?.tradingName || o.draft.firmName,
    contactName: o.draft.contactName,
    legalName: o.details?.legalName ?? "To be confirmed by the firm",
    registration: o.details?.registration ?? "To be confirmed",
    address: o.details?.address ?? "To be confirmed",
    signatoryName: direct ? "" : (o.details?.signatoryName ?? o.draft.contactName),
    position: direct ? "" : (o.details?.position ?? "To be confirmed"),
    signatoryEmail: o.details?.signatoryEmail ?? o.draft.email,
    companyName: o.company.name,
    companyAbn: o.company.abn,
    companyAddress: o.company.address,
    companyEmail: o.company.email,
    preparedBy: editableCountersigner ? "" : o.company.preparedBy,
    price: amount(p.priceCents),
    ex: amount(p.exCents),
    gst: amount(p.gstCents),
    total: amount(p.totalCents),
    blockEx: amount(p.blockExCents),
    blockTotal: amount(p.blockCents),
    shows: String(p.shows),
    firstShows: String(p.blockShows),
    secondStart: String(p.blockShows + 1),
    secondBlockEx: amount(p.secondBlockExCents),
    secondBlockTotal: amount(p.secondBlockCents),
  };
  const pdf = await PDFDocument.create();
  const common = await PDFDocument.load(Buffer.from(templates.common, "base64"));
  const tail = await PDFDocument.load(Buffer.from(t.pdf, "base64"));
  for (const page of await pdf.copyPages(common, common.getPageIndices())) pdf.addPage(page);
  for (const page of await pdf.copyPages(tail, tail.getPageIndices())) pdf.addPage(page);
  if (revised) {
    const patch = await PDFDocument.load(Buffer.from(editorial.pdf, "base64"));
    const pages = await pdf.copyPages(patch, patch.getPageIndices());
    editorial.pages.forEach((index, i) => {
      pdf.removePage(index);
      pdf.insertPage(index, pages[i]!);
    });
  }
  if (customPacks) {
    const patchData = commercial[o.draft.arrangement];
    const patch = await PDFDocument.load(Buffer.from(patchData.pdf, "base64"));
    const pages = await pdf.copyPages(patch, patch.getPageIndices());
    patchData.pages.forEach((index, i) => {
      pdf.removePage(index);
      pdf.insertPage(index, pages[i]!);
    });
  }
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const f of mergeFields) {
    if (revised && f.page === 0 && f.pattern === "{{preparedBy}}") continue;
    const text = f.pattern.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
    if (/\{\{|\[Law company|\[Client name/.test(text)) throw new Error("Unresolved merge field");
    const font = f.bold ? bold : regular;
    let size = f.size,
      lines: string[] = [];
    for (; size >= 6; size -= 0.25) {
      lines = [];
      let line = "";
      for (const word of text.split(/\s+/)) {
        if (font.widthOfTextAtSize(word, size) > f.width) {
          lines = Array(100).fill("");
          break;
        }
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) > f.width) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      if (lines.length * size * 1.12 <= f.height) break;
    }
    if (size < 6)
      throw new Error("Document layout overflow: shorten the supplied firm detail before sending");
    const page = pdf.getPage(f.page);
    lines.forEach((line, i) =>
      page.drawText(line, {
        x: f.x,
        y: page.getHeight() - f.top - size - i * size * 1.12,
        size,
        font,
        color: rgb(
          ((f.color >> 16) & 255) / 255,
          ((f.color >> 8) & 255) / 255,
          (f.color & 255) / 255,
        ),
      }),
    );
  }
  pdf.setTitle(
    `${o.draft.firmName} — ${revised ? "Family Law Marketing Proposal" : "Proposal and Agreement"}`,
  );
  pdf.setProducer("Bold Marketing");
  pdf.setCreationDate(new Date("2026-10-03T00:00:00Z"));
  pdf.setModificationDate(new Date("2026-10-03T00:00:00Z"));
  const bytes = await pdf.save();
  // Annature input fields anchor at their top-left in PDF bottom-origin coordinates.
  const fields: SigningField[] = t.signatures.map((f) => ({
    ...f,
    ...(f.type === "date"
      ? { date_format: "DD/MM/YYYY", font_size: 10, font_type: "helvetica" }
      : {}),
  }));
  if (direct) {
    for (const [key, id] of [
      ["signatoryName", "firm_full_name"],
      ["position", "firm_position"],
    ] as const) {
      const f = t.fields.find((f) => f.pattern.includes(`{{${key}}}`))!;
      fields.push({
        id,
        party: "firm",
        type: "input",
        page: f.page + 1,
        x_coordinate: 108,
        y_coordinate: Math.round(pdf.getPage(f.page).getHeight() - f.top),
        width: 175,
        height: 15,
        required: true,
        font_size: 10,
        font_type: "helvetica",
      });
    }
  }
  if (editableCountersigner) {
    const f = t.fields.find((f) => f.pattern === "Full name: {{preparedBy}}")!;
    fields.push({
      id: "bold_full_name",
      party: "peter",
      type: "input",
      page: f.page + 1,
      x_coordinate: 361,
      y_coordinate: Math.round(pdf.getPage(f.page).getHeight() - f.top),
      width: 175,
      height: 15,
      required: true,
      font_size: 10,
      font_type: "helvetica",
    });
  }
  return {
    bytes,
    digest: createHash("sha256").update(bytes).digest("hex"),
    fields,
    pages: t.pages,
  };
}

export type SigningField = {
  id?: string;
  party: string;
  type: string;
  page: number;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  required: boolean;
  font_size?: number;
  font_type?: string;
  date_format?: string;
};
