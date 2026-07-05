import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FONT = `"DM Sans", system-ui, -apple-system, sans-serif`;

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

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr === 0 ? `${d}d` : `${d}d ${hr}h`;
}

export function SpeedToLeadCard() {
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [avgMs, setAvgMs] = useState<number | null>(null);
  const [medianMs, setMedianMs] = useState<number | null>(null);
  const [leadsCalled, setLeadsCalled] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const sinceIso = periodStartISO(period);

      // Fetch leads created in the period (all-time capped for perf).
      let leadsQ = supabase.from("meta_leads").select("id, created_at").order("created_at", { ascending: false });
      if (sinceIso) leadsQ = leadsQ.gte("created_at", sinceIso);
      const { data: leads, error: leadsErr } = await leadsQ.limit(5000);
      if (cancelled) return;
      if (leadsErr) {
        console.error("SpeedToLeadCard leads failed", leadsErr);
        setLoading(false);
        return;
      }
      const leadRows = leads ?? [];
      const leadMap = new Map<string, string>();
      leadRows.forEach((l) => leadMap.set(l.id as string, l.created_at as string));

      if (leadMap.size === 0) {
        setAvgMs(null); setMedianMs(null); setLeadsCalled(0); setLeadsTotal(0); setLoading(false);
        return;
      }

      // Fetch outbound calls for those leads. Chunk id list to keep URL small.
      const ids = Array.from(leadMap.keys());
      const firstCall = new Map<string, number>();
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        const { data: calls, error: cErr } = await supabase
          .from("call_records")
          .select("lead_id, called_at")
          .eq("direction", "outbound")
          .in("lead_id", chunk)
          .limit(10000);
        if (cancelled) return;
        if (cErr) { console.error("SpeedToLeadCard calls failed", cErr); continue; }
        (calls ?? []).forEach((c) => {
          const lid = c.lead_id as string | null;
          const at = c.called_at as string | null;
          if (!lid || !at) return;
          const t = new Date(at).getTime();
          const cur = firstCall.get(lid);
          if (cur === undefined || t < cur) firstCall.set(lid, t);
        });
      }

      const diffs: number[] = [];
      firstCall.forEach((tCall, lid) => {
        const created = leadMap.get(lid);
        if (!created) return;
        const tLead = new Date(created).getTime();
        const d = tCall - tLead;
        if (d >= 0) diffs.push(d);
      });

      if (diffs.length === 0) {
        setAvgMs(null); setMedianMs(null); setLeadsCalled(0); setLeadsTotal(leadMap.size); setLoading(false);
        return;
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const sorted = [...diffs].sort((a, b) => a - b);
      const median = sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

      setAvgMs(avg);
      setMedianMs(median);
      setLeadsCalled(diffs.length);
      setLeadsTotal(leadMap.size);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [period]);

  const avgLabel = useMemo(() => (avgMs === null ? "—" : formatDuration(avgMs)), [avgMs]);
  const medianLabel = useMemo(() => (medianMs === null ? "—" : formatDuration(medianMs)), [medianMs]);
  const color = avgMs === null ? "#999" : avgMs <= 5 * 60_000 ? "#16a34a" : avgMs <= 60 * 60_000 ? "#f59e0b" : "#f4522d";

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
        <div style={{ fontSize: 13, color: "#111", fontWeight: 600 }}>Speed to lead</div>
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
      <div style={{ padding: "4px 20px 16px", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color, letterSpacing: "-0.02em", lineHeight: 1 }}>
          {loading ? "—" : avgLabel}
        </div>
        <div style={{ fontSize: 12, color: "#999" }}>
          {loading
            ? "loading"
            : `avg · median ${medianLabel} · ${leadsCalled} of ${leadsTotal} leads called`}
        </div>
      </div>
    </div>
  );
}
