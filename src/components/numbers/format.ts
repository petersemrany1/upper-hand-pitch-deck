import type { CSSProperties } from "react";
import { APP_TIMEZONE } from "@/lib/timezone";

// Shared look + number formatting for the Numbers page. Kept in one place so
// every tab reads the same way.

export const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

export const CARD: CSSProperties = {
  background: "#fff",
  border: "0.5px solid #e8e8e6",
  borderRadius: 14,
  padding: 18,
};

export const INK = "#111111";
export const MUTED = "#6b6b6b";
export const FAINT = "#8a8a86";
export const GREEN = "#2f6f4f";
export const AMBER = "#8a5a2b";
export const AMBER_DOT = "#c98a2e";
export const RED = "#b03030";
export const GREY_DOT = "#c2c2be";

export const LABEL: CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: FAINT,
  fontWeight: 500,
};

export const BIG: CSSProperties = {
  fontSize: 30,
  fontWeight: 600,
  color: INK,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: -0.5,
  marginTop: 4,
  lineHeight: 1.1,
};

export const th2: CSSProperties = { padding: "8px 8px", fontWeight: 500, whiteSpace: "nowrap", fontSize: 11.5, color: FAINT, textAlign: "left" };
export const th2r: CSSProperties = { ...th2, textAlign: "right" };
export const td2: CSSProperties = { padding: "9px 8px", whiteSpace: "nowrap", fontSize: 13 };
export const td2r: CSSProperties = { ...td2, textAlign: "right", fontVariantNumeric: "tabular-nums" };

export type RangeKey = "month" | "30d" | "90d" | "all" | "custom";

export function todaySydney(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

export function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function resolveRange(key: RangeKey, cf: string, ct: string): { from: string | null; to: string | null } {
  const today = todaySydney();
  if (key === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (key === "30d") return { from: shiftDays(today, -29), to: today };
  if (key === "90d") return { from: shiftDays(today, -89), to: today };
  if (key === "custom") return { from: cf || null, to: ct || null };
  return { from: null, to: null };
}

export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;

/** "$1,234" or "—" when the figure can't be computed. */
export const moneyOrDash = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : money(n);

/** Percentage from a ratio (0.25 → "25%"). One decimal only when under 10%. */
export const pctOrDash = (ratio: number | null | undefined) => {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "—";
  const v = ratio * 100;
  return `${v < 10 ? v.toFixed(1) : v.toFixed(0)}%`;
};

export const ratio = (num: number, den: number): number | null => (den > 0 ? num / den : null);

/** spend ÷ divisor, or null when either side is zero. */
export const perUnit = (amount: number, divisor: number): number | null =>
  amount > 0 && divisor > 0 ? amount / divisor : null;

export const oneDp = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : n.toFixed(1);

export type Tone = "green" | "amber" | "red" | "grey";

export const TONE: Record<Tone, { text: string; dot: string; bg: string }> = {
  green: { text: GREEN, dot: GREEN, bg: "#eef7f0" },
  amber: { text: AMBER, dot: AMBER_DOT, bg: "#fdf5e6" },
  red: { text: RED, dot: RED, bg: "#fdeeee" },
  grey: { text: MUTED, dot: GREY_DOT, bg: "#f4f4f2" },
};

export const rowStyle = (selected: boolean, clickable: boolean): CSSProperties => ({
  borderTop: "0.5px solid #f0f0ee",
  cursor: clickable ? "pointer" : "default",
  background: selected ? "#f5f4ef" : "transparent",
});
