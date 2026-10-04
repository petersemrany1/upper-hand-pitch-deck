import { extractTextItems, getDocumentProxy } from "unpdf";
import { compareInvoiceDocument, type InvoiceClaim } from "./invoice-check";

export async function checkInvoicePdf(
  bytes: Uint8Array,
  claim: InvoiceClaim,
  repName: string,
): Promise<string[]> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes.slice());
    if (pdf.numPages !== 1)
      return ["Multi-page invoices require manual document review."];
    const { items } = await extractTextItems(pdf);
    const rows: { y: number; items: (typeof items)[number] }[] = [];
    for (const item of items[0]) {
      let row = rows.find((r) => Math.abs(r.y - item.y) < 3);
      if (!row) {
        row = { y: item.y, items: [] };
        rows.push(row);
      }
      row.items.push(item);
    }
    const lines = rows
      .sort((a, b) => b.y - a.y)
      .map((r) =>
        r.items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(" "),
      );
    if (!lines.some((l) => l.trim()))
      return [
        "Scanned or unreadable invoice: document requires manual review.",
      ];
    return compareInvoiceDocument(lines, claim, repName);
  } catch {
    return [
      "PDF could not be read reliably; inspect the attached invoice manually.",
    ];
  }
}

// AI only extracts claims; the deterministic checker decides the verdict.
export async function extractInvoiceClaim(bytes: Uint8Array): Promise<unknown> {
  const pdf = await getDocumentProxy(bytes.slice());
  if (pdf.numPages > 10)
    throw new Error("Invoice has too many pages for automatic extraction.");
  const { items } = await extractTextItems(pdf);
  const text = items
    .map((page) => page.map((item) => item.str).join(" "))
    .join("\n");
  if (text.trim().length < 30 || text.length > 50000)
    throw new Error("Invoice text could not be extracted reliably.");
  const { extractInvoiceText } = await import("./invoice-ai.server");
  return await extractInvoiceText(text);
}
