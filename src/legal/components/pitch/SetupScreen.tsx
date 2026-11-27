// Ported from the Legal app (family-law-floater/src/components/pitch/SetupScreen.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import {
  CONVERSION_OPTIONS,
  conversionPercent,
  digitsOnly,
  formatNumber,
  type DeckSettings,
} from "./deck-utils";
import { DeckLines } from "./DeckLines";
import { SlideHeader } from "./SlideHeader";

export function SetupScreen({
  settings,
  onStart,
}: {
  settings: DeckSettings;
  onStart: (s: DeckSettings) => void;
}) {
  const [matterValue, setMatterValue] = useState(formatNumber(settings.matterValue));
  const [pricePerShow, setPricePerShow] = useState(formatNumber(settings.pricePerShow));
  const [conversionLabel, setConversionLabel] = useState(settings.conversionLabel);
  const [includeRiskSlide, setIncludeRiskSlide] = useState(settings.includeRiskSlide);

  const matterNum = Number(digitsOnly(matterValue) || 0);
  const priceNum = Number(digitsOnly(pricePerShow) || 0);
  const matterOk = matterNum >= 1000;
  const priceOk = priceNum >= 100;
  const valid = matterOk && priceOk;
  const touched = matterValue.length > 0 || pricePerShow.length > 0;

  const errors: string[] = [];
  if (!matterOk) errors.push("Average matter value must be at least $1,000.");
  if (!priceOk) errors.push("Price per show must be at least $100.");

  const handleNumeric = (setter: (v: string) => void) => (raw: string) => {
    const digits = digitsOnly(raw);
    setter(digits ? formatNumber(Number(digits)) : "");
  };

  return (
    <div className="deck-setup relative">
      <DeckLines />
      <SlideHeader />
      <div className="deck-setup-content">
        <h1
          className="mb-2 text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set your presentation numbers
        </h1>
        <p className="mb-8 text-sm font-medium text-muted-foreground">
          Enter the values you'll use in today's pitch, then start the deck.
        </p>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onStart({
              matterValue: matterNum,
              pricePerShow: priceNum,
              conversionLabel,
              includeRiskSlide,
            });
          }}
        >
          <div>
            <label htmlFor="matter" className="mb-2 block text-sm font-semibold">
              Average Matter Value ($)
            </label>
            <input
              id="matter"
              inputMode="numeric"
              className="w-full focus-visible:ring-2 focus-visible:ring-ring"
              value={matterValue}
              onChange={(e) => handleNumeric(setMatterValue)(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-semibold">
              Price Per Show ($)
            </label>
            <input
              id="price"
              inputMode="numeric"
              className="w-full focus-visible:ring-2 focus-visible:ring-ring"
              value={pricePerShow}
              onChange={(e) => handleNumeric(setPricePerShow)(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="rate" className="mb-2 block text-sm font-semibold">
              Estimated Conversion Rate
            </label>
            <select
              id="rate"
              className="w-full focus-visible:ring-2 focus-visible:ring-ring"
              value={conversionLabel}
              onChange={(e) => setConversionLabel(e.target.value)}
            >
              {CONVERSION_OPTIONS.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label} ({conversionPercent(o.value)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-sm font-semibold">Include "Risk Sits With Us" slide</span>
            <button
              type="button"
              role="switch"
              aria-checked={includeRiskSlide}
              onClick={() => setIncludeRiskSlide((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                includeRiskSlide ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                  includeRiskSlide ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {!valid && touched && <p className="text-sm text-red-400">{errors.join(" ")}</p>}

          <button
            type="submit"
            disabled={!valid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold tracking-[0.15em] text-primary-foreground uppercase transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start Presentation <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
