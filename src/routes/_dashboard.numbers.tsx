import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Check, X, Ban, Plus, Pencil, Trash2, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { APP_TIMEZONE } from "@/lib/timezone";
import {
  getNumbersReport,
  listAdLeads,
  listSpendRows,
  setAppointmentOutcomeFromNumbers,
  upsertManualSpend,
  deleteSpendRow,
  type AdPerformanceRow,
  type LocationSummaryRow,
  type MonthlyPoint,
  type NeedsOutcomeRow,
  type PackEconomicsRow,
  type SpendRow,
  type LabourRow,
  type RevenueRow,
  type MoneyMonthPoint,
} from "@/lib/ad-spend.functions";


export const Route = createFileRoute("/_dashboard/numbers")({
  head: () => ({
    meta: [
      { title: "Numbers — Ad Spend vs Bookings | Hair Transplant Group" },
      {
        name: "description",
        content:
          "Admin reporting: ad spend against leads, bookings and shows, with cost per show by ad and location.",
      },
      { property: "og:title", content: "Numbers — Ad Spend vs Bookings" },
      {
        property: "og:description",
        content: "Cost per lead, cost per booked and cost per show for every ad and location.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NumbersPage,
});

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';
const CARD: React.CSSProperties = {
  background: "#fff",
  border: "0.5px solid #e8e8e6",
  borderRadius: 14,
  padding: 18,
};

type RangeKey = "month" | "30d" | "90d" | "all" | "custom";

function todaySydney(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}
function shift(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveRange(key: RangeKey, cf: string, ct: string): { from: string | null; to: string | null } {
  const today = todaySydney();
  if (key === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (key === "30d") return { from: shift(today, -29), to: today };
  if (key === "90d") return { from: shift(today, -89), to: today };
  if (key === "custom") return { from: cf || null, to: ct || null };
  return { from: null, to: null };
}

const money = (n: number) =>
  `$${n.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;

/** Cost metric: "—" whenever spend is zero or the divisor is zero. */
function cost(spend: number, divisor: number): string {
  if (!spend || !divisor || !Number.isFinite(spend / divisor)) return "—";
  return money(spend / divisor);
}
function pct(num: number, den: number): string {
  if (!den) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
}
function oneInX(num: number, den: number): string {
  if (!num || !den) return "—";
  return `1 in ${(den / num).toFixed(1)}`;
}
const costNum = (spend: number, divisor: number): number | null =>
  !spend || !divisor ? null : spend / divisor;

const th2: React.CSSProperties = { padding: "6px 8px", fontWeight: 500, whiteSpace: "nowrap" };
const th2r: React.CSSProperties = { ...th2, textAlign: "right" };
const td2: React.CSSProperties = { padding: "7px 8px", whiteSpace: "nowrap" };
const td2r: React.CSSProperties = { ...td2, textAlign: "right" };

function NumbersPage() {
  const { session, role, ready: authReady } = useAuth();
  const isAdmin = role === "admin";

  const fetchReport = useServerFn(getNumbersReport);
  const fetchLeads = useServerFn(listAdLeads);
  const fetchSpend = useServerFn(listSpendRows);
  const saveOutcome = useServerFn(setAppointmentOutcomeFromNumbers);
  const saveSpend = useServerFn(upsertManualSpend);
  const removeSpend = useServerFn(deleteSpendRow);

  const [rangeKey, setRangeKey] = useState<RangeKey>("90d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [countMyPay, setCountMyPay] = useState(true);
  const [loading, setLoading] = useState(true);

  const [ads, setAds] = useState<AdPerformanceRow[]>([]);
  const [locations, setLocations] = useState<LocationSummaryRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [labourByLocation, setLabourByLocation] = useState<LabourRow[]>([]);
  const [labourByAd, setLabourByAd] = useState<LabourRow[]>([]);
  const [revenueByLocation, setRevenueByLocation] = useState<RevenueRow[]>([]);
  const [revenueByAd, setRevenueByAd] = useState<RevenueRow[]>([]);
  const [moneyMonthly, setMoneyMonthly] = useState<MoneyMonthPoint[]>([]);
  const [needsOutcome, setNeedsOutcome] = useState<NeedsOutcomeRow[]>([]);
  const [packEconomics, setPackEconomics] = useState<PackEconomicsRow[]>([]);

  const [syncState, setSyncState] = useState<{
    last_synced_at: string | null;
    last_status: string | null;
    last_message: string | null;
  } | null>(null);

  const [showUnresolved, setShowUnresolved] = useState(false);
  const [sortKey, setSortKey] = useState<string>("costPct");
  const [sortAsc, setSortAsc] = useState(true);
  const [drill, setDrill] = useState<{ ad: AdPerformanceRow; rows: unknown[] } | null>(null);
  const [spendPanel, setSpendPanel] = useState(false);
  const [spendRows, setSpendRows] = useState<SpendRow[]>([]);
  const [editing, setEditing] = useState<Partial<SpendRow> | null>(null);

  const range = useMemo(() => resolveRange(rangeKey, customFrom, customTo), [rangeKey, customFrom, customTo]);

  // Pack totals: revenue is recognised on shows delivered, so anything
  // purchased and not yet delivered is work owed.
  const packTotals = useMemo(() => {
    return packEconomics.reduce(
      (a, p) => ({
        purchased: a.purchased + p.shows_purchased,
        delivered: a.delivered + p.shows_delivered,
        owed: a.owed + p.shows_owed,
        valueOwed: a.valueOwed + p.value_owed,
        paid: a.paid + p.amount_paid_ex_gst,
        freeShows: a.freeShows + p.free_shows_delivered,
      }),
      { purchased: 0, delivered: 0, owed: 0, valueOwed: 0, paid: 0, freeShows: 0 },
    );
  }, [packEconomics]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReport({
        data: { from: range.from, to: range.to, location: locFilter || null, excludePeter: !countMyPay },
      });
      setAds(res.ads);
      setLocations(res.locations);
      setMonthly(res.monthly);
      setLabourByLocation(res.labourByLocation);
      setLabourByAd(res.labourByAd);
      setRevenueByLocation(res.revenueByLocation);
      setRevenueByAd(res.revenueByAd);
      setMoneyMonthly(res.moneyMonthly);
      setNeedsOutcome(res.needsOutcome);
      setPackEconomics(res.packEconomics);

      setSyncState(res.syncState);
    } catch (e) {
      toast.error((e as Error).message || "Could not load the numbers");
    } finally {
      setLoading(false);
    }
  }, [fetchReport, range.from, range.to, locFilter, countMyPay]);

  useEffect(() => {
    if (authReady && session && isAdmin) void load();
  }, [authReady, session, isAdmin, load]);

  const loadSpendRows = useCallback(async () => {
    try {
      const rows = await fetchSpend({ data: { from: range.from, to: range.to } });
      setSpendRows(rows);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fetchSpend, range.from, range.to]);

  // ---- Section A: location cards + total
  const visibleLocations = locFilter
    ? locations.filter((l) => l.location?.toLowerCase() === locFilter.toLowerCase())
    : locations;

  const total = visibleLocations.reduce(
    (a, l) => ({
      location: "TOTAL",
      spend: a.spend + l.spend,
      leads: a.leads + l.leads,
      booked: a.booked + l.booked,
      showed: a.showed + l.showed,
      noshow: a.noshow + l.noshow,
      upcoming: a.upcoming + l.upcoming,
      needs_outcome: a.needs_outcome + l.needs_outcome,
      disqualified: a.disqualified + l.disqualified,
    }),
    {
      location: "TOTAL",
      spend: 0,
      leads: 0,
      booked: 0,
      showed: 0,
      noshow: 0,
      upcoming: 0,
      needs_outcome: 0,
      disqualified: 0,
    } as LocationSummaryRow,
  );

  const accountAvgCps = total.showed > 0 && total.spend > 0 ? total.spend / total.showed : null;

  // ---- Labour + revenue lookups (by location and by ad)
  const labLocMap = useMemo(
    () => new Map(labourByLocation.map((l) => [l.key.toLowerCase(), l])),
    [labourByLocation],
  );
  const labAdMap = useMemo(
    () => new Map(labourByAd.map((l) => [l.key.toLowerCase(), l])),
    [labourByAd],
  );
  const revLocMap = useMemo(
    () => new Map(revenueByLocation.map((r) => [r.key.toLowerCase(), r])),
    [revenueByLocation],
  );
  const revAdMap = useMemo(
    () => new Map(revenueByAd.map((r) => [r.key.toLowerCase(), r])),
    [revenueByAd],
  );

  type Money = {
    revenue: number;
    hours: number;
    hourlyCost: number;
    bonusCost: number;
    labourCost: number;
    totalCost: number;
    grossProfit: number;
    hoursOk: boolean;
    hoursMissingRate: number;
    hoursFallback: number;
    bonusMissingRate: number;
    adsPctNum: number | null;
    labourPctNum: number | null;
    totalPctNum: number | null;
    trueCps: number | null;
    bookingsPerHour: number | null;
  };

  const buildMoney = useCallback(
    (
      key: string,
      spend: number,
      shows: number,
      bookings: number,
      labMap: Map<string, LabourRow>,
      revMap: Map<string, RevenueRow>,
      labOverride?: LabourRow | null,
      revOverride?: RevenueRow | null,
    ): Money => {
      const lab = labOverride ?? labMap.get(key.toLowerCase()) ?? null;
      const rev = revOverride ?? revMap.get(key.toLowerCase()) ?? null;
      const revenue = rev?.revenue ?? 0;
      const hours = lab?.hours ?? 0;
      const hourlyCost = lab?.hourly_cost ?? 0;
      const bonusCost = lab?.bonus_cost ?? 0;
      const labourCost = hourlyCost + bonusCost;
      const totalCost = spend + labourCost;
      const hoursOk = hours > 0;
      return {
        revenue,
        hours,
        hourlyCost,
        bonusCost,
        labourCost,
        totalCost,
        grossProfit: revenue - totalCost,
        hoursOk,
        hoursMissingRate: lab?.hours_missing_rate ?? 0,
        hoursFallback: lab?.hours_fallback ?? 0,
        bonusMissingRate: lab?.bonus_missing_rate ?? 0,
        adsPctNum: revenue > 0 ? spend / revenue : null,
        labourPctNum: revenue > 0 && hoursOk ? labourCost / revenue : null,
        totalPctNum: revenue > 0 && hoursOk ? totalCost / revenue : null,
        trueCps: hoursOk && shows > 0 ? totalCost / shows : null,
        bookingsPerHour: hoursOk ? bookings / hours : null,
      };
    },
    [],
  );

  const totalLabour: LabourRow = useMemo(() => {
    const src = locFilter
      ? labourByLocation.filter((l) => l.key.toLowerCase() === locFilter.toLowerCase())
      : labourByLocation;
    return src.reduce<LabourRow>(
      (a, l) => ({
        key: "TOTAL",
        hours: a.hours + l.hours,
        hourly_cost: a.hourly_cost + l.hourly_cost,
        hours_missing_rate: a.hours_missing_rate + l.hours_missing_rate,
        hours_fallback: a.hours_fallback + l.hours_fallback,
        bookings: a.bookings + l.bookings,
        bonus_cost: a.bonus_cost + l.bonus_cost,
        bonus_missing_rate: a.bonus_missing_rate + l.bonus_missing_rate,
      }),
      { key: "TOTAL", hours: 0, hourly_cost: 0, hours_missing_rate: 0, hours_fallback: 0, bookings: 0, bonus_cost: 0, bonus_missing_rate: 0 },
    );
  }, [labourByLocation, locFilter]);

  // Labour that couldn't be tied to any city (calls on leads with no campaign).
  // Included in TOTAL, so surface it as its own line rather than hiding it.
  const unallocatedLabour = useMemo(
    () => labourByLocation.find((l) => l.key.toLowerCase() === "(unallocated)") ?? null,
    [labourByLocation],
  );

  const totalRevenue: RevenueRow = useMemo(() => {

    const src = locFilter
      ? revenueByLocation.filter((r) => r.key.toLowerCase() === locFilter.toLowerCase())
      : revenueByLocation;
    return src.reduce<RevenueRow>(
      (a, r) => ({ key: "TOTAL", shows: a.shows + r.shows, revenue: a.revenue + r.revenue }),
      { key: "TOTAL", shows: 0, revenue: 0 },
    );
  }, [revenueByLocation, locFilter]);

  // ---- Section B: leaderboard rows
  const rows = useMemo(() => {
    const enriched = ads.map((a) => {
      const m = buildMoney(a.ad_name, a.unattributed ? 0 : a.spend, a.showed, a.booked, labAdMap, revAdMap);
      return {
        ...a,
        cpl: costNum(a.spend, a.leads),
        cpb: costNum(a.spend, a.booked),
        cps: costNum(a.spend, a.showed),
        lowData: a.showed < 3,
        bookingRate: a.leads ? a.booked / a.leads : null,
        showRate: a.showed + a.noshow ? a.showed / (a.showed + a.noshow) : null,
        m,
      };
    });
    const val = (r: (typeof enriched)[number]): number | string | null => {
      switch (sortKey) {
        case "ad": return r.ad_name.toLowerCase();
        case "location": return r.location ?? "";
        case "spend": return r.spend;
        case "leads": return r.leads;
        case "booked": return r.booked;
        case "showed": return r.showed;
        case "cpl": return r.cpl;
        case "cpb": return r.cpb;
        case "cps": return r.cps;
        case "repCost": return r.m.hourlyCost || null;
        case "bonus": return r.m.bonusCost || null;
        case "totalCost": return r.m.totalCost || null;
        case "revenue": return r.m.revenue || null;
        case "trueCps": return r.m.trueCps;
        case "bookingRate": return r.bookingRate;
        case "showRate": return r.showRate;
        default: return r.m.totalPctNum;
      }
    };
    return enriched.sort((a, b) => {
      // Unattributed and low-data ads always sink to the bottom.
      if (a.unattributed !== b.unattributed) return a.unattributed ? 1 : -1;
      if (a.lowData !== b.lowData) return a.lowData ? 1 : -1;
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" || typeof bv === "string")
        return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      return sortAsc ? av - bv : bv - av;
    });
  }, [ads, sortKey, sortAsc, buildMoney, labAdMap, revAdMap]);

  // ---- Section C: chart data (ad-only cost per show + total cost as % of revenue)
  const chart = useMemo(() => {
    const locs = Array.from(new Set(monthly.map((m) => m.location))).sort();
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const m of monthly) {
      const key = m.month.slice(0, 7);
      const row = byMonth.get(key) ?? { month: key };
      if (m.spend > 0 && m.showed > 0) row[m.location] = Math.round(m.spend / m.showed);
      byMonth.set(key, row);
    }
    for (const m of moneyMonthly) {
      const key = m.month.slice(0, 7);
      const row = byMonth.get(key) ?? { month: key };
      const totalCost = m.spend + m.labour_cost + m.bonus_cost;
      if (m.revenue > 0 && m.labour_cost > 0)
        row[`${m.location} total %`] = Math.round((totalCost / m.revenue) * 1000) / 10;
      byMonth.set(key, row);
    }
    return {
      locs,
      data: Array.from(byMonth.values()).sort((a, b) => String(a.month).localeCompare(String(b.month))),
    };
  }, [monthly, moneyMonthly]);


  if (authReady && session && !isAdmin) {
    return (
      <div style={{ padding: 32, fontFamily: FONT, color: "#111" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Not available</h1>
        <p style={{ color: "#6b6b6b", fontSize: 14 }}>This page is for admins only.</p>
      </div>
    );
  }

  const COLORS = ["#111111", "#2f6f4f", "#8a5a2b", "#3a5a9a", "#8a2b4a", "#6b6b6b"];

  const markOutcome = async (id: string, outcome: "show" | "noshow" | "disqualified") => {
    try {
      await saveOutcome({ data: { appointmentId: id, outcome } });
      setNeedsOutcome((prev) => prev.filter((n) => n.appointment_id !== id));
      toast.success("Outcome recorded");
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openDrill = async (ad: AdPerformanceRow) => {
    try {
      const rowsOut = await fetchLeads({
        data: {
          adName: ad.ad_name,
          unattributed: ad.unattributed,
          from: range.from,
          to: range.to,
        },
      });
      setDrill({ ad, rows: rowsOut as unknown[] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const th = (key: string, label: string, align: "left" | "right" = "right") => (
    <th
      onClick={() => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else {
          setSortKey(key);
          setSortAsc(key === "cps" || key === "cpl" || key === "cpb" || key === "ad" || key === "location");
        }
      }}
      style={{
        textAlign: align,
        padding: "8px 10px",
        fontSize: 11,
        fontWeight: 600,
        color: sortKey === key ? "#111" : "#6b6b6b",
        cursor: "pointer",
        whiteSpace: "nowrap",
        borderBottom: "0.5px solid #e8e8e6",
      }}
    >
      {label}
      {sortKey === key ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  const td: React.CSSProperties = { padding: "10px", fontSize: 13, textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div style={{ background: "#f7f7f5", minHeight: "100%", fontFamily: FONT, padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#111", margin: 0 }}>Numbers</h1>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: syncState?.last_status === "error" ? "#b03030" : "#6b6b6b" }}>
            Spend last synced:{" "}
            {syncState?.last_synced_at
              ? new Date(syncState.last_synced_at).toLocaleString("en-AU", { timeZone: APP_TIMEZONE })
              : "never"}
            {syncState?.last_status === "error" ? ` — ${syncState.last_message}` : ""}
          </div>
          <button
            onClick={() => void load()}
            style={{ ...CARD, padding: "6px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {/* Range picker */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "#f0f0ee", padding: 4, borderRadius: 10 }}>
            {([
              ["month", "This month"],
              ["30d", "Last 30 days"],
              ["90d", "Last 90 days"],
              ["all", "All time"],
              ["custom", "Custom"],
            ] as [RangeKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRangeKey(k)}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: rangeKey === k ? "#fff" : "transparent",
                  fontWeight: rangeKey === k ? 600 : 400,
                  color: "#111",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {rangeKey === "custom" && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...CARD, padding: "6px 10px", fontSize: 12 }} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...CARD, padding: "6px 10px", fontSize: 12 }} />
            </>
          )}
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            style={{ ...CARD, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
          >
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.location} value={l.location}>{l.location}</option>
            ))}
          </select>

          <label
            style={{
              ...CARD,
              padding: "6px 12px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Untick to see every cost, profit and cost-per-show figure with Peter's hours and booking bonuses removed"
          >
            <input
              type="checkbox"
              checked={countMyPay}
              onChange={(e) => setCountMyPay(e.target.checked)}
              style={{ accentColor: "#111", cursor: "pointer" }}
            />
            Count my pay as a cost
          </label>

          {needsOutcome.length > 0 && (
            <button
              onClick={() => setShowUnresolved((v) => !v)}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: "0.5px solid #e0b060",
                background: "#fdf5e6",
                color: "#8a5a2b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertTriangle className="h-3 w-3" /> Needs outcome ({needsOutcome.length})
            </button>
          )}

          <Link
            to="/rep-hours"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 999,
              border: "0.5px solid #d8d8d5",
              background: "#fff",
              color: "#111",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Clock className="h-3 w-3" /> Rep hours &amp; rates
          </Link>



          <button
            onClick={() => {
              setSpendPanel((v) => !v);
              if (!spendPanel) void loadSpendRows();
            }}
            style={{ ...CARD, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
          >
            {spendPanel ? "Hide spend entries" : "Edit spend by hand"}
          </button>
        </div>

        {/* Needs-outcome panel */}
        {showUnresolved && (
          <div style={CARD}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              Appointments with no outcome recorded
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {needsOutcome.map((n) => (
                <div
                  key={n.appointment_id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#faf9f7", borderRadius: 10, flexWrap: "wrap" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, minWidth: 160 }}>{n.patient_name}</div>
                  <div style={{ fontSize: 12, color: "#6b6b6b", minWidth: 120 }}>
                    {n.appointment_date ?? "—"} {n.appointment_time ?? ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b6b6b", flex: 1 }}>{n.clinic_name ?? "—"}</div>
                  <button onClick={() => void markOutcome(n.appointment_id, "show")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #bcd8c4", background: "#eef7f0", color: "#2f6f4f", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check className="h-3 w-3" /> Show
                  </button>
                  <button onClick={() => void markOutcome(n.appointment_id, "noshow")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #e6c0c0", background: "#fdeeee", color: "#b03030", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <X className="h-3 w-3" /> No-show
                  </button>
                  <button onClick={() => void markOutcome(n.appointment_id, "disqualified")} style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#f4f4f2", color: "#6b6b6b", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Ban className="h-3 w-3" /> Disqualified
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual spend panel */}
        {spendPanel && (
          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Spend entries in this range</div>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setEditing({ date: todaySydney(), ad_name: "", spend_aud: 0 })}
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <Plus className="h-3 w-3" /> Add row
              </button>
            </div>

            {editing && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: 10, background: "#faf9f7", borderRadius: 10, marginBottom: 10 }}>
                <input type="date" value={editing.date ?? ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12 }} />
                <input placeholder="Ad name" value={editing.ad_name ?? ""} onChange={(e) => setEditing({ ...editing, ad_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 200 }} />
                <input placeholder="Ad set (optional)" value={editing.adset_name ?? ""} onChange={(e) => setEditing({ ...editing, adset_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12 }} />
                <input placeholder="Campaign e.g. Hair Transplant Perth" value={editing.campaign_name ?? ""} onChange={(e) => setEditing({ ...editing, campaign_name: e.target.value })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, minWidth: 240 }} />
                <input type="number" placeholder="Spend AUD" value={editing.spend_aud ?? 0} onChange={(e) => setEditing({ ...editing, spend_aud: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 120 }} />
                <input type="number" placeholder="Impressions" value={editing.impressions ?? 0} onChange={(e) => setEditing({ ...editing, impressions: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 120 }} />
                <input type="number" placeholder="Clicks" value={editing.clicks ?? 0} onChange={(e) => setEditing({ ...editing, clicks: Number(e.target.value) })} style={{ ...CARD, padding: "6px 8px", fontSize: 12, width: 100 }} />
                <button
                  onClick={async () => {
                    if (!editing.date || !editing.ad_name) {
                      toast.error("Date and ad name are required");
                      return;
                    }
                    try {
                      await saveSpend({
                        data: {
                          id: editing.id,
                          date: editing.date,
                          ad_name: editing.ad_name,
                          adset_name: editing.adset_name ?? null,
                          campaign_name: editing.campaign_name ?? null,
                          spend_aud: Number(editing.spend_aud ?? 0),
                          impressions: Number(editing.impressions ?? 0),
                          clicks: Number(editing.clicks ?? 0),
                        },
                      });
                      toast.success("Saved");
                      setEditing(null);
                      await loadSpendRows();
                      void load();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#111", color: "#fff", cursor: "pointer" }}
                >
                  Save
                </button>
                <button onClick={() => setEditing(null)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #e8e8e6", background: "#fff", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            )}

            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Date", "Ad", "Campaign", "Spend", "Impr.", "Clicks", "Source", ""].map((h) => (
                      <th key={h} style={{ textAlign: "left", fontSize: 11, color: "#6b6b6b", padding: "6px 8px", borderBottom: "0.5px solid #e8e8e6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spendRows.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.date}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.ad_name}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", color: "#6b6b6b" }}>{r.campaign_name ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{money(r.spend_aud)}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.impressions}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{r.clicks}</td>
                      <td style={{ fontSize: 11, padding: "6px 8px", color: "#6b6b6b" }}>{r.source}</td>
                      <td style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                        <button onClick={() => setEditing(r)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b6b6b" }}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await removeSpend({ data: { id: r.id } });
                              await loadSpendRows();
                              void load();
                            } catch (e) {
                              toast.error((e as Error).message);
                            }
                          }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#b03030" }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {spendRows.length === 0 && (
                    <tr><td colSpan={8} style={{ fontSize: 12, color: "#6b6b6b", padding: 12 }}>No spend rows in this range yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION A2 — clinic packs: purchased vs delivered vs owed */}
        <div style={{ ...CARD, marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Clinic packs — delivered vs owed</div>
            <div style={{ fontSize: 12, color: "#6b6b6b" }}>
              {packTotals.owed} show{packTotals.owed === 1 ? "" : "s"} still owed
              {packTotals.valueOwed > 0 ? ` · ${money(packTotals.valueOwed)} of work paid for and not yet delivered` : ""}
            </div>
          </div>
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#6b6b6b" }}>
                  <th style={th2}>Clinic</th>
                  <th style={th2r}>Purchased</th>
                  <th style={th2r}>Delivered</th>
                  <th style={th2r}>Still owed</th>
                  <th style={th2r}>Value owed</th>
                  <th style={th2r}>Paid</th>
                  <th style={th2r}>Rate / show</th>
                  <th style={th2r}>Free shows</th>
                </tr>
              </thead>
              <tbody>
                {packEconomics.map((p) => (
                  <tr key={p.clinic_id} style={{ borderTop: "0.5px solid #f0f0ee" }}>
                    <td style={td2}>
                      {p.clinic_name}
                      {p.city ? <span style={{ color: "#9a9a97" }}> · {p.city}</span> : null}
                      {p.over_delivered > 0 && (
                        <span style={{ color: "#b03030", marginLeft: 6 }}>
                          over by {p.over_delivered}
                        </span>
                      )}
                      {p.packs_missing_amount > 0 && (
                        <span style={{ color: "#8a5a2b", marginLeft: 6 }}>
                          {p.packs_missing_amount} pack{p.packs_missing_amount === 1 ? "" : "s"} missing $
                        </span>
                      )}
                    </td>
                    <td style={td2r}>{p.shows_purchased || "—"}</td>
                    <td style={td2r}>{p.shows_delivered || "—"}</td>
                    <td style={{ ...td2r, fontWeight: p.shows_owed > 0 ? 600 : 400, color: p.shows_owed > 0 ? "#8a5a2b" : "#6b6b6b" }}>
                      {p.shows_owed || "—"}
                    </td>
                    <td style={td2r}>{p.value_owed > 0 ? money(p.value_owed) : "—"}</td>
                    <td style={td2r}>{p.amount_paid_ex_gst > 0 ? money(p.amount_paid_ex_gst) : "—"}</td>
                    <td style={td2r}>
                      {p.effective_rate ? money(p.effective_rate) : "—"}
                      {p.effective_rate ? <span style={{ color: "#9a9a97" }}> vs {money(p.list_rate)}</span> : null}
                    </td>
                    <td style={td2r}>{p.free_shows_delivered || "—"}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "0.5px solid #111", fontWeight: 600 }}>
                  <td style={td2}>TOTAL</td>
                  <td style={td2r}>{packTotals.purchased}</td>
                  <td style={td2r}>{packTotals.delivered}</td>
                  <td style={{ ...td2r, color: packTotals.owed > 0 ? "#8a5a2b" : "#6b6b6b" }}>{packTotals.owed}</td>
                  <td style={td2r}>{packTotals.valueOwed > 0 ? money(packTotals.valueOwed) : "—"}</td>
                  <td style={td2r}>{packTotals.paid > 0 ? money(packTotals.paid) : "—"}</td>
                  <td style={td2r}>—</td>
                  <td style={td2r}>{packTotals.freeShows || "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#9a9a97", marginTop: 10 }}>
            Revenue is recognised on shows delivered, at each clinic's real rate per show (money paid ÷ shows delivered, free shows included in the count). Shows still owed are paid work not yet done.
          </div>
        </div>

        {/* SECTION A */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {[...visibleLocations].sort((a, b) => a.location.localeCompare(b.location)).concat(visibleLocations.length > 1 ? [total] : []).map((l, i) => {
            const isTotal = l.location === "TOTAL" && i === visibleLocations.length;
            const unresolvedShare = l.booked ? l.needs_outcome / l.booked : 0;
            const m = isTotal
              ? buildMoney("TOTAL", l.spend, l.showed, l.booked, labLocMap, revLocMap, totalLabour, totalRevenue)
              : buildMoney(l.location, l.spend, l.showed, l.booked, labLocMap, revLocMap);
            const tp = m.totalPctNum;
            const tpColor = tp === null ? "#6b6b6b" : tp < 0.25 ? "#2f6f4f" : tp <= 0.4 ? "#8a5a2b" : "#b03030";
            return (
              <div key={`${l.location}-${i}`} style={{ ...CARD, borderColor: isTotal ? "#111" : "#e8e8e6" }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{l.location}</div>
                <div style={{ fontSize: 11, color: "#6b6b6b" }}>True cost per show</div>
                <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1 }}>
                  {m.trueCps === null ? "—" : money(m.trueCps)}
                </div>
                <div style={{ fontSize: 11, color: "#9a9a97", marginTop: 2 }}>
                  Ads only: {cost(l.spend, l.showed)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12, fontSize: 12 }}>
                  <div style={{ color: "#6b6b6b" }}>Leads</div><div style={{ textAlign: "right" }}>{l.leads}</div>
                  <div style={{ color: "#6b6b6b" }}>Booked</div><div style={{ textAlign: "right" }}>{l.booked}</div>
                  <div style={{ color: "#6b6b6b" }}>Showed</div><div style={{ textAlign: "right" }}>{l.showed}</div>
                  <div style={{ color: "#6b6b6b" }}>No-showed</div><div style={{ textAlign: "right" }}>{l.noshow}</div>
                  <div style={{ color: "#6b6b6b" }}>Upcoming</div><div style={{ textAlign: "right" }}>{l.upcoming}</div>
                  <div style={{ color: "#8a5a2b" }}>Needs outcome</div><div style={{ textAlign: "right", color: "#8a5a2b" }}>{l.needs_outcome}</div>
                  <div style={{ color: "#6b6b6b" }}>Disqualified</div><div style={{ textAlign: "right" }}>{l.disqualified}</div>
                  <div style={{ color: "#6b6b6b" }}>Cost per lead</div><div style={{ textAlign: "right" }}>{cost(l.spend, l.leads)}</div>
                  <div style={{ color: "#6b6b6b" }}>Cost per booked</div><div style={{ textAlign: "right" }}>{cost(l.spend, l.booked)}</div>
                </div>

                {/* Money block */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "0.5px solid #f0f0ee", display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 10px", fontSize: 12, alignItems: "baseline" }}>
                  <div style={{ color: "#6b6b6b" }}>Revenue</div>
                  <div style={{ textAlign: "right", fontWeight: 600 }}>{m.revenue ? money(m.revenue) : "—"}</div>
                  <div style={{ textAlign: "right", color: "#9a9a97", fontSize: 11 }}>{l.showed} × show</div>

                  <div style={{ color: "#6b6b6b" }}>Ad spend</div>
                  <div style={{ textAlign: "right" }}>{l.spend ? money(l.spend) : "—"}</div>
                  <div style={{ textAlign: "right", color: "#6b6b6b", fontSize: 11 }}>
                    {m.adsPctNum === null ? "—" : `${(m.adsPctNum * 100).toFixed(1)}%`}
                  </div>

                  <div style={{ color: "#6b6b6b" }}>Rep cost (hourly)</div>
                  <div style={{ textAlign: "right" }}>{m.hoursOk ? money(m.hourlyCost) : "—"}</div>
                  <div style={{ textAlign: "right", color: "#6b6b6b", fontSize: 11 }}>
                    {m.hoursOk && m.revenue > 0 ? `${((m.hourlyCost / m.revenue) * 100).toFixed(1)}%` : "—"}
                  </div>

                  <div style={{ color: "#6b6b6b" }}>Booking bonuses</div>
                  <div style={{ textAlign: "right" }}>{money(m.bonusCost)}</div>
                  <div style={{ textAlign: "right", color: "#6b6b6b", fontSize: 11 }}>
                    {m.revenue > 0 ? `${((m.bonusCost / m.revenue) * 100).toFixed(1)}%` : "—"}
                  </div>

                  <div style={{ color: "#6b6b6b" }}>Labour (both)</div>
                  <div style={{ textAlign: "right" }}>{m.hoursOk ? money(m.labourCost) : "—"}</div>
                  <div style={{ textAlign: "right", color: "#6b6b6b", fontSize: 11 }}>
                    {m.labourPctNum === null ? "—" : `${(m.labourPctNum * 100).toFixed(1)}%`}
                  </div>

                  {isTotal && unallocatedLabour && !locFilter && (unallocatedLabour.hours > 0 || unallocatedLabour.hourly_cost > 0) && (
                    <>
                      <div style={{ color: "#8a5a2b" }}>
                        …of which (unallocated)
                        <div style={{ fontSize: 10.5, color: "#9a9a97" }}>
                          {unallocatedLabour.hours.toFixed(1)} h on leads with no campaign
                        </div>
                      </div>
                      <div style={{ textAlign: "right", color: "#8a5a2b" }}>
                        {money(unallocatedLabour.hourly_cost + unallocatedLabour.bonus_cost)}
                      </div>
                      <div style={{ textAlign: "right", color: "#8a5a2b", fontSize: 11 }}>
                        {m.revenue > 0
                          ? `${(((unallocatedLabour.hourly_cost + unallocatedLabour.bonus_cost) / m.revenue) * 100).toFixed(1)}%`
                          : "—"}
                      </div>
                    </>
                  )}

                  {isTotal && packTotals.owed > 0 && (
                    <>
                      <div style={{ color: "#8a5a2b" }}>
                        Shows still owed
                        <div style={{ fontSize: 10.5, color: "#9a9a97" }}>
                          {packTotals.delivered} of {packTotals.purchased} purchased delivered
                        </div>
                      </div>
                      <div style={{ textAlign: "right", color: "#8a5a2b" }}>{packTotals.owed}</div>
                      <div style={{ textAlign: "right", color: "#8a5a2b", fontSize: 11 }}>
                        {packTotals.valueOwed > 0 ? money(packTotals.valueOwed) : "—"}
                      </div>
                    </>
                  )}

                  <div style={{ gridColumn: "1 / -1", borderTop: "0.5px solid #e8e8e6", marginTop: 2 }} />

                  <div style={{ fontWeight: 600 }}>TOTAL COST</div>
                  <div style={{ textAlign: "right", fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
                    {m.hoursOk ? money(m.totalCost) : "—"}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 15, fontWeight: 700, color: tpColor }}>
                    {tp === null ? "—" : `${(tp * 100).toFixed(1)}%`}
                  </div>


                  <div style={{ color: "#6b6b6b" }}>Gross profit</div>
                  <div style={{ textAlign: "right", fontWeight: 600, color: m.grossProfit >= 0 ? "#2f6f4f" : "#b03030" }}>
                    {m.hoursOk ? money(m.grossProfit) : "—"}
                  </div>
                  <div />
                </div>
                <div style={{ fontSize: 10.5, color: "#9a9a97", marginTop: 6 }}>
                  includes owner time at replacement rate
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid #f0f0ee", fontSize: 12 }}>
                  <div>
                    Booking rate <strong>{pct(l.booked, l.leads)}</strong>{" "}
                    <span style={{ color: "#6b6b6b" }}>({oneInX(l.booked, l.leads)} leads books)</span>
                  </div>
                  <div>
                    Show rate <strong>{pct(l.showed, l.showed + l.noshow)}</strong>{" "}
                    <span style={{ color: "#6b6b6b" }}>({l.showed} of {l.showed + l.noshow})</span>
                  </div>
                  <div>
                    Rep hours <strong>{m.hoursOk ? m.hours.toFixed(1) : "—"}</strong>{" "}
                    <span style={{ color: "#6b6b6b" }}>
                      ({m.bookingsPerHour === null ? "—" : m.bookingsPerHour.toFixed(2)} bookings per hour)
                    </span>
                  </div>
                </div>

                {!m.hoursOk && (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#b03030", background: "#fdeeee", padding: "6px 8px", borderRadius: 8 }}>
                    Hours could not be calculated — labour and total cost are not shown.
                  </div>
                )}
                {m.hoursMissingRate > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#8a5a2b", background: "#fdf5e6", padding: "6px 8px", borderRadius: 8 }}>
                    {m.hoursMissingRate.toFixed(1)} hours from a rep with no rate set — labour is understated.
                  </div>
                )}
                {m.hoursFallback > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#8a5a2b", background: "#fdf5e6", padding: "6px 8px", borderRadius: 8 }}>
                    {m.hoursFallback.toFixed(1)} hours split by leads contacted, not call time.
                  </div>
                )}
                {m.bonusMissingRate > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#8a5a2b", background: "#fdf5e6", padding: "6px 8px", borderRadius: 8 }}>
                    {m.bonusMissingRate} bookings with no bonus rate set.
                  </div>
                )}
                {unresolvedShare > 0.1 && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#8a5a2b", background: "#fdf5e6", padding: "6px 8px", borderRadius: 8 }}>
                    {l.needs_outcome} appointments unresolved — cost per show may be understated.
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* SECTION B */}
        <div style={{ ...CARD, padding: 0, overflowX: "auto" }}>
          <div style={{ padding: "16px 18px 6px", fontSize: 15, fontWeight: 600 }}>Ad leaderboard</div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1600 }}>
            <thead>
              <tr>
                {th("ad", "Ad name", "left")}
                {th("location", "Location", "left")}
                {th("spend", "Spend")}
                {th("leads", "Leads")}
                {th("booked", "Booked")}
                {th("showed", "Showed")}
                {th("cpl", "Cost/lead")}
                {th("cpb", "Cost/booked")}
                {th("cps", "Cost/show (ads)")}
                {th("repCost", "Rep cost")}
                {th("bonus", "Booking bonuses")}
                {th("totalCost", "Total cost")}
                {th("revenue", "Revenue")}
                {th("costPct", "COST % OF REVENUE")}
                {th("trueCps", "True cost/show")}
                {th("bookingRate", "Booking rate")}
                {th("showRate", "Show rate")}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dim = r.lowData || r.unattributed;
                const cpsColor =
                  r.cps === null || accountAvgCps === null || dim
                    ? "#111"
                    : r.cps <= accountAvgCps
                      ? "#2f6f4f"
                      : "#b03030";
                const tp = r.m.totalPctNum;
                const tpColor = dim || tp === null ? "#111" : tp < 0.25 ? "#2f6f4f" : tp <= 0.4 ? "#8a5a2b" : "#b03030";
                return (
                  <tr
                    key={`${r.ad_name}-${r.unattributed}`}
                    onClick={() => void openDrill(r)}
                    style={{ borderBottom: "0.5px solid #f0f0ee", cursor: "pointer", opacity: dim ? 0.55 : 1 }}
                  >
                    <td style={{ ...td, textAlign: "left", maxWidth: 320, whiteSpace: "normal" }}>
                      {r.ad_name}
                      {r.name_collision && (
                        <span title="possible renamed or reused ad name" style={{ marginLeft: 6, color: "#8a5a2b" }}>
                          <AlertTriangle className="inline h-3 w-3" />
                        </span>
                      )}
                      {r.unattributed && (
                        <div style={{ fontSize: 11, color: "#6b6b6b" }}>no ad name on the lead — no spend attached</div>
                      )}
                      {r.lowData && !r.unattributed && (
                        <div style={{ fontSize: 11, color: "#6b6b6b" }}>fewer than 3 shows — not enough data yet</div>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "left" }}>{r.location ?? "—"}</td>
                    <td style={td}>{r.unattributed ? "—" : r.spend ? money(r.spend) : "—"}</td>
                    <td style={td}>{r.leads}</td>
                    <td style={td}>{r.booked}</td>
                    <td style={td}>{r.showed}</td>
                    <td style={td}>{r.unattributed ? "—" : cost(r.spend, r.leads)}</td>
                    <td style={td}>{r.unattributed ? "—" : cost(r.spend, r.booked)}</td>
                    <td style={{ ...td, color: cpsColor }}>
                      {r.unattributed ? "—" : cost(r.spend, r.showed)}
                    </td>
                    <td style={td}>{r.m.hoursOk ? money(r.m.hourlyCost) : "—"}</td>
                    <td style={td}>{r.m.bonusCost ? money(r.m.bonusCost) : "—"}</td>
                    <td style={td}>{r.m.hoursOk ? money(r.m.totalCost) : "—"}</td>
                    <td style={td}>{r.m.revenue ? money(r.m.revenue) : "—"}</td>
                    <td style={{ ...td, fontWeight: 700, fontSize: 14, color: tpColor }}>
                      {tp === null ? "—" : `${(tp * 100).toFixed(1)}%`}
                    </td>
                    <td style={td}>{r.m.trueCps === null ? "—" : money(r.m.trueCps)}</td>
                    <td style={td}>{pct(r.booked, r.leads)}</td>
                    <td style={td}>{pct(r.showed, r.showed + r.noshow)}</td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={17} style={{ padding: 16, fontSize: 13, color: "#6b6b6b" }}>Nothing in this range yet.</td></tr>
              )}
            </tbody>
          </table>
          {accountAvgCps !== null && (
            <div style={{ padding: "10px 18px 16px", fontSize: 11, color: "#6b6b6b" }}>
              Account average cost per show: {money(accountAvgCps)}. Cost as a share of revenue: green under 25%, amber to 40%, red above.
            </div>
          )}
        </div>

        {/* SECTION C */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Cost per show by month</div>
          {chart.data.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b6b6b" }}>No spend and show data to chart yet.</div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="cost" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <ReTooltip
                    formatter={(v: number, name: string) =>
                      String(name).endsWith("total %") ? `${Number(v).toFixed(1)}%` : money(Number(v))
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {chart.locs.map((loc, i) => (
                    <Line key={loc} yAxisId="cost" type="monotone" dataKey={loc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot connectNulls />
                  ))}
                  {chart.locs.map((loc, i) => (
                    <Line
                      key={`${loc}-pct`}
                      yAxisId="pct"
                      type="monotone"
                      dataKey={`${loc} total %`}
                      stroke={COLORS[i % COLORS.length]}
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 8 }}>
            Solid lines: ad cost per show. Dashed lines: total cost (ads + rep pay + bonuses) as a share of revenue.
          </div>
        </div>

      </div>

      {/* Drilldown */}
      {drill && (
        <div
          onClick={() => setDrill(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...CARD, maxWidth: 900, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{drill.ad.ad_name}</div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setDrill(null)} style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Lead", "Enquired", "Location", "Appointment", "What happened"].map((h) => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, color: "#6b6b6b", padding: "6px 8px", borderBottom: "0.5px solid #e8e8e6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(drill.rows as Record<string, unknown>[]).map((r) => {
                  const what = r.is_showed
                    ? "Showed"
                    : r.is_noshow
                      ? "No-showed"
                      : r.is_upcoming
                        ? "Upcoming"
                        : r.needs_outcome
                          ? "Needs outcome"
                          : r.is_disqualified
                            ? "Disqualified"
                            : r.is_booked
                              ? "Booked"
                              : "Not booked";
                  return (
                    <tr key={String(r.lead_id)} style={{ borderBottom: "0.5px solid #f0f0ee" }}>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", color: "#6b6b6b" }}>
                        {r.created_at ? new Date(String(r.created_at)).toLocaleDateString("en-AU", { timeZone: APP_TIMEZONE }) : "—"}
                      </td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{(r.location as string) ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px" }}>{(r.appointment_date as string) ?? "—"}</td>
                      <td style={{ fontSize: 12, padding: "6px 8px", fontWeight: 600 }}>{what}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
