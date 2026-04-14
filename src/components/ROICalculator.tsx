import { useMemo } from "react";
import SlideHeader from "./SlideHeader";

const CONVERT_RATES: Record<string, number> = {
  "1 in 4": 0.25,
  "1 in 3": 0.333,
  "1 in 2": 0.5,
};
const COST_PER_SHOW = 1100; // $1,000 + GST

interface Props {
  caseValue: number;
  convertRate: string;
}

export default function ROICalculator({ caseValue, convertRate }: Props) {
  const results = useMemo(() => {
    const rate = CONVERT_RATES[convertRate] ?? 0.25;
    const shows = 20;
    const monthlyRevenue = shows * rate * caseValue;
    const annualRevenue = monthlyRevenue * 12;
    const investment = shows * COST_PER_SHOW;
    const roi = investment > 0 ? ((monthlyRevenue - investment) / investment) * 100 : 0;
    return { monthlyRevenue, annualRevenue, investment, roi };
  }, [caseValue, convertRate]);

  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

  return (
    <div className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24">
      <SlideHeader />
      <div className="max-w-4xl w-full">
        <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
          YOUR NUMBERS
        </p>
        <h2
          className="text-4xl md:text-[4rem] font-extrabold text-foreground mb-12 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          See What This Is Worth To Your Clinic.
        </h2>

        {/* Big revenue number */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-10 text-center mb-6">
          <p className="text-sm text-[#CCCCCC] mb-3 font-medium tracking-wide uppercase">Estimated Monthly Revenue</p>
          <p className="text-6xl md:text-7xl font-extrabold text-primary">{fmt(results.monthlyRevenue)}</p>
          <p className="text-sm text-[#CCCCCC] mt-3">Based on 20 shows/month · {convertRate} conversion · {fmt(caseValue)} avg case</p>
        </div>

        {/* Supporting numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-[#CCCCCC] mb-2 font-medium">Annual Revenue</p>
            <p className="text-2xl font-extrabold text-foreground">{fmt(results.annualRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-[#CCCCCC] mb-2 font-medium">Your Monthly Cost</p>
            <p className="text-2xl font-extrabold text-[#CCCCCC]">{fmt(results.investment)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-[#CCCCCC] mb-2 font-medium">Return On Investment</p>
            <p className="text-2xl font-extrabold text-primary">{Math.round(results.roi)}%</p>
          </div>
        </div>

        <p className="text-[11px] text-[#999] mt-6 text-center">
          *Projections only. Individual results vary.
        </p>
      </div>
    </div>
  );
}
