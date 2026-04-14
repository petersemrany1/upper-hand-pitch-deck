import { useMemo } from "react";
import SlideHeader from "./SlideHeader";

const ALL_CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1,
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

const CONVERT_LABELS: Record<string, string> = {
  "1 in 4": "1 in 4 Conversion",
  "1 in 3": "1 in 3 Conversion",
  "1 in 2": "1 in 2 Conversion",
};

interface Props {
  caseValue: number;
  convertRate: string;
  onCaseValueChange: (value: number) => void;
  onConvertRateChange: (value: string) => void;
}

export default function ROICalculator({ caseValue, convertRate, onCaseValueChange, onConvertRateChange }: Props) {
  const shows = 20;
  const fmt = (n: number) => "$" + (Math.round(n / 1000) * 1000).toLocaleString();

  const columns = useMemo(() => {
    return (["1 in 4", "1 in 3", "1 in 2"] as const).map((label) => {
      const denom = parseInt(label.split("in ")[1]) || 4;
      const procedures = shows / denom;
      const revenue = procedures * caseValue;
      return { label, revenue };
    });
  }, [caseValue]);

  const handleCaseValueChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    onCaseValueChange(isNaN(num) ? 0 : num);
  };

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
          See What This Is Worth To Your Clinic.
        </h2>

        {/* Editable inputs — centered side by side */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="text-left">
            <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium tracking-wide uppercase">
              Average Case Value ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={caseValue === 0 ? "" : caseValue.toLocaleString()}
              onChange={(e) => handleCaseValueChange(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-2.5 text-foreground text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
          <div className="text-left">
            <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium tracking-wide uppercase">
              Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => onConvertRateChange(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-2.5 text-foreground text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer w-48"
            >
              {Object.entries(ALL_CONVERT_RATES).map(([label, r]) => (
                <option key={label} value={label}>{label} ({Math.round(r * 100)}%)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 conversion columns — centered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {columns.map((col) => {
            const isSelected = col.label === convertRate;
            return (
              <div
                key={col.label}
                className={`rounded-xl border p-10 text-center ${
                  isSelected
                    ? "bg-primary/15 border-primary ring-2 ring-primary"
                    : "bg-card border-border"
                }`}
              >
                <p className="text-sm text-[#CCCCCC] mb-3 font-medium uppercase tracking-wide">
                  {CONVERT_LABELS[col.label]}
                </p>
                <p className={`font-extrabold ${isSelected ? "text-primary" : "text-foreground"}`} style={{ fontSize: 'clamp(1.5rem, 5vw, 4.5rem)', overflowWrap: 'break-word', wordBreak: 'break-all', whiteSpace: 'nowrap', maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {fmt(col.revenue)}
                </p>
                <p className="text-sm text-[#CCCCCC] mt-3">Monthly Revenue</p>
              </div>
            );
          })}
        </div>

        {/* Included list — centered */}
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
