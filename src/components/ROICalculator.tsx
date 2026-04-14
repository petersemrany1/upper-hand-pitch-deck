import { useState, useMemo } from "react";
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

interface Props {
  caseValue: number;
  convertRate: string;
}

export default function ROICalculator({ caseValue: initialCaseValue, convertRate: initialConvertRate }: Props) {
  const [caseValue, setCaseValue] = useState(initialCaseValue);
  const [convertRate, setConvertRate] = useState(initialConvertRate);

  const shows = 20;
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  const columns = useMemo(() => {
    return (["1 in 4", "1 in 3", "1 in 2"] as const).map((label) => {
      const r = ALL_CONVERT_RATES[label];
      const revenue = shows * r * caseValue;
      return { label, rate: r, revenue };
    });
  }, [caseValue]);

  const handleCaseValueChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    setCaseValue(isNaN(num) ? 0 : num);
  };

  return (
    <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <div className="max-w-4xl w-full">
        <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
          YOUR NUMBERS
        </p>
        <h2
          className="text-4xl md:text-[4rem] font-extrabold text-foreground mb-10 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          See What This Is Worth To Your Clinic.
        </h2>

        {/* Editable inputs */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium tracking-wide uppercase">
              Average Case Value ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={caseValue === 0 ? "" : caseValue.toString()}
              onChange={(e) => handleCaseValueChange(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-2.5 text-foreground text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium tracking-wide uppercase">
              Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => setConvertRate(e.target.value)}
              className="bg-input border border-border rounded-lg px-4 py-2.5 text-foreground text-base font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer w-48"
            >
              {Object.entries(ALL_CONVERT_RATES).map(([label, r]) => (
                <option key={label} value={label}>{label} ({Math.round(r * 100)}%)</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 conversion columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {columns.map((col) => (
            <div
              key={col.label}
              className={`rounded-xl border p-8 text-center ${
                col.label === convertRate
                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                  : "bg-card border-border"
              }`}
            >
              <p className="text-xs text-[#CCCCCC] mb-2 font-medium uppercase tracking-wide">{col.label} Convert</p>
              <p className={`text-4xl md:text-5xl font-extrabold ${col.label === convertRate ? "text-primary" : "text-foreground"}`}>
                {fmt(col.revenue)}
              </p>
              <p className="text-xs text-[#CCCCCC] mt-2">Monthly Revenue</p>
            </div>
          ))}
        </div>

        {/* Included list */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#CCCCCC]">
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
