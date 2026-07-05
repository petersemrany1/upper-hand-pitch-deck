import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;
// A call is "answered" if it lasted at least this many seconds.
// Matches how SalesCallPortal treats <=10s outbound calls as voicemail.
const ANSWERED_MIN_SECONDS = 10;

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
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const sinceIso = periodStartISO(period);
      // Only count real dial attempts — direction='outbound', not test calls.
      let q = supabase
        .from("call_records")
        .select("duration, duration_seconds", { count: "exact" })
        .eq("direction", "outbound");
      if (sinceIso) q = q.gte("called_at", sinceIso);
      const { data, error } = await q.limit(50000);
      if (cancelled) return;
      if (error) {
        console.error("PickupRateCard load failed", error);
        setLoading(false);
        return;
      }
      const rows = data ?? [];
      const answeredCount = rows.reduce((acc, r) => {
        const secs = (r.duration_seconds ?? r.duration ?? 0) as number;
        return acc + (secs >= ANSWERED_MIN_SECONDS ? 1 : 0);
      }, 0);
      setTotal(rows.length);
      setAnswered(answeredCount);
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
          {loading ? "—" : `${pct}%`}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {loading ? "loading" : `${answered} answered of ${total} calls`}
        </div>
      </div>
    </div>
  );
}
