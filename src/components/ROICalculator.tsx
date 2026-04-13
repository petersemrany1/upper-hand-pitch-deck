import { useState, useMemo } from "react";
import SlideHeader from "./SlideHeader";

const CONVERT_RATES: Record<string, number> = {
  "1 in 4": 0.25,
  "1 in 3": 0.333,
  "1 in 2": 0.5,
};
const SHOWS_OPTIONS = [10, 20, 30, 40];
const COST_PER_SHOW = 1300;

export default function ROICalculator() {
  const [caseValue, setCaseValue] = useState(12000);
  const [convertRate, setConvertRate] = useState("1 in 4");
  const [shows, setShows] = useState(10);

  const results = useMemo(() => {
    const rate = CONVERT_RATES[convertRate] ?? 0.25;
    const monthlyRevenue = shows * rate * caseValue;
    const annualRevenue = monthlyRevenue * 12;
    const investment = shows * COST_PER_SHOW;
    const roi = investment > 0 ? ((monthlyRevenue - investment) / investment) * 100 : 0;
    return { monthlyRevenue, annualRevenue, investment, roi };
  }, [caseValue, convertRate, shows]);

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  const inputClass =
    "w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
      <SlideHeader />
      <div className="max-w-4xl w-full">
        <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-4">
          Your Numbers
        </p>
        <h2
          className="text-3xl md:text-5xl font-extrabold text-foreground mb-12 leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          See What This Is Worth To Your Clinic.
        </h2>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div>
            <label className="text-xs text-muted-foreground block mb-2 font-medium">
              Average Case Value ($)
            </label>
            <input
              type="number"
              value={caseValue}
              onChange={(e) => setCaseValue(Number(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2 font-medium">
              Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => setConvertRate(e.target.value)}
              className={inputClass + " appearance-none cursor-pointer"}
            >
              {Object.keys(CONVERT_RATES).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2 font-medium">
              Shows Per Month
            </label>
            <select
              value={shows}
              onChange={(e) => setShows(Number(e.target.value))}
              className={inputClass + " appearance-none cursor-pointer"}
            >
              {SHOWS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Monthly Revenue</p>
            <p className="text-3xl font-extrabold text-primary">{fmt(results.monthlyRevenue)}</p>
          </div>
          <div className="bg-foreground/5 border border-border rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Annual Revenue</p>
            <p className="text-3xl font-extrabold text-foreground">{fmt(results.annualRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Your Cost</p>
            <p className="text-3xl font-extrabold text-muted-foreground">{fmt(results.investment)}</p>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-center">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Return On Investment</p>
          <p className="text-4xl font-extrabold text-primary">{Math.round(results.roi)}%</p>
        </div>

        <p className="text-[11px] text-muted-foreground mt-6 text-center">
          *Projections only. Individual results vary.
        </p>
      </div>
    </div>
  );
}
