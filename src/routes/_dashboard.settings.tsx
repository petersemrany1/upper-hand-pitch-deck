import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsRedirect,
});

const STORAGE_KEY = "pitch-deck-settings";

export type DeckSettings = {
  caseValue: number;
  pricePerShow: number;
  convertRate: string;
};

export const DEFAULT_SETTINGS: DeckSettings = {
  caseValue: 12000,
  pricePerShow: 1100,
  convertRate: "1 in 4",
};

const CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1,
  "3 in 4": 0.75,
  "1 in 2": 0.5,
  "1 in 3": 0.333,
  "1 in 4": 0.25,
  "1 in 5": 0.2,
  "1 in 6": 0.167,
  "1 in 7": 0.143,
  "1 in 8": 0.125,
  "1 in 9": 0.111,
  "1 in 10": 0.1,
};

export function loadDeckSettings(): DeckSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      caseValue: Number(parsed.caseValue) || DEFAULT_SETTINGS.caseValue,
      pricePerShow: Number(parsed.pricePerShow) || DEFAULT_SETTINGS.pricePerShow,
      convertRate: typeof parsed.convertRate === "string" && parsed.convertRate in CONVERT_RATES ? parsed.convertRate : DEFAULT_SETTINGS.convertRate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function SettingsRedirect() {
  return <Navigate to="/pitch-deck" />;
}
