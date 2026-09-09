import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getNumbersReport } from "@/lib/ad-spend.functions";
import type { AdPerformanceRow, LabourRow, LocationSummaryRow, NeedsOutcomeRow, RevenueRow } from "@/lib/ad-spend.functions";
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

const CSS = `
.ng-root{position:relative;height:calc(100vh - 32px);min-height:560px;border-radius:16px;overflow:hidden;background:#c8ecff;font-family:-apple-system,"Inter",Helvetica,Arial,sans-serif;color:#1b2430}
.ng-canvas{position:absolute;inset:0}
.ng-hud{position:absolute;left:0;top:0;right:0;display:flex;align-items:center;gap:10px;padding:12px 16px;pointer-events:none;flex-wrap:wrap}
.ng-hud>*{pointer-events:auto}
.ng-title{font-size:17px;letter-spacing:1.2px;text-transform:uppercase;font-weight:800;margin-right:8px}
.ng-title span{color:#2f7cf6}
.ng-chip{background:rgba(255,255,255,.94);border:1px solid #dfe3e8;border-radius:999px;padding:6px 12px;font-size:12.5px;display:flex;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ng-chip b{font-size:14px}
.ng-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.ng-spacer{flex:1}
.ng-time{font-size:12px;color:#3d4b5a;background:rgba(255,255,255,.7);padding:5px 10px;border-radius:999px}
.ng-lbl{position:absolute;transform:translate(-50%,-100%);background:rgba(255,255,255,.96);border:1.5px solid #dfe3e8;border-radius:9px;padding:4px 9px;font-size:11px;line-height:1.3;box-shadow:0 2px 6px rgba(0,0,0,.08);pointer-events:none;max-width:200px;text-align:center}
.ng-lbl b{display:block;font-size:12px;white-space:nowrap}
.ng-lbl.small{padding:3px 7px}
.ng-lbl.small b{font-size:11px}
.ng-flags{position:absolute;right:16px;bottom:16px;width:300px;max-height:60%;overflow:auto;background:rgba(255,255,255,.95);border:1px solid #dfe3e8;border-radius:12px;padding:10px 12px;box-shadow:0 4px 16px rgba(0,0,0,.1)}
.ng-flags h3{margin:0 0 6px;font-size:10.5px;letter-spacing:1.6px;text-transform:uppercase;color:#8a96a3}
.ng-flag{font-size:12.5px;padding:7px 4px;border-top:1px solid #eef0f3;display:flex;gap:8px;align-items:flex-start;cursor:pointer;border-radius:6px}
.ng-flag:hover{background:#f6f8fa}
.ng-flag .ng-dot{margin-top:5px;flex-shrink:0}
.ng-flag small{color:#6b7785;display:block}
.ng-legend{position:absolute;left:16px;bottom:16px;font-size:11px;color:#3d4b5a;background:rgba(255,255,255,.85);border:1px solid #dfe3e8;border-radius:10px;padding:7px 11px;line-height:1.6;max-width:520px}
.ng-drawer{position:absolute;left:16px;top:64px;width:320px;background:#fff;border:1px solid #dfe3e8;border-radius:14px;padding:14px 16px;box-shadow:0 8px 28px rgba(0,0,0,.14)}
.ng-drawer h2{margin:0 0 2px;font-size:16px}
.ng-drawer .sub{font-size:12px;color:#6b7785;margin-bottom:10px}
.ng-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-top:1px solid #f1f3f5}
.ng-row b{font-variant-numeric:tabular-nums}
.ng-close{position:absolute;right:10px;top:10px;border:0;background:#f1f3f5;border-radius:999px;width:26px;height:26px;cursor:pointer;font-size:14px}
.ng-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#3d4b5a;background:rgba(200,236,255,.6)}
.ng-list{font-size:12.5px;color:#1b2430;margin:6px 0 0;padding-left:16px}
`;

type Report = {
  ads: AdPerformanceRow[];
  locations: LocationSummaryRow[];
  labourByLocation: LabourRow[];
  revenueByLocation: RevenueRow[];
  needsOutcome: NeedsOutcomeRow[];
};

function sydneyHour(): number {
  return Number(new Date().toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: "Australia/Sydney" }));
}

function NumbersGamePage() {
  const { role, ready } = useAuth();
  const isAdmin = role === "admin";
  const fetchReport = useServerFn(getNumbersReport);
  const fetchLive = useServerFn(getNumbersGameLive);

  const [report, setReport] = useState<{ d30: Report; recent: AdPerformanceRow[]; prior: AdPerformanceRow[] } | null>(null);
  const [live, setLive] = useState<NumbersGameLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<LabelSpec[]>([]);
  const [picked, setPicked] = useState<PickTarget | null>(null);
  const [hour, setHour] = useState(sydneyHour());

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TownScene | null>(null);
  const lastBookedRef = useRef<number | null>(null);

  // 30-day picture plus two fortnights for ad fatigue.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const today = todaySydney();
        const [d30, recent, prior] = await Promise.all([
          fetchReport({ data: { from: shiftDays(today, -29), to: today } }),
          fetchReport({ data: { from: shiftDays(today, -13), to: today } }),
          fetchReport({ data: { from: shiftDays(today, -27), to: shiftDays(today, -14) } }),
        ]);
        if (!alive) return;
        setReport({
          d30: { ads: d30.ads, locations: d30.locations, labourByLocation: d30.labourByLocation, revenueByLocation: d30.revenueByLocation, needsOutcome: d30.needsOutcome },
          recent: recent.ads,
          prior: prior.ads,
        });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { alive = false; };
  }, [ready, isAdmin, fetchReport]);

  // Live layer every minute.
  useEffect(() => {
    if (!ready || !isAdmin) return;
    let alive = true;
    const load = async () => {
      try {
        const l = await fetchLive({});
        if (!alive) return;
        setLive(l);
        setHour(sydneyHour());
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [ready, isAdmin, fetchLive]);

  const town: Town | null = useMemo(() => {
    if (!report || !live) return null;
    return buildTown({
      ads30: report.d30.ads, adsRecent: report.recent, adsPrior: report.prior,
      locations: report.d30.locations, labourByLocation: report.d30.labourByLocation, revenueByLocation: report.d30.revenueByLocation,
      needsOutcome: report.d30.needsOutcome, live, hour,
    });
  }, [report, live, hour]);

  const onPick = useCallback((t: PickTarget | null) => { setPicked(t); sceneRef.current?.focus(t); }, []);

  // Mount the scene once.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const scene = new TownScene(el, { onPick, onLabels: setLabels });
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
  }, [onPick]);

  // Feed it the town whenever the numbers change; drive a van when a booking lands.
  useEffect(() => {
    if (!town || !sceneRef.current) return;
    sceneRef.current.setTown(town);
    if (lastBookedRef.current !== null && town.todayBooked > lastBookedRef.current) {
      const rep = town.bays.find((b) => b.inSession) ?? town.bays[0];
      if (rep) sceneRef.current.celebrateBooking(rep.repId);
    }
    lastBookedRef.current = town.todayBooked;
  }, [town]);

  // Ambient life: every so often an on-pace van does a run while bookings exist today.
  useEffect(() => {
    if (!town || town.todayBooked === 0) return;
    const id = window.setInterval(() => {
      const bays = town.bays.filter((b) => b.inSession);
      const b = bays[Math.floor(Math.random() * bays.length)];
      if (b) sceneRef.current?.celebrateBooking(b.repId);
    }, 25_000);
    return () => window.clearInterval(id);
  }, [town]);

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
        const quiet = l.tone === "grey";
        return (
          <div key={l.key} className={`ng-lbl${quiet ? " small" : ""}`} style={{ left: l.x, top: l.y, borderColor: quiet ? "#dfe3e8" : c.line, color: quiet ? "#5b6874" : "#1b2430" }}>
            <b style={{ color: quiet ? "#5b6874" : c.fg }}>{l.title}</b>
            {!quiet && l.sub}
          </div>
        );
      })}

      <div className="ng-hud">
        <div className="ng-title">Numbers <span>Game</span></div>
        {town && (
          <>
            <div className="ng-chip"><span className="ng-dot" style={{ background: TONE_CSS.red.line }} /><b style={{ color: TONE_CSS.red.fg }}>{town.flags.length}</b> to fix</div>
            <div className="ng-chip"><span className="ng-dot" style={{ background: TONE_CSS.green.line }} /><b style={{ color: TONE_CSS.green.fg }}>{town.good.length}</b> running well</div>
            <div className="ng-chip">Today <b>{town.todayBooked}</b> booked · <b>{town.todayShowed}</b> showed</div>
            <div className="ng-chip">30 days <b style={{ color: town.profit >= 0 ? TONE_CSS.green.fg : TONE_CSS.red.fg }}>{town.profit >= 0 ? "+" : "−"}${Math.round(Math.abs(town.profit)).toLocaleString()}</b></div>
          </>
        )}
        <div className="ng-spacer" />
        <div className="ng-time">{clock} · {town?.depotOpen ? "depot open" : "depot closed"}</div>
      </div>

      {town && (
        <div className="ng-flags">
          <h3>Fix these</h3>
          {town.flags.length === 0 && <div style={{ fontSize: 12.5, color: "#6b7785", padding: "6px 4px" }}>Nothing's stuck. Nice.</div>}
          {town.flags.map((f, i) => (
            <div key={i} className="ng-flag" onClick={() => jumpTo(f)}>
              <span className="ng-dot" style={{ background: TONE_CSS[f.tone].line }} />
              <span><b>{f.title}.</b> <small>{f.detail}</small></span>
            </div>
          ))}
          {town.good.length > 0 && <h3 style={{ marginTop: 10 }}>Running well</h3>}
          {town.good.map((f, i) => (
            <div key={i} className="ng-flag" onClick={() => jumpTo(f)}>
              <span className="ng-dot" style={{ background: TONE_CSS.green.line }} />
              <span><b>{f.title}.</b> <small>{f.detail}</small></span>
            </div>
          ))}
        </div>
      )}

      <div className="ng-legend">Tower = an ad, water = leads · Pipe = leads flowing · Van = an advisor · Crates = leads in the queue · Tank = a clinic's pack · Brown lump = stuck · Puddle = money leaking · Click anything for its numbers</div>

      {picked && town && <Drawer town={town} target={picked} onClose={() => onPick(null)} />}

      {!town && !error && <div className="ng-loading">Filling the pipes…</div>}
      {error && <div className="ng-loading">Couldn't load the town: {error}</div>}
    </div>
  );
}

function Drawer({ town, target, onClose }: { town: Town; target: PickTarget; onClose: () => void }) {
  const $ = (n: number | null) => (n === null ? "—" : `$${Math.round(n).toLocaleString()}`);
  const Row = ({ k, v }: { k: string; v: string }) => <div className="ng-row"><span>{k}</span><b>{v}</b></div>;
  let title = "", sub = "", body: React.ReactNode = null, tone: Tone = "grey";

  if (target.kind === "tower") {
    const t = town.towers.find((x) => x.id === target.id);
    if (t) {
      title = t.name; sub = t.note; tone = t.tone;
      body = <>
        <Row k="Spend, 30 days" v={$(t.spend)} />
        <Row k="Leads" v={String(t.leads)} />
        <Row k="Cost per lead" v={$(t.costPerLead)} />
        <Row k="Cost per lead vs fortnight before" v={t.trend === null ? "not enough leads yet" : `${t.trend >= 1 ? "+" : "−"}${Math.round(Math.abs(t.trend - 1) * 100)}%`} />
        <Row k="Booked" v={String(t.booked)} />
        <Row k="Showed" v={String(t.showed)} />
        <Row k="Cost per showed" v={$(t.costPerShow)} />
      </>;
    }
  } else if (target.kind === "bay") {
    const b = town.bays.find((x) => x.repId === target.id);
    if (b) {
      title = b.name; sub = b.note; tone = b.tone;
      body = <>
        <Row k="In the depot now" v={b.inSession ? "yes" : "no"} />
        <Row k="Hours today" v={`${b.hoursToday} h`} />
        <Row k="Calls today" v={String(b.callsToday)} />
        <Row k="Booked today" v={String(b.bookingsToday)} />
        <Row k="Bookings per hour" v={b.pace === null ? "—" : b.pace.toFixed(1)} />
        <Row k="Goal" v="1 an hour" />
      </>;
    }
  } else if (target.kind === "tank") {
    const t = town.tanks.find((x) => x.clinicId === target.id);
    if (t) {
      title = t.name; sub = t.note; tone = t.tone;
      body = <>
        <Row k="Pack size" v={String(t.packSize)} />
        <Row k="Delivered" v={String(t.delivered)} />
        <Row k="Still to deliver" v={String(t.owed)} />
        <Row k="Tank" v={`${Math.round(t.fill * 100)}% full`} />
        <Row k="Send renewal at" v="80%" />
      </>;
    }
  } else if (target.kind === "clog") {
    const c = town.clogs.find((x) => x.id === target.id);
    if (c) { title = `${c.count} ${c.label.toLowerCase()}`; sub = "stuck in the pipe"; tone = c.tone; body = <div className="ng-list">{c.detail}</div>; }
  } else if (target.kind === "puddle") {
    const p = town.puddles.find((x) => x.city === target.id);
    if (p) {
      title = p.city; sub = p.note; tone = p.tone;
      body = <>
        <Row k="Cost, 30 days" v={$(p.cost)} />
        <Row k="Revenue" v={$(p.revenue)} />
        <Row k="Profit" v={`${p.profit >= 0 ? "+" : "−"}${$(Math.abs(p.profit))}`} />
      </>;
    }
  } else if (target.kind === "depot") {
    title = "Plumbing depot"; sub = `${town.yardLeads.toLocaleString()} leads in the yard`;
    body = <>
      <Row k="Advisors in now" v={String(town.bays.filter((b) => b.inSession).length)} />
      <Row k="Booked today" v={String(town.todayBooked)} />
      <Row k="Showed today" v={String(town.todayShowed)} />
    </>;
  } else if (target.kind === "meter") {
    title = "Meter house"; sub = "last 30 days"; tone = town.profit >= 0 ? "green" : "red";
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
