import { useMemo } from "react";
import SlideHeader from "./SlideHeader";

const ALL_CONVERT_RATES: Record<string, number> = {
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

const RATE_ORDER = ["1 in 10","1 in 9","1 in 8","1 in 7","1 in 6","1 in 5","1 in 4","1 in 3","1 in 2","3 in 4","1 in 1"];

function getConvertLabel(label: string): string {
  return label + " Conversion";
}

interface Props {
  caseValue: number;
  convertRate: string;
  pricePerShow: number;
  onCaseValueChange: (value: number) => void;
  onConvertRateChange: (value: string) => void;
  onPricePerShowChange: (value: number) => void;
}

export default function ROICalculator({ caseValue, convertRate, pricePerShow, onCaseValueChange, onConvertRateChange, onPricePerShowChange }: Props) {
  const shows = 20;
  const fmt = (n: number) => "$" + (Math.round(n / 1000) * 1000).toLocaleString();

  // Always show three rates centered on the selected one — clamp at the edges so
  // the selected rate visibly sits in the matching column.
  const { columns, selectedColIdx } = useMemo(() => {
    const idx = RATE_ORDER.indexOf(convertRate);
    const safe = idx === -1 ? 6 : idx;
    let start = safe - 1;
    if (start < 0) start = 0;
    if (start > RATE_ORDER.length - 3) start = RATE_ORDER.length - 3;
    const labels = [RATE_ORDER[start], RATE_ORDER[start + 1], RATE_ORDER[start + 2]];
    const cols = labels.map((label) => {
      const r = ALL_CONVERT_RATES[label] ?? 0.25;
      const procedures = shows * r;
      const revenue = procedures * caseValue;
      return { label, revenue };
    });
    return { columns: cols, selectedColIdx: labels.indexOf(convertRate) };
  }, [caseValue, convertRate]);

  // Inputs intentionally removed from the deck — values are driven from /settings.
  void onCaseValueChange;
  void onPricePerShowChange;

  return (
    <div className="deck-slide flex flex-col items-center justify-center min-h-screen w-full px-16 py-12">
      <SlideHeader />
      <div className="w-full max-w-5xl text-center">
        <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
          YOUR NUMBERS
        </p>
        <h2
          className="text-4xl md:text-[4rem] font-extrabold text-foreground mb-10 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          What This Looks Like For Your Clinic.
        </h2>

        {/* 3 conversion columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {columns.map((col, i) => {
            const isSelected = i === selectedColIdx;
            const investment = shows * pricePerShow;
            return (
              <button
                key={col.label}
                type="button"
                onClick={() => onConvertRateChange(col.label)}
                className={`rounded-xl border p-10 text-center transition-all ${
                  isSelected
                    ? "bg-primary/15 border-primary ring-2 ring-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <p className="text-sm text-[#CCCCCC] mb-3 font-medium uppercase tracking-wide">
                  {getConvertLabel(col.label)}
                </p>
                <p className={`font-extrabold ${isSelected ? "text-primary" : "text-foreground"}`} style={{ fontSize: 'clamp(1rem, 4vw, 4.5rem)', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {fmt(col.revenue)}
                </p>
                <p className="text-sm text-[#CCCCCC] mt-3">Monthly Revenue</p>
                <div className="mt-5 pt-4 border-t border-border/60">
                  <p className="text-[10px] text-[#888] uppercase tracking-wider mb-1">Your Investment</p>
                  <p className="text-base font-bold text-foreground">${investment.toLocaleString()}</p>
                  <p className="text-[11px] text-[#888] mt-0.5">+ GST</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Included list */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#CCCCCC]">
          {["20 Showed Appointments", "Ad Creative", "Lead Handling", "After Consult Follow-Up"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span className="text-primary">✓</span> {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
