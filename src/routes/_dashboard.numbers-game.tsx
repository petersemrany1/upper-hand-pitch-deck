import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNumbersReport } from "@/lib/ad-spend.functions";
import type { AdPerformanceRow, LabourRow, LocationSummaryRow, RevenueRow } from "@/lib/ad-spend.functions";
import { getNumbersGameLive, type NumbersGameLive } from "@/lib/numbers-game.functions";
import { shiftDays, todaySydney } from "@/components/numbers/format";
import { buildTown, type Flag, type Tone, type Town } from "@/components/numbers-game/model";
import { TownScene, type LabelSpec, type PickTarget } from "@/components/numbers-game/scene";

export const Route = createFileRoute("/_dashboard/numbers-game")({
  head: () => ({
    meta: [
      { title: "Numbers Game | Hair Transplant Group" },
      { name: "description", content: "The business as a plumbing town: ads are water towers, advisors drive the vans, clinics fill their tanks." },
    ],
  }),
  component: NumbersGamePage,
});

const TONE_CSS: Record<Tone, { fg: string; bg: string; line: string }> = {
  red: { fg: "#c9362a", bg: "#fdecea", line: "#ef4b3d" },
  amber: { fg: "#a86500", bg: "#fff3dc", line: "#f5a623" },
  green: { fg: "#1a7a45", bg: "#e6f7ec", line: "#2fc46e" },
  grey: { fg: "#5b6874", bg: "#f2f4f6", line: "#c5ccd3" },
};

type RangeKey = "today" | "7d" | "30d" | "month" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" }, { key: "7d", label: "7 days" }, { key: "30d", label: "30 days" }, { key: "month", label: "This month" }, { key: "all", label: "All time" },
];
function rangeDates(key: RangeKey): { from: string | null; to: string | null } {
  const today = todaySydney();
  if (key === "today") return { from: today, to: today };
  if (key === "7d") return { from: shiftDays(today, -6), to: today };
  if (key === "30d") return { from: shiftDays(today, -29), to: today };
  if (key === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  return { from: null, to: null };
}

const CSS = `
.ng-root{position:relative;height:calc(100vh - 32px);min-height:560px;border-radius:16px;overflow:hidden;background:#c8ecff;font-family:-apple-system,"Inter",Helvetica,Arial,sans-serif;color:#1b2430}
.ng-canvas{position:absolute;inset:0}
.ng-hud{position:absolute;left:0;top:0;right:0;display:flex;align-items:center;gap:10px;padding:12px 16px;pointer-events:none;flex-wrap:wrap}
.ng-hud>*{pointer-events:auto}
.ng-title{font-size:17px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;margin-right:8px}
.ng-title span{color:#2f7cf6}
.ng-chip{background:rgba(255,255,255,.94);border:1px solid #dfe3e8;border-radius:999px;padding:6px 12px;font-size:12.5px;display:flex;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ng-chip b{font-size:14px}
.ng-seg{display:flex;background:rgba(255,255,255,.94);border:1px solid #dfe3e8;border-radius:999px;padding:3px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ng-seg button{border:0;background:transparent;border-radius:999px;padding:4px 10px;font-size:12px;color:#5b6874;cursor:pointer}
.ng-seg button[aria-pressed="true"]{background:#1b2430;color:#fff;font-weight:600}
.ng-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.ng-spacer{flex:1}
.ng-time{font-size:12px;color:#3d4b5a;background:rgba(255,255,255,.7);padding:5px 10px;border-radius:999px}
.ng-tag{position:absolute;transform:translate(-50%,-100%);background:rgba(255,255,255,.9);border:1.5px solid #dfe3e8;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ng-lbl{position:absolute;z-index:2;transform:translate(-50%,-100%);background:rgba(255,255,255,.97);border:1.5px solid #dfe3e8;border-radius:9px;padding:5px 10px;font-size:11.5px;line-height:1.3;box-shadow:0 2px 8px rgba(0,0,0,.12);pointer-events:none;max-width:230px;text-align:center}
.ng-lbl b{display:block;font-size:12px;white-space:nowrap}
.ng-flags{position:absolute;right:16px;bottom:16px;width:300px;max-height:62%;overflow:auto;background:rgba(255,255,255,.95);border:1px solid #dfe3e8;border-radius:12px;padding:10px 12px;box-shadow:0 4px 16px rgba(0,0,0,.1)}
.ng-flags h3{margin:0 0 6px;font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#8a96a3}
.ng-flag{font-size:12.5px;padding:7px 4px;border-top:1px solid #eef0f3;display:flex;gap:8px;align-items:flex-start;cursor:pointer;border-radius:6px}
.ng-flag:hover{background:#f6f8fa}
.ng-flag .ng-dot{margin-top:5px;flex-shrink:0}
.ng-flag small{color:#6b7785;display:block}
.ng-drawer{position:absolute;left:16px;top:64px;width:320px;background:#fff;border:1px solid #dfe3e8;border-radius:14px;padding:14px 16px;box-shadow:0 8px 28px rgba(0,0,0,.14)}
.ng-drawer h2{margin:0 0 2px;font-size:16px}
.ng-drawer .sub{font-size:12px;color:#6b7785;margin-bottom:10px}
.ng-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid #f1f3f5;gap:12px}
.ng-row b{font-variant-numeric:tabular-nums;text-align:right}
.ng-close{position:absolute;right:10px;top:10px;border:0;background:#f1f3f5;border-radius:999px;width:26px;height:26px;cursor:pointer;font-size:14px}
.ng-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#3d4b5a;background:rgba(200,236,255,.6)}
.ng-list{font-size:12.5px;color:#1b2430;margin:6px 0 0;padding-left:16px}
`;

type Report = { ads: AdPerformanceRow[]; locations: LocationSummaryRow[]; labourByLocation: LabourRow[]; revenueByLocation: RevenueRow[] };

function sydneyHour(): number {
  return Number(new Date().toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: "Australia/Sydney" }));
}

function NumbersGamePage() {
  const { role, ready } = useAuth();
  const isAdmin = role === "admin";
  const fetchReport = useServerFn(getNumbersReport);
  const fetchLive = useServerFn(getNumbersGameLive);

  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [report, setReport] = useState<Report | null>(null);
  const [fortnights, setFortnights] = useState<{ recent: AdPerformanceRow[]; prior: AdPerformanceRow[] } | null>(null);
  const [live, setLive] = useState<NumbersGameLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<LabelSpec[]>([]);
  const [picked, setPicked] = useState<PickTarget | null>(null);
  const [hour, setHour] = useState(sydneyHour());

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TownScene | null>(null);
  const seenBookingsRef = useRef<Set<string> | null>(null);

  // The ad and money picture for the chosen range.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetchReport({ data: rangeDates(rangeKey) });
        if (!alive) return;
        setReport({ ads: r.ads, locations: r.locations, labourByLocation: r.labourByLocation, revenueByLocation: r.revenueByLocation });
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { alive = false; };
  }, [ready, isAdmin, fetchReport, rangeKey]);

  // Two fortnights for ad fatigue, whatever range is showing.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const today = todaySydney();
        const [recent, prior] = await Promise.all([
          fetchReport({ data: { from: shiftDays(today, -13), to: today } }),
          fetchReport({ data: { from: shiftDays(today, -27), to: shiftDays(today, -14) } }),
        ]);
        if (alive) setFortnights({ recent: recent.ads, prior: prior.ads });
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { alive = false; };
  }, [ready, isAdmin, fetchReport]);

  // The live layer, every minute.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    const load = async () => {
      try {
        const l = await fetchLive({});
        if (!alive) return;
        setLive(l);
        setHour(sydneyHour());
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [ready, isAdmin, fetchLive]);

  const town: Town | null = useMemo(() => {
    if (!report || !live || !fortnights) return null;
    return buildTown({
      ads: report.ads, adsRecent: fortnights.recent, adsPrior: fortnights.prior,
      locations: report.locations, labourByLocation: report.labourByLocation, revenueByLocation: report.revenueByLocation,
      live, rangeLabel: RANGES.find((r) => r.key === rangeKey)?.label ?? "", hour,
    });
  }, [report, live, fortnights, rangeKey, hour]);

  const onPick = useCallback((t: PickTarget | null) => { setPicked(t); sceneRef.current?.focus(t); }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const scene = new TownScene(el, { onPick, onLabels: setLabels });
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  }, [onPick]);

  // Rebuild the town when the numbers change. New bookings since last look send a van out.
  useEffect(() => {
    if (!town || !sceneRef.current || !live) return;
    sceneRef.current.setTown(town);
    const ids = new Set(live.bookingsToday.map((b) => b.leadId));
    const seen = seenBookingsRef.current;
    if (seen) {
      const fresh = live.bookingsToday.filter((b) => !seen.has(b.leadId));
      fresh.forEach((b, i) => window.setTimeout(() => sceneRef.current?.deliverBooking(b.repId, b.clinicId), 800 + i * 9000));
    }
    seenBookingsRef.current = ids;
  }, [town, live]);

  const jumpTo = (f: Flag) => onPick(f.target);

  if (!ready) return null;
  if (!isAdmin) return <div style={{ padding: 24, fontSize: 14 }}>Admins only.</div>;

  const clock = new Date().toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });

  return (
    <div className="ng-root">
      <style>{CSS}</style>
      <div ref={canvasRef} className="ng-canvas" />

      {labels.filter((l) => !l.hidden).map((l) => {
        const c = TONE_CSS[l.tone];
        if (!l.active) {
          return <div key={l.key} className="ng-tag" style={{ left: l.x, top: l.y, borderColor: l.tone === "grey" ? "#dfe3e8" : c.line, color: l.tone === "grey" ? "#5b6874" : c.fg }}>{l.short}</div>;
        }
        return (
          <div key={l.key} className="ng-lbl" style={{ left: l.x, top: l.y, borderColor: c.line }}>
            <b style={{ color: c.fg }}>{l.title}</b>
            {l.sub}
          </div>
        );
      })}

      <div className="ng-hud">
        <div className="ng-title">Numbers <span>Game</span></div>
        <div className="ng-seg">
          {RANGES.map((r) => <button key={r.key} aria-pressed={rangeKey === r.key} onClick={() => setRangeKey(r.key)}>{r.label}</button>)}
        </div>
        {town && (
          <>
            <div className="ng-chip"><span className="ng-dot" style={{ background: TONE_CSS.red.line }} /><b style={{ color: TONE_CSS.red.fg }}>{town.flags.filter((f) => f.tone === "red").length}</b> on fire</div>
            <div className="ng-chip"><span className="ng-dot" style={{ background: "#ffc83d" }} /><b style={{ color: "#8a6500" }}>{town.good.length}</b> gold stars</div>
            <div className="ng-chip">Today <b>{town.todayBooked}</b> booked · <b>{town.todayShowed}</b> showed</div>
            <div className="ng-chip">{town.rangeLabel} <b style={{ color: town.profit >= 0 ? TONE_CSS.green.fg : TONE_CSS.red.fg }}>{town.profit >= 0 ? "+" : "−"}${Math.round(Math.abs(town.profit)).toLocaleString()}</b></div>
          </>
        )}
        <div className="ng-spacer" />
        <div className="ng-time">{clock} · {town?.depotOpen ? "depot open" : "depot closed"}</div>
      </div>

      {town && (
        <div className="ng-flags">
          <h3>On fire</h3>
          {town.flags.length === 0 && <div style={{ fontSize: 12.5, color: "#6b7785", padding: "6px 4px" }}>Nothing's burning.</div>}
          {town.flags.map((f, i) => (
            <div key={i} className="ng-flag" onClick={() => jumpTo(f)}>
              <span className="ng-dot" style={{ background: TONE_CSS[f.tone].line }} />
              <span><b>{f.title}.</b> <small>{f.detail}</small></span>
            </div>
          ))}
          {town.good.length > 0 && <h3 style={{ marginTop: 10 }}>Gold stars</h3>}
          {town.good.map((f, i) => (
            <div key={i} className="ng-flag" onClick={() => jumpTo(f)}>
              <span className="ng-dot" style={{ background: "#ffc83d" }} />
              <span><b>{f.title}.</b> <small>{f.detail}</small></span>
            </div>
          ))}
        </div>
      )}

      {picked && town && <Drawer town={town} target={picked} onClose={() => onPick(null)} />}

      {!town && !error && <div className="ng-loading">Filling the pipes…</div>}
      {error && <div className="ng-loading">Couldn't load the town: {error}</div>}
    </div>
  );
}

function Drawer({ town, target, onClose }: { town: Town; target: PickTarget; onClose: () => void }) {
  const $ = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString()}`);
  const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
  const trend = (r: number | null) => (r === null ? "not enough leads to say" : r >= 1 ? `up ${Math.round((r - 1) * 100)}%` : `down ${Math.round((1 - r) * 100)}%`);
  const Row = ({ k, v }: { k: string; v: string }) => <div className="ng-row"><span>{k}</span><b>{v}</b></div>;
  let title = "", sub = "", body: React.ReactNode = null, tone: Tone = "grey";

  if (target.kind === "tower") {
    const t = town.towers.find((x) => x.id === target.id);
    if (t) {
      title = t.name; sub = t.note; tone = t.tone;
      body = <>
        <Row k={`Spend, ${town.rangeLabel.toLowerCase()}`} v={$(t.spend)} />
        <Row k="Leads" v={String(t.leads)} />
        <Row k="Cost per lead" v={$(t.costPerLead)} />
        <Row k="Booked" v={`${t.booked} · ${pct(t.bookRate)}`} />
        <Row k="Showed" v={String(t.showed)} />
        <Row k="Cost per showed" v={$(t.costPerShow)} />
        <Row k="Cost per lead, last 2 weeks vs the 2 before" v={trend(t.costTrend)} />
        <Row k="Leads per day, last 2 weeks vs the 2 before" v={trend(t.leadsTrend)} />
      </>;
    }
  } else if (target.kind === "bay") {
    const b = town.bays.find((x) => x.repId === target.id);
    if (b) {
      title = b.name; sub = b.note; tone = b.tone;
      body = <>
        <Row k="On the tools now" v={b.inSession ? "yes" : "no"} />
        <Row k="Today" v={`${b.hoursToday} h · ${b.callsToday} calls · ${b.bookingsToday} booked`} />
        <Row k="This week" v={`${b.hours7d} h · ${b.bookings7d} booked`} />
        <Row k="Bookings per hour, this week" v={b.rate7d === null ? "—" : b.rate7d.toFixed(2)} />
        <Row k="The bar" v="1 every 2 hours, after 8 hours" />
      </>;
    }
  } else if (target.kind === "tank") {
    const t = town.tanks.find((x) => x.clinicId === target.id);
    if (t) {
      title = t.name; sub = t.note; tone = t.tone;
      body = <>
        <Row k="Pack size" v={String(t.packSize)} />
        <Row k="Shows delivered" v={String(t.delivered)} />
        <Row k="Still to deliver" v={String(t.owed)} />
        <Row k="Tank" v={`${t.pct}% full`} />
        {t.refundFails > 0 && <Row k="Refunds failed" v={`${t.refundFails}: ${t.refundNames.join(", ")}`} />}
      </>;
    }
  } else if (target.kind === "pump") {
    title = "Make.com automations"; sub = town.pump.note; tone = town.pump.fire ? "red" : "green";
    body = town.pump.issues.length
      ? <ul className="ng-list">{town.pump.issues.map((i) => <li key={i}>{i}</li>)}</ul>
      : <div className="ng-list" style={{ paddingLeft: 0 }}>Leads are arriving and reminder texts are going out.</div>;
  } else if (target.kind === "puddle") {
    const p = town.puddles.find((x) => x.city === target.id);
    if (p) {
      title = p.city; sub = p.note; tone = p.tone;
      body = <>
        <Row k={`Cost, ${town.rangeLabel.toLowerCase()}`} v={$(p.cost)} />
        <Row k="Revenue" v={$(p.revenue)} />
        <Row k="Profit" v={`${p.profit >= 0 ? "+" : "−"}${$(Math.abs(p.profit))}`} />
      </>;
    }
  } else if (target.kind === "depot") {
    title = "Plumbing depot"; sub = `${town.yardLeads.toLocaleString()} leads in the yard`;
    body = <>
      <Row k="Advisors on the tools" v={String(town.bays.filter((b) => b.inSession).length)} />
      <Row k="Booked today" v={String(town.todayBooked)} />
      <Row k="Showed today" v={String(town.todayShowed)} />
    </>;
  } else if (target.kind === "meter") {
    title = "Money"; sub = town.rangeLabel; tone = town.profit >= 0 ? "green" : "red";
    body = <>
      <Row k="Money out" v={$(town.totalCost)} />
      <Row k="Money in" v={$(town.totalRevenue)} />
      <Row k="Profit" v={`${town.profit >= 0 ? "+" : "−"}${$(Math.abs(town.profit))}`} />
    </>;
  }
  if (!title) return null;
  return (
    <div className="ng-drawer" style={{ borderTop: `4px solid ${TONE_CSS[tone].line}` }}>
      <button className="ng-close" onClick={onClose} aria-label="Close">×</button>
      <h2>{title}</h2>
      <div className="sub">{sub}</div>
      {body}
    </div>
  );
}
