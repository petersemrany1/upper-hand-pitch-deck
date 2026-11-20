import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
// The database aggregate uses the same 10-second proxy as number health.

type Period = "today" | "week" | "month" | "all";

function sydneyParts(now: Date = new Date()): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(now).split("-").map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d };
}
function sydneyMidnightUTC(year: number, month: number, day: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const sydStr = guess.toLocaleString("en-US", { timeZone: "Australia/Sydney" });
  const sydAsLocal = new Date(sydStr);
  const offsetMs = sydAsLocal.getTime() - guess.getTime();
  return new Date(guess.getTime() - offsetMs);
}
function sydneyDayOfWeekMonFirst(now: Date = new Date()): number {
  // 0 = Monday, 6 = Sunday
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Australia/Sydney", weekday: "short" });
  const w = fmt.format(now);
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[w] ?? 0;
}

function periodStartISO(period: Period): string | null {
  if (period === "all") return null;
  const { year, month, day } = sydneyParts();
  if (period === "today") return sydneyMidnightUTC(year, month, day).toISOString();
  if (period === "month") return sydneyMidnightUTC(year, month, 1).toISOString();
  // week: Monday of the current Sydney week
  const dow = sydneyDayOfWeekMonFirst();
  const todayMidnight = sydneyMidnightUTC(year, month, day);
  const monday = new Date(todayMidnight.getTime() - dow * 24 * 60 * 60 * 1000);
  return monday.toISOString();
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

export function PickupRateCard() {
  const [period, setPeriod] = useState<Period>("today");
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      const sinceIso = periodStartISO(period);
      const { data, error } = await (supabase as any).rpc("voice_pickup_rate", { p_since: sinceIso });
      if (cancelled) return;
      if (error) {
        console.error("PickupRateCard load failed", error);
        setLoadError(true);
        setLoading(false);
        return;
      }
      setTotal(data?.total ?? 0);
      setAnswered(data?.answered ?? 0);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [period]);

  const pct = useMemo(() => (total === 0 ? 0 : Math.round((answered / total) * 100)), [answered, total]);
  const pctColor = pct >= 40 ? "#16a34a" : pct >= 25 ? "#f59e0b" : "#f4522d";

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e8e8e6",
        borderRadius: 14,
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      <div style={{ padding: "12px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>Pickup rate</div>
        <div style={{ display: "flex", gap: 4 }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
            const active = p === period;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `0.5px solid ${active ? "#111" : "#e8e8e6"}`,
                  background: active ? "#111" : "#fff",
                  color: active ? "#fff" : "#666",
                  cursor: "pointer",
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "4px 20px 16px", display: "flex", alignItems: "baseline", gap: 12 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: pctColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {loading || loadError ? "—" : `${pct}%`}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {loadError ? "Pickup rate unavailable" : loading ? "loading" : `${answered} of ${total} calls lasted 10s+ · minimum 25%`}
        </div>
      </div>
    </div>
  );
}
