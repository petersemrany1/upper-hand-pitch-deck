// Ported from the Legal app (family-law-floater/src/lib/asset-amount-input.ts). Re-run the port script to refresh.
/** Group digits without rounding, expanding shortcuts or finishing a decimal being typed. */
export function groupAssetAmountInput(raw: string): string {
  const parts = raw.match(/^(\s*\$?\s*-?)([\d,]+)(\.\d*)?(\s*[km]?\s*)$/i);
  if (!parts) return raw;
  const digits = parts[2]!.replace(/,/g, "");
  return parts[1] + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[3] ?? "") + parts[4];
}

/** Keep a selection beside the same digit when grouping adds or removes commas. */
export function assetAmountCaret(raw: string, formatted: string, offset: number): number {
  const characters = raw.slice(0, offset).replace(/,/g, "").length;
  let position = 0;
  let count = 0;
  while (position < formatted.length && count < characters) {
    if (formatted[position] !== ",") count++;
    position++;
  }
  if (raw[offset - 1] === "," && formatted[position] === ",") position++;
  return position;
}
