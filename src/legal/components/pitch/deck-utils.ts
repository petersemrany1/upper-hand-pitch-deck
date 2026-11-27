// Ported from the Legal app (family-law-floater/src/components/pitch/deck-utils.ts). Re-run the port script to refresh.
export type ConversionOption = { label: string; value: number };

export const CONVERSION_OPTIONS: ConversionOption[] = [
  { label: "1 in 1", value: 1 },
  { label: "3 in 4", value: 0.75 },
  { label: "1 in 2", value: 0.5 },
  { label: "1 in 3", value: 0.333 },
  { label: "1 in 4", value: 0.25 },
  { label: "1 in 5", value: 0.2 },
  { label: "1 in 6", value: 0.167 },
  { label: "1 in 7", value: 0.143 },
  { label: "1 in 8", value: 0.125 },
  { label: "1 in 9", value: 0.111 },
  { label: "1 in 10", value: 0.1 },
];

export const CLIENT_DEPOSIT = 75;
export const DERISK_ILLUSTRATIVE = 18500;

export type DeckSettings = {
  matterValue: number;
  pricePerShow: number;
  conversionLabel: string;
  includeRiskSlide: boolean;
};

export const DEFAULT_SETTINGS: DeckSettings = {
  matterValue: 40000,
  pricePerShow: 1850,
  conversionLabel: "1 in 2",
  includeRiskSlide: false,
};

export const SETTINGS_KEY = "legal-deck-settings";

export function loadSettings(): DeckSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DeckSettings>;
    return {
      matterValue: Number(parsed.matterValue) || DEFAULT_SETTINGS.matterValue,
      pricePerShow: Number(parsed.pricePerShow) || DEFAULT_SETTINGS.pricePerShow,
      conversionLabel:
        CONVERSION_OPTIONS.some((o) => o.label === parsed.conversionLabel) && parsed.conversionLabel
          ? parsed.conversionLabel
          : DEFAULT_SETTINGS.conversionLabel,
      includeRiskSlide:
        typeof parsed.includeRiskSlide === "boolean"
          ? parsed.includeRiskSlide
          : DEFAULT_SETTINGS.includeRiskSlide,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: DeckSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — ignore */
  }
}

const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
  currencyDisplay: "narrowSymbol",
});

export function formatCurrency(value: number): string {
  return currency.format(Math.round(value)).replace("A$", "$");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-AU").format(Math.round(value));
}

export function roundToThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

export function conversionValue(label: string): number {
  return CONVERSION_OPTIONS.find((o) => o.label === label)?.value ?? 0.5;
}

export function conversionPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function digitsOnly(input: string): string {
  return input.replace(/[^\d]/g, "");
}
