import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, Info } from "lucide-react";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [{ title: "Settings" }],
  }),
});

const STORAGE_KEY = "pitch-deck-settings";

export type DeckSettings = {
  caseValue: number;
  pricePerShow: number;
  convertRate: string;
};

export const DEFAULT_SETTINGS: DeckSettings = {
  caseValue: 12000,
  pricePerShow: 800,
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
      convertRate:
        typeof parsed.convertRate === "string" && parsed.convertRate in CONVERT_RATES
          ? parsed.convertRate
          : DEFAULT_SETTINGS.convertRate,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#111111] px-6 py-10 md:px-10 md:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Settings
            </h1>
            <p className="text-sm text-[#111111] mt-0.5">
              Payment links are now generated dynamically.
            </p>
          </div>
        </div>

        <section className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Payment Links</h2>
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 text-sm text-foreground">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-medium mb-1">Stripe links are now fully dynamic.</p>
              <p className="text-[#111111] leading-relaxed">
                When you press <strong>Send Payment Link</strong>, a fresh Stripe Checkout
                Session is created for the exact amount of the selected pack — including
                custom prices. You no longer need to paste Stripe URLs here, and pricing
                changes will always be reflected in the email/SMS link.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
