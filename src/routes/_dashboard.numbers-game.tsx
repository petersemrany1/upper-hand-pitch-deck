import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNumbersReport } from "@/lib/ad-spend.functions";
import type { AdPerformanceRow, LabourRow, LocationSummaryRow, RevenueRow } from "@/lib/ad-spend.functions";
import { getNumbersGameLive, type NumbersGameLive } from "@/lib/numbers-game.functions";
import { shiftDays, todaySydney } from "@/components/numbers/format";
import { buildTown, type Flag, type Tone, type Town } from "@/components/numbers-game/model";
import { TownScene, type LabelSpec, type PickKind, type PickTarget } from "@/components/numbers-game/scene";

export const Route = createFileRoute("/_dashboard/numbers-game")({
  head: () => ({
    meta: [
      { title: "Operations Map | Hair Transplant Group" },
      { name: "description", content: "The business as an industrial water network: ads feed the reservoirs, advisors run the depot, clinics fill their tanks." },
    ],
  }),
  component: NumbersGamePage,
});

const TONE: Record<Tone, string> = { red: "#e0574a", amber: "#e0a33f", green: "#3fc3a6", grey: "#6f7c8a" };
const DISTRICT: Record<PickKind, string> = { tower: "ACQUISITION", pump: "SYSTEMS", bay: "SALES", depot: "SALES", tank: "CLINICS", puddle: "FINANCE", meter: "FINANCE" };

type RangeKey = "today" | "7d" | "30d" | "month" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" }, { key: "7d", label: "7D" }, { key: "30d", label: "30D" }, { key: "month", label: "MTD" }, { key: "all", label: "All" },
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
.ops{position:relative;height:calc(100vh - 32px);min-height:600px;border-radius:14px;overflow:hidden;background:#b9c6d2;color:#dfe5ec;font-family:-apple-system,"Inter",Helvetica,Arial,sans-serif;--mono:ui-monospace,Menlo,Consolas,monospace}
.ops *{box-sizing:border-box}
.ops-canvas{position:absolute;inset:0}
.ops-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(0,0,0,.28) 100%)}
.ops-hud{position:absolute;left:0;top:0;right:0;height:44px;display:flex;align-items:center;gap:14px;padding:0 16px;background:rgba(12,16,21,.9);border-bottom:1px solid rgba(255,255,255,.08);pointer-events:none}
.ops-hud>*{pointer-events:auto}
.ops-brand{display:flex;flex-direction:column;line-height:1.05}
.ops-brand b{font-size:12.5px;letter-spacing:2.2px;text-transform:uppercase;font-weight:700;color:#f2f5f8}
.ops-brand span{font-family:var(--mono);font-size:9px;letter-spacing:1.6px;color:#7f8c9a;margin-top:2px}
.ops-kpi{display:flex;flex-direction:column;padding:0 12px;border-left:1px solid rgba(255,255,255,.08);line-height:1.1}
.ops-kpi span{font-family:var(--mono);font-size:8.5px;letter-spacing:1.6px;color:#7f8c9a;text-transform:uppercase}
.ops-kpi b{font-size:13.5px;font-weight:600;letter-spacing:-.2px;color:#f2f5f8;font-variant-numeric:tabular-nums}
.ops-kpi b i{font-style:normal;font-size:12px;color:#8e9aa7;margin-left:6px}
.ops-seg{display:flex;gap:2px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:2px}
.ops-seg button{border:0;background:transparent;color:#8e9aa7;font-family:var(--mono);font-size:10px;letter-spacing:1px;padding:3px 8px;border-radius:4px;cursor:pointer}
.ops-seg button[aria-pressed="true"]{background:#2b476d;color:#fff}
.ops-spacer{flex:1}
.ops-clock{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;color:#8e9aa7;display:flex;align-items:center;gap:10px}
.ops-clock i{width:7px;height:7px;border-radius:50%;background:#3fc3a6;box-shadow:0 0 10px #3fc3a6}
.ops-clock i.off{background:#6f7c8a;box-shadow:none}
.ops-plate{position:absolute;transform:translate(-50%,-100%);display:flex;align-items:center;gap:6px;background:rgba(14,18,24,.78);border:1px solid rgba(255,255,255,.1);border-radius:3px;padding:2px 7px 2px 6px;font-size:10.5px;font-weight:600;letter-spacing:.2px;color:#e6ebf0;white-space:nowrap;pointer-events:none;backdrop-filter:blur(3px)}
.ops-plate i{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.ops-card{position:absolute;z-index:3;transform:translate(-50%,-100%) translateY(-10px);width:220px;background:rgba(14,18,24,.94);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:12px 14px;box-shadow:0 18px 50px rgba(0,0,0,.55);pointer-events:none;backdrop-filter:blur(8px)}
.ops-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:8px 0 0 8px;background:var(--accent)}
.ops-card small{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:1.8px;color:#7f8c9a;text-transform:uppercase}
.ops-card b{display:block;font-size:13.5px;font-weight:600;color:#f2f5f8;margin:3px 0 6px;letter-spacing:-.1px}
.ops-card p{margin:0;font-size:12px;line-height:1.45;color:#b6c0ca}
.ops-kpis{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:11.5px}
.ops-kpis span{color:#8e9aa7}.ops-kpis b{color:#f2f5f8;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.ops-panel{position:absolute;right:12px;top:56px;bottom:12px;width:21%;min-width:260px;display:flex;flex-direction:column;background:rgba(12,16,21,.88);border:1px solid rgba(255,255,255,.1);border-radius:10px;backdrop-filter:blur(10px);box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden}
.ops-panel-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:12px 14px 9px;border-bottom:1px solid rgba(255,255,255,.08)}
.ops-panel-h b{font-size:12px;letter-spacing:2.6px;font-weight:700;color:#f2f5f8}
.ops-panel-h span{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;color:#7f8c9a}
.ops-panel-body{overflow:auto;padding:6px 8px 10px}
.ops-sec{font-family:var(--mono);font-size:9.5px;letter-spacing:2px;color:#7f8c9a;padding:10px 8px 4px;display:flex;align-items:center;gap:8px}
.ops-sec:after{content:"";flex:1;height:1px;background:rgba(255,255,255,.07)}
.ops-item{display:grid;grid-template-columns:26px 1fr;gap:10px;padding:9px 8px;border-radius:6px;cursor:pointer;border-left:2px solid transparent}
.ops-item:hover{background:rgba(255,255,255,.05)}
.ops-item .n{font-family:var(--mono);font-size:11px;color:#59667a;padding-top:2px}
.ops-item .t{font-size:12.5px;font-weight:600;color:#eef2f6;line-height:1.3}
.ops-item .d{font-size:11.5px;color:#93a0ad;line-height:1.4;margin-top:2px}
.ops-item .tag{display:inline-block;font-family:var(--mono);font-size:9px;letter-spacing:1.6px;color:#8e9aa7;margin-right:8px}
.ops-empty{padding:12px 8px;font-size:12px;color:#7f8c9a}
.ops-detail{position:absolute;left:14px;top:58px;width:310px;background:rgba(12,16,21,.92);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:16px 18px;backdrop-filter:blur(10px);box-shadow:0 20px 60px rgba(0,0,0,.5)}
.ops-detail:before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;background:var(--accent);border-radius:0 3px 3px 0}
.ops-detail small{font-family:var(--mono);font-size:9.5px;letter-spacing:1.8px;color:#7f8c9a;text-transform:uppercase}
.ops-detail h2{margin:4px 0 2px;font-size:17px;font-weight:600;color:#f2f5f8;letter-spacing:-.2px}
.ops-detail .sub{font-size:12px;color:#93a0ad;margin-bottom:12px;line-height:1.45}
.ops-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ops-kv{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:8px 10px}
.ops-kv span{display:block;font-family:var(--mono);font-size:9px;letter-spacing:1.4px;color:#7f8c9a;text-transform:uppercase}
.ops-kv b{display:block;font-size:14px;font-weight:600;color:#f2f5f8;margin-top:2px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ops-kv.wide{grid-column:1 / -1}
.ops-close{position:absolute;right:10px;top:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#93a0ad;border-radius:5px;width:26px;height:26px;cursor:pointer;font-size:14px}
.ops-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:12px;letter-spacing:2px;color:#8e9aa7;background:rgba(17,21,27,.7)}
@media (max-width:1000px){.ops-panel{position:static;width:auto;margin:8px;max-height:40vh}.ops-detail{width:auto;left:8px;right:8px}}
`;

type Report = { ads: AdPerformanceRow[]; locations: LocationSummaryRow[]; labourByLocation: LabourRow[]; revenueByLocation: RevenueRow[] };
function sydneyHour(): number { return Number(new Date().toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: "Australia/Sydney" })); }
const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.round(Math.abs(n)).toLocaleString()}`;

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

  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetchReport({ data: rangeDates(rangeKey) });
        if (alive) setReport({ ads: r.ads, locations: r.locations, labourByLocation: r.labourByLocation, revenueByLocation: r.revenueByLocation });
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { alive = false; };
  }, [ready, isAdmin, fetchReport, rangeKey]);

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

  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    const load = async () => {
      try { const l = await fetchLive({}); if (!alive) return; setLive(l); setHour(sydneyHour()); }
      catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [ready, isAdmin, fetchLive]);

  const town: Town | null = useMemo(() => {
    if (!report || !live || !fortnights) return null;
    return buildTown({ ads: report.ads, adsRecent: fortnights.recent, adsPrior: fortnights.prior, locations: report.locations, labourByLocation: report.labourByLocation, revenueByLocation: report.revenueByLocation, live, rangeLabel: RANGES.find((r) => r.key === rangeKey)?.label ?? "", hour });
  }, [report, live, fortnights, rangeKey, hour]);

  const onPick = useCallback((t: PickTarget | null) => { setPicked(t); sceneRef.current?.focus(t); }, []);

  useEffect(() => {
    const el = canvasRef.current; if (!el) return;
    const scene = new TownScene(el, { onPick, onLabels: setLabels });
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  }, [onPick]);

  useEffect(() => {
    if (!town || !sceneRef.current || !live) return;
    sceneRef.current.setTown(town);
    const ids = new Set(live.bookingsToday.map((b) => b.leadId));
    const seen = seenBookingsRef.current;
    if (seen) live.bookingsToday.filter((b) => !seen.has(b.leadId)).forEach((b, i) => window.setTimeout(() => sceneRef.current?.deliverBooking(b.repId, b.clinicId), 800 + i * 9000));
    seenBookingsRef.current = ids;
  }, [town, live]);

  if (!ready) return null;
  if (!isAdmin) return <div style={{ padding: 24, fontSize: 14 }}>Admins only.</div>;

  const clock = new Date().toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Australia/Sydney" }).toUpperCase();
  const critical = town?.flags.filter((f) => f.tone === "red") ?? [];
  const watch = town?.flags.filter((f) => f.tone !== "red") ?? [];
  const jump = (f: Flag) => onPick(f.target);

  return (
    <div className="ops">
      <style>{CSS}</style>
      <div ref={canvasRef} className="ops-canvas" />
      <div className="ops-vignette" />

      {labels.filter((l) => !l.hidden).map((l) => l.active ? (
        <div key={l.key} className="ops-card" style={{ left: l.x, top: l.y, ["--accent" as string]: TONE[l.tone] }}>
          <small>{DISTRICT[l.kind]}</small>
          <b>{l.title}</b>
          <div className="ops-kpis">{l.kpis.map(([k, v]) => <><span key={`${k}k`}>{k}</span><b key={`${k}v`}>{v}</b></>)}</div>
        </div>
      ) : (
        <div key={l.key} className="ops-plate" style={{ left: l.x, top: l.y }}><i style={{ background: TONE[l.tone], boxShadow: l.tone === "grey" ? "none" : `0 0 8px ${TONE[l.tone]}` }} />{l.short}</div>
      ))}

      <div className="ops-hud">
        <div className="ops-brand"><b>Network</b><span>HAIR TRANSPLANT GROUP</span></div>
        <div className="ops-seg">{RANGES.map((r) => <button key={r.key} aria-pressed={rangeKey === r.key} onClick={() => setRangeKey(r.key)}>{r.label}</button>)}</div>
        {town && (
          <>
            <div className="ops-kpi"><span>Alarms</span><b style={{ color: critical.length ? TONE.red : "#f2f5f8" }}>{critical.length}</b></div>
            <div className="ops-kpi"><span>Performing</span><b style={{ color: "#c9a227" }}>{town.good.length}</b></div>
            <div className="ops-kpi"><span>Today</span><b>{town.todayBooked}<i>booked</i>{town.todayShowed}<i>showed</i></b></div>
            <div className="ops-kpi"><span>Net · {town.rangeLabel}</span><b style={{ color: town.profit >= 0 ? TONE.green : TONE.red }}>{money(town.profit)}</b></div>
          </>
        )}
        <div className="ops-spacer" />
        <div className="ops-clock"><i className={town?.depotOpen ? "" : "off"} />{clock} SYD · {town?.depotOpen ? "DEPOT OPEN" : "DEPOT CLOSED"}</div>
      </div>

      {town && (
        <div className="ops-panel">
          <div className="ops-panel-h"><b>PRIORITIES</b><span>{critical.length} CRITICAL · {watch.length} WATCH</span></div>
          <div className="ops-panel-body">
            <div className="ops-sec">CRITICAL</div>
            {critical.length === 0 && <div className="ops-empty">No alarms. The network is running clean.</div>}
            {critical.map((f, i) => <Item key={`c${i}`} n={i + 1} f={f} onClick={() => jump(f)} />)}
            {watch.length > 0 && <div className="ops-sec">WATCH</div>}
            {watch.map((f, i) => <Item key={`w${i}`} n={critical.length + i + 1} f={f} onClick={() => jump(f)} />)}
            {town.good.length > 0 && <div className="ops-sec">PERFORMING</div>}
            {town.good.map((f, i) => <Item key={`g${i}`} n={critical.length + watch.length + i + 1} f={f} onClick={() => jump(f)} gold />)}
          </div>
        </div>
      )}

      {picked && town && <Detail town={town} target={picked} onClose={() => onPick(null)} />}
      {!town && !error && <div className="ops-loading" style={{ color: "#2b3540", background: "rgba(185,198,210,.6)" }}>PRESSURISING NETWORK</div>}
      {error && <div className="ops-loading">NETWORK OFFLINE · {error}</div>}
    </div>
  );
}

function Item({ n, f, onClick, gold }: { n: number; f: Flag; onClick: () => void; gold?: boolean }) {
  const accent = gold ? "#c9a227" : TONE[f.tone];
  return (
    <div className="ops-item" onClick={onClick} style={{ borderLeftColor: accent }}>
      <div className="n">{String(n).padStart(2, "0")}</div>
      <div>
        <div className="t"><span className="tag" style={{ color: accent }}>{DISTRICT[f.target.kind]}</span>{f.title}</div>
        <div className="d">{f.detail}</div>
      </div>
    </div>
  );
}

function Detail({ town, target, onClose }: { town: Town; target: PickTarget; onClose: () => void }) {
  const $ = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString()}`);
  const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
  const trend = (r: number | null) => (r === null ? "n/a" : r >= 1 ? `+${Math.round((r - 1) * 100)}%` : `−${Math.round((1 - r) * 100)}%`);
  const KV = ({ k, v, wide }: { k: string; v: string; wide?: boolean }) => <div className={`ops-kv${wide ? " wide" : ""}`}><span>{k}</span><b>{v}</b></div>;
  let title = "", sub = "", body: React.ReactNode = null, tone: Tone = "grey";

  if (target.kind === "tower") {
    const t = town.towers.find((x) => x.id === target.id);
    if (t) { title = t.name; sub = t.note; tone = t.tone; body = <>
      <KV k={`Spend · ${town.rangeLabel}`} v={$(t.spend)} /><KV k="Leads" v={String(t.leads)} />
      <KV k="Cost / lead" v={$(t.costPerLead)} /><KV k="Booked" v={`${t.booked} · ${pct(t.bookRate)}`} />
      <KV k="Showed" v={String(t.showed)} /><KV k="Cost / showed" v={$(t.costPerShow)} />
      <KV k="Cost / lead vs prior fortnight" v={trend(t.costTrend)} /><KV k="Leads / day vs prior fortnight" v={trend(t.leadsTrend)} />
    </>; }
  } else if (target.kind === "bay") {
    const b = town.bays.find((x) => x.repId === target.id);
    if (b) { title = b.name; sub = b.note; tone = b.tone; body = <>
      <KV k="Status" v={b.inSession ? "On the tools" : "Off"} /><KV k="Today" v={`${b.hoursToday} h · ${b.callsToday} calls`} />
      <KV k="Booked today" v={String(b.bookingsToday)} /><KV k="Booked · 7 days" v={`${b.bookings7d} in ${b.hours7d} h`} />
      <KV k="Bookings / hour · 7 days" v={b.rate7d === null ? "—" : b.rate7d.toFixed(2)} /><KV k="Target" v="0.5 / h after 8 h" />
    </>; }
  } else if (target.kind === "tank") {
    const t = town.tanks.find((x) => x.clinicId === target.id);
    if (t) { title = t.name; sub = t.note; tone = t.tone; body = <>
      <KV k="Pack" v={String(t.packSize)} /><KV k="Delivered" v={String(t.delivered)} />
      <KV k="Remaining" v={String(t.owed)} /><KV k="Tank" v={`${t.pct}%`} />
      {t.refundFails > 0 && <KV k="Refunds failed" v={`${t.refundFails} · ${t.refundNames.join(", ")}`} wide />}
    </>; }
  } else if (target.kind === "pump") {
    title = "Pump station"; sub = town.pump.note; tone = town.pump.fire ? "red" : "green";
    body = town.pump.issues.length ? town.pump.issues.map((i) => <KV key={i} k="Issue" v={i} wide />) : <KV k="Automations" v="Leads arriving · reminders sent" wide />;
  } else if (target.kind === "puddle") {
    const p = town.puddles.find((x) => x.city === target.id);
    if (p) { title = p.city; sub = p.note; tone = p.tone; body = <>
      <KV k={`Cost · ${town.rangeLabel}`} v={$(p.cost)} /><KV k="Revenue" v={$(p.revenue)} /><KV k="Net" v={money(p.profit)} wide />
    </>; }
  } else if (target.kind === "depot") {
    title = "Sales depot"; sub = `${town.yardLeads.toLocaleString()} leads in the yard`;
    body = <><KV k="Advisors online" v={String(town.bays.filter((b) => b.inSession).length)} /><KV k="Booked today" v={String(town.todayBooked)} /><KV k="Showed today" v={String(town.todayShowed)} /></>;
  } else if (target.kind === "meter") {
    title = "Meter house"; sub = town.rangeLabel; tone = town.profit >= 0 ? "green" : "red";
    body = <><KV k="Out" v={$(town.totalCost)} /><KV k="In" v={$(town.totalRevenue)} /><KV k="Net" v={money(town.profit)} wide /></>;
  }
  if (!title) return null;
  return (
    <div className="ops-detail" style={{ ["--accent" as string]: TONE[tone] }}>
      <button className="ops-close" onClick={onClose} aria-label="Close">×</button>
      <small>{DISTRICT[target.kind]}</small>
      <h2>{title}</h2>
      <div className="sub">{sub}</div>
      <div className="ops-grid">{body}</div>
    </div>
  );
}
