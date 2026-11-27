// Ported from the Legal app (family-law-floater/src/components/firm-offers/pdf-url.ts). Re-run the port script to refresh.
export function pdfBlobUrl(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}
