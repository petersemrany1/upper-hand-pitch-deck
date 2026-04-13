import { useState, useMemo } from "react";

const CONVERT_RATES: Record<string, number> = {
  "1 in 4": 0.25,
  "1 in 3": 0.333,
  "1 in 2": 0.5,
};
const SHOWS_OPTIONS = [10, 20, 30];
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

  const selectClass = "w-full bg-input border border-border rounded-lg p-3 text-foreground text-base appearance-none cursor-pointer";

  return (
    <div className="deck-slide flex flex-col items-center justify-center px-6 md:px-16">
      <div className="max-w-5xl w-full">
        <span className="text-primary text-sm font-bold tracking-widest uppercase mb-3 block">Your Numbers</span>
        <h2 className="text-3xl md:text-5xl font-black text-foreground mb-10" style={{ fontFamily: "var(--font-display)" }}>
          SEE WHAT THIS IS WORTH TO YOUR CLINIC
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-card border border-border rounded-lg p-6">
            <label className="text-sm text-muted-foreground block mb-2">Your average case value ($)</label>
            <input
              type="number"
              value={caseValue}
              onChange={(e) => setCaseValue(Number(e.target.value) || 0)}
              className="w-full bg-input border border-border rounded-lg p-3 text-foreground text-2xl font-bold"
            />
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <label className="text-sm text-muted-foreground block mb-2">Your current consult-to-convert rate</label>
            <select value={convertRate} onChange={(e) => setConvertRate(e.target.value)} className={selectClass}>
              {Object.keys(CONVERT_RATES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <label className="text-sm text-muted-foreground block mb-2">Shows per month</label>
            <select value={shows} onChange={(e) => setShows(Number(e.target.value))} className={selectClass}>
              {SHOWS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s} shows</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Monthly Revenue Generated</p>
            <p className="text-3xl md:text-4xl font-black text-primary">{fmt(results.monthlyRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Annual Revenue Generated</p>
            <p className="text-3xl md:text-4xl font-black text-foreground">{fmt(results.annualRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Investment</p>
            <p className="text-3xl md:text-4xl font-black text-muted-foreground">{fmt(results.investment)}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Your Return On Investment</p>
          <p className="text-4xl md:text-5xl font-black text-primary">{Math.round(results.roi)}%</p>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          *Revenue figures are projections based on inputs provided. Individual results will vary.
        </p>
      </div>
    </div>
  );
}
