// Ported from the Legal app (family-law-floater/src/lib/contracts/pricing.ts). Re-run the port script to refresh.
/**
 * Bold Marketing Agreement — pack pricing. All money in integer cents,
 * GST always 10%, rounding half-up to the cent.
 */

export function roundHalfUp(n: number): number {
  return Math.sign(n) * Math.floor(Math.abs(n) + 0.5);
}

export type PackPricing = {
  shows: number;
  feeExCents: number;
  totalExCents: number;
  gstCents: number;
  totalIncCents: number;
};

export function pricePack(shows: number, feeExCents: number): PackPricing {
  if (!Number.isInteger(shows) || shows <= 0)
    throw new Error("Shows must be a whole number above 0");
  if (!Number.isInteger(feeExCents) || feeExCents <= 0)
    throw new Error("Per-show fee must be above $0");
  const totalExCents = shows * feeExCents;
  const gstCents = roundHalfUp(totalExCents * 0.1);
  return { shows, feeExCents, totalExCents, gstCents, totalIncCents: totalExCents + gstCents };
}

export type PaymentBlock = {
  shows: number;
  exCents: number;
  gstCents: number;
  incCents: number;
  whenPayable: string;
};

/** Default split: even, odd numbers round Block 1 up (11 shows → 6 / 5). */
export function defaultBlock1Shows(shows: number): number {
  return Math.ceil(shows / 2);
}

export function splitPack(
  pricing: PackPricing,
  block1Shows: number,
): { block1: PaymentBlock; block2: PaymentBlock } {
  if (!Number.isInteger(block1Shows) || block1Shows < 1 || block1Shows >= pricing.shows) {
    throw new Error(`Block 1 must be between 1 and ${pricing.shows - 1} shows`);
  }
  const b2Shows = pricing.shows - block1Shows;
  const b1Ex = block1Shows * pricing.feeExCents;
  const b2Ex = pricing.totalExCents - b1Ex;
  const b1Gst = roundHalfUp(b1Ex * 0.1);
  // Block 2 takes the remainder so the two blocks always sum to the pack total.
  const b2Gst = pricing.gstCents - b1Gst;
  return {
    block1: {
      shows: block1Shows,
      exCents: b1Ex,
      gstCents: b1Gst,
      incCents: b1Ex + b1Gst,
      whenPayable: "On signing, before Services commence.",
    },
    block2: {
      shows: b2Shows,
      exCents: b2Ex,
      gstCents: b2Gst,
      incCents: b2Ex + b2Gst,
      whenPayable: `Within 14 days of the ${ordinal(block1Shows)} Show being deducted, and before Show ${block1Shows + 1} is booked.`,
    },
  };
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** $12,345.67 */
export function formatCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${neg ? "-" : ""}$${dollars.toLocaleString("en-AU")}.${String(rem).padStart(2, "0")}`;
}

/** "1850" | "1,850" | "1850.50" → cents. Throws on junk. */
export function parseDollarsToCents(text: string): number {
  const clean = text.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new Error(`"${text}" isn't a dollar amount`);
  const [d, c = ""] = clean.split(".");
  return Number(d) * 100 + Number((c + "00").slice(0, 2));
}
