// Ported from the Legal app (family-law-floater/src/lib/client-assets.ts). Re-run the port script to refresh.
import { z } from "zod";

export const ASSET_CATEGORIES = [
  { key: "property", label: "Properties", singular: "property" },
  { key: "super", label: "Super", singular: "super" },
  { key: "vehicle", label: "Cars, caravans & boats", singular: "vehicle" },
  { key: "business", label: "Business", singular: "business" },
  { key: "savings", label: "Savings & investments", singular: "savings" },
  { key: "personal_savings", label: "Personal savings", singular: "personal savings" },
  { key: "other_investments", label: "Other savings & investments", singular: "investment" },
  { key: "other", label: "Other assets", singular: "asset" },
  { key: "debt", label: "Other debts", singular: "debt" },
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number]["key"];
export const MAX_ASSET_ROWS = 100;
export const ASSET_TARGET = 75_000_000; // $750,000, in cents.
const fields = {
  id: z.string().uuid(),
  category: z.enum([
    "property",
    "super",
    "vehicle",
    "business",
    "savings",
    "personal_savings",
    "other_investments",
    "other",
    "debt",
  ]),
  label: z.string().max(120),
  value: z.string().max(32),
  debt: z.string().max(32),
};
const rowSchema = z
  .object({
    ...fields,
    mode: z.enum(["valuation", "equity", "amount"]),
    equity: z.string().max(32),
    // Keep the original figures when converting an old value/owing entry to one net amount.
    previous: z.object({ value: z.string().max(32), debt: z.string().max(32) }).optional(),
  })
  .refine((row) =>
    row.category === "property" || row.category === "vehicle"
      ? row.mode !== "amount"
      : row.mode === "amount",
  );
export type AssetRow = z.infer<typeof rowSchema>;
export const assetCalculationSchema = z
  .union([
    z.object({ version: z.literal(2), rows: z.array(rowSchema).max(MAX_ASSET_ROWS) }),
    z
      .object({ version: z.literal(1), rows: z.array(z.object(fields)).max(MAX_ASSET_ROWS) })
      .transform((old) => ({
        version: 2 as const,
        rows: old.rows.map((row): AssetRow => {
          if (row.category === "property" || row.category === "vehicle")
            return { ...row, mode: "valuation", equity: "" };
          if (row.category === "super" || row.category === "debt")
            return { ...row, mode: "amount", equity: "" };
          const value = parseAssetAmount(row.value),
            debt = parseAssetAmount(row.debt);
          return {
            ...row,
            mode: "amount",
            equity: "",
            debt: "0",
            value:
              typeof value === "number" && typeof debt === "number"
                ? String((value - debt) / 100)
                : "",
            previous: { value: row.value, debt: row.debt },
          };
        }),
      })),
  ])
  .refine((data) => new Set(data.rows.map((row) => row.id)).size === data.rows.length);
export type AssetCalculation = z.infer<typeof assetCalculationSchema>;
export type SavedAssetCalculation = {
  calculation: AssetCalculation;
  revision: number;
  updatedAt: string;
};
export const emptyAssetCalculation = (): AssetCalculation => ({ version: 2, rows: [] });
export function createAssetRow(category: AssetCategory): AssetRow {
  return {
    id: crypto.randomUUID(),
    category,
    label: "",
    value: "",
    debt: "",
    equity: "",
    mode: category === "property" || category === "vehicle" ? "valuation" : "amount",
  };
}

/** Integer cents. Blank is unknown; negative equity is valid. */
export function parseAssetAmount(raw: string, allowNegative = false): number | null | undefined {
  const value = raw.trim().replace(/^\$\s*/, "");
  if (!value) return undefined;
  if (
    !/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?\s*[km]?$/i.test(value) ||
    (!allowNegative && value.startsWith("-"))
  )
    return null;
  const multiplier = /m$/i.test(value) ? 1_000_000 : /k$/i.test(value) ? 1_000 : 1;
  const cents = Math.round(Number(value.replace(/[,\s]|[km]/gi, "")) * multiplier * 100);
  return Number.isSafeInteger(cents) && Math.abs(cents) <= 100_000_000_000 ? cents : null;
}
export function assetMoney(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
export function formatAssetAmount(raw: string, allowNegative = false): string {
  const cents = parseAssetAmount(raw, allowNegative);
  return typeof cents === "number"
    ? new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(cents / 100)
    : raw;
}
export function calculateAssetRow(row: AssetRow) {
  const amounts =
    row.mode === "equity"
      ? [parseAssetAmount(row.equity, true)]
      : row.mode === "valuation"
        ? [parseAssetAmount(row.value), parseAssetAmount(row.debt)]
        : [
            parseAssetAmount(
              row.category === "debt" ? row.debt : row.value,
              row.category !== "debt" && row.category !== "personal_savings",
            ),
          ];
  const missing = amounts.filter((amount) => amount === undefined).length;
  const invalid = amounts.filter((amount) => amount === null).length;
  const complete = !missing && !invalid;
  const net = !complete
    ? null
    : row.mode === "valuation"
      ? amounts[0]! - amounts[1]!
      : row.category === "debt"
        ? -amounts[0]!
        : amounts[0]!;
  return {
    net,
    missing,
    invalid,
    complete,
    hasAmounts: amounts.some((amount) => typeof amount === "number"),
  };
}
export function changeAssetMode(row: AssetRow, mode: "valuation" | "equity"): AssetRow {
  if (row.mode === mode) return row;
  const calculated = calculateAssetRow(row);
  return {
    ...row,
    mode,
    equity:
      mode === "equity" && calculated.net !== null ? String(calculated.net / 100) : row.equity,
  };
}
export function calculateClientAssets(calculation: AssetCalculation) {
  let net = 0,
    superannuation = 0,
    combinedSavings = 0,
    personalSavings = 0,
    hasPersonalSavings = false,
    missing = 0,
    invalid = 0,
    incomplete = 0,
    hasAmounts = false;
  for (const row of calculation.rows) {
    const result = calculateAssetRow(row);
    net += result.net ?? 0;
    if (row.category === "savings") combinedSavings += result.net ?? 0;
    if (row.category === "personal_savings" && result.net !== null) {
      personalSavings += result.net;
      hasPersonalSavings = true;
    }
    if (row.category === "super") superannuation += result.net ?? 0;
    missing += result.missing;
    invalid += result.invalid;
    if (!result.complete) incomplete++;
    hasAmounts ||= result.hasAmounts;
  }
  // Older estimates recorded savings and investments as one inclusive amount.
  net -= Math.min(Math.max(0, combinedSavings), personalSavings);
  return {
    net,
    personalSavings: hasPersonalSavings ? personalSavings : null,
    superannuation,
    excludingSuper: net - superannuation,
    missing,
    invalid,
    incomplete,
    hasRows: calculation.rows.length > 0,
    hasAmounts,
    targetReached: net >= ASSET_TARGET,
  };
}
export function assetRowDescription(row: AssetRow): string {
  if (row.mode === "equity") return `Equity ${row.equity || "unknown"}`;
  if (row.mode === "valuation")
    return `Value ${row.value || "unknown"} · Owing ${row.debt || "unknown"}`;
  return `${row.category === "debt" ? "Owing" : "Amount"} ${row.category === "debt" ? row.debt || "unknown" : row.value || "unknown"}`;
}
export class AssetSaveConflict extends Error {
  constructor() {
    super(
      "This client’s assets were updated elsewhere. Review the saved version before continuing.",
    );
  }
}
