import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Presentation Settings" },
      { name: "description", content: "Set your pitch deck presentation numbers." },
    ],
  }),
});

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

function SettingsPage() {
  const navigate = useNavigate();
  const [caseValue, setCaseValue] = useState("12000");
  const [pricePerShow, setPricePerShow] = useState("1100");
  const [convertRate, setConvertRate] = useState("1 in 4");

  useEffect(() => {
    const s = loadDeckSettings();
    setCaseValue(String(s.caseValue));
    setPricePerShow(String(s.pricePerShow));
    setConvertRate(s.convertRate);
  }, []);

  const handleCaseValueChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    setCaseValue(isNaN(num) ? "" : String(Math.min(num, 999999)));
  };

  const handlePriceChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    setPricePerShow(isNaN(num) ? "" : String(Math.min(num, 99999)));
  };

  const formattedCaseValue = caseValue ? Number(caseValue).toLocaleString("en-US") : "";
  const formattedPrice = pricePerShow ? Number(pricePerShow).toLocaleString("en-US") : "";

  const isValid = parseInt(caseValue, 10) >= 1000 && parseInt(pricePerShow, 10) >= 100;

  const persist = () => {
    const payload: DeckSettings = {
      caseValue: parseInt(caseValue, 10) || DEFAULT_SETTINGS.caseValue,
      pricePerShow: parseInt(pricePerShow, 10) || DEFAULT_SETTINGS.pricePerShow,
      convertRate,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const handleStart = () => {
    persist();
    navigate({ to: "/pitch-deck" });
  };

  return (
    <div className="min-h-screen w-full px-6 py-12 flex items-start justify-center">
      <div className="max-w-md w-full">
        <h1
          className="text-3xl md:text-4xl font-extrabold text-foreground mb-10 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set Your Presentation Numbers
        </h1>

        <div className="space-y-5 mb-8">
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Average Procedure Value ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formattedCaseValue}
              onChange={(e) => handleCaseValueChange(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Price Per Show ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formattedPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Estimated Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => setConvertRate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              {Object.entries(CONVERT_RATES).map(([label, r]) => (
                <option key={label} value={label}>{label} ({Math.round(r * 100)}%)</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!isValid}
          className="w-full bg-primary text-primary-foreground font-bold text-base px-6 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          START PRESENTATION →
        </button>
        {!isValid && (caseValue !== "" || pricePerShow !== "") && (
          <p className="text-xs text-red-400 mt-3 text-center">Procedure value must be at least $1,000 and price per show at least $100.</p>
        )}
      </div>
    </div>
  );
}
