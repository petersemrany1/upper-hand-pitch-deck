import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdPerformanceRow } from "@/lib/ad-spend.functions";
import { callingOrder, pipelineSentence, type AdStats, type AdVerdictKey, type Pipeline, type PipelineStage } from "./model";
import { CARD, FAINT, INK, MUTED, type Tone, money, moneyOrDash, pctOrDash, td2, td2r, th2, th2r } from "./format";
import { Footnote, Pill, SectionTitle } from "./primitives";

const TONE_FOR: Record<AdVerdictKey, Tone> = {
  winning: "green",
  ok: "amber",
  poor: "red",
  notBooking: "red",
  uncalled: "amber",
  early: "grey",
  noName: "grey",
};

// One bar per ad: grey = still to call, amber = no answer yet, red = spoke but
// no booking, green = booked.
const STAGES: PipelineStage[] = ["toCall", "chasing", "spoke", "booked"];
const STAGE_COLOUR: Record<PipelineStage, string> = { toCall: "#c2c2be", chasing: "#e0a33f", spoke: "#d9756a", booked: "#2f9e6a" };
const STAGE_WORD: Record<PipelineStage, string> = { toCall: "still to call", chasing: "no answer yet", spoke: "spoke, no booking", booked: "booked" };
function Bar({ p, height }: { p: Pipeline; height: number }) {
  return (
    <div style={{ display: "flex", height, borderRadius: height / 2, overflow: "hidden", background: "#f0f0ee" }}>
      {STAGES.map((s) => p[s] > 0 && <div key={s} title={`${p[s]} ${STAGE_WORD[s]}`} style={{ width: `${(p[s] / p.total) * 100}%`, background: STAGE_COLOUR[s] }} />)}
    </div>
  );
}
function PipelineBar({ p }: { p: Pipeline | null }) {
  if (!p || p.total === 0) return <span style={{ color: FAINT }}>—</span>;
  return <div title={pipelineSentence(p)} style={{ minWidth: 110 }}><Bar p={p} height={8} /></div>;
}

/**
 * The plain view Peter asked for (2026-09-23): are an ad's leads being
 * called, or just sitting there? One wide bar per ad and one sentence, the
 * ads with the most uncalled leads first. No other numbers.
 */
function LeadsBeingCalled({ rows, onDrill }: { rows: AdStats[]; onDrill: (ad: AdPerformanceRow) => void }) {
  const ordered = callingOrder(rows.filter((r) => r.pipeline));
  if (ordered.length === 0) return null;
  const waiting = ordered.reduce((s, r) => s + (r.pipeline?.toCall ?? 0), 0);
  const total = ordered.reduce((s, r) => s + (r.pipeline?.total ?? 0), 0);
  const words = (p: Pipeline) => {
    if (p.toCall === p.total) return "nobody called yet";
    if (p.toCall > 0) return `${p.toCall} still to call`;
    if (p.booked === 0 && p.chasing > 0 && p.spoke === 0) return "all called, no answer yet";
    if (p.booked === 0) return "all called, none booked";
    return `all called · ${p.booked} booked`;
  };
  return (
    <div style={{ ...CARD, padding: 0 }}>
      <SectionTitle right={<span style={{ fontSize: 12.5, color: waiting > 0 ? "#8a5a2b" : MUTED, fontWeight: waiting > 0 ? 600 : 400 }}>{waiting > 0 ? `${waiting} of ${total} leads still waiting for a first call` : `every one of the ${total} leads has been called`}</span>}>
        Are the leads being called?
      </SectionTitle>
      <div style={{ padding: "4px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {ordered.map((r) => {
          const p = r.pipeline as Pipeline;
          const urgent = p.toCall > 0;
          return (
            <div key={`${r.ad_name}-${r.unattributed}`} onClick={() => onDrill(r)} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) minmax(200px, 2fr) minmax(150px, 0.8fr)", gap: 14, alignItems: "center", cursor: "pointer", padding: "6px 0", borderTop: "0.5px solid #f0f0ee" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.ad_name}>
                {r.unattributed ? "Website & untracked" : r.ad_name.replace(/^hair\s+transplant\s+/i, "")}
                <span style={{ color: FAINT, fontWeight: 400 }}> · {p.total} lead{p.total === 1 ? "" : "s"}</span>
              </div>
              <Bar p={p} height={14} />
              <div style={{ fontSize: 13, fontWeight: urgent ? 700 : 500, color: urgent ? "#b03030" : p.booked > 0 ? "#2f6f4f" : MUTED, whiteSpace: "nowrap" }}>{words(p)}</div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: MUTED, paddingTop: 6 }}>
          {STAGES.map((s) => <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: STAGE_COLOUR[s], display: "inline-block" }} />{STAGE_WORD[s]}</span>)}
          <span>· click an ad to see the people</span>
        </div>
      </div>
    </div>
  );
}

type SortKey = "verdict" | "spend" | "leads" | "costPerLead" | "booked" | "bookRate" | "shows" | "adCostPerShow";

/**
 * Tab 3 — "Which ads are working?"  One plain verdict per ad, best first.
 * Judged on what a show costs against the average of the ads on screen,
 * where a show is any booking not marked no-show.
 */
export function AdsTab({
  rows,
  loading,
  onDrill,
}: {
  rows: AdStats[];
  loading: boolean;
  onDrill: (ad: AdPerformanceRow) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("verdict");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const val = (r: AdStats): number | null => {
      switch (sortKey) {
        case "spend": return r.spend;
        case "leads": return r.leads;
        case "costPerLead": return r.costPerLead;
        case "booked": return r.booked;
        case "bookRate": return r.bookRate;
        case "shows": return r.shows;
        case "adCostPerShow": return r.adCostPerShow;
        default: return null;
      }
    };
    return [...rows].sort((a, b) => {
      if (sortKey === "verdict") {
        if (a.verdict.rank !== b.verdict.rank) return a.verdict.rank - b.verdict.rank;
        const ac = a.adCostPerShow ?? Infinity;
        const bc = b.adCostPerShow ?? Infinity;
        if (ac !== bc) return ac - bc;
        return b.spend - a.spend;
      }
      const av = val(a);
      const bv = val(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
  }, [rows, sortKey, sortAsc]);

  const counts = useMemo(() => {
    const c: Record<AdVerdictKey, number> = { winning: 0, ok: 0, poor: 0, notBooking: 0, uncalled: 0, early: 0, noName: 0 };
    for (const r of rows) c[r.verdict.key] += 1;
    return c;
  }, [rows]);

  const th = (key: SortKey, label: string, align: "left" | "right" = "right", extra?: React.CSSProperties) => {
    const active = sortKey === key;
    return (
      <th
        onClick={() => {
          if (active) setSortAsc(!sortAsc);
          else {
            setSortKey(key);
            setSortAsc(key === "costPerLead" || key === "adCostPerShow" || key === "verdict");
          }
        }}
        style={{ ...(align === "right" ? th2r : th2), ...extra, cursor: "pointer", color: active ? INK : FAINT }}
      >
        {label}{active && key !== "verdict" ? (sortAsc ? " ↑" : " ↓") : ""}
      </th>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LeadsBeingCalled rows={rows} onDrill={onDrill} />
      <div style={{ ...CARD, padding: 0 }}>
        <SectionTitle
          right={
            <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Pill tone="green">{counts.winning} winning</Pill>
              <Pill tone="amber">{counts.ok} average</Pill>
              <Pill tone="red">{counts.poor + counts.notBooking} poor</Pill>
              {counts.uncalled > 0 && <Pill tone="amber">{counts.uncalled} not called yet</Pill>}
              <Pill tone="grey">{counts.early} too early</Pill>
            </span>
          }
        >
          Ads, best first
        </SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {th("verdict", "Ad", "left", { paddingLeft: 18 })}
                <th style={th2}>City</th>
                {th("spend", "Spend")}
                {th("leads", "Leads")}
                <th style={th2}>Called?</th>
                {th("costPerLead", "Cost / lead")}
                {th("booked", "Booked")}
                {th("bookRate", "Leads → booked")}
                {th("shows", "Shows")}
                {th("adCostPerShow", "Cost / show")}
                <th style={{ ...th2, paddingRight: 18 }}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const dim = r.verdict.key === "early" || r.verdict.key === "noName";
                return (
                  <tr
                    key={`${r.ad_name}-${r.unattributed}`}
                    onClick={() => onDrill(r)}
                    style={{ borderTop: "0.5px solid #f0f0ee", cursor: "pointer", opacity: dim ? 0.6 : 1 }}
                  >
                    <td style={{ ...td2, paddingLeft: 18, whiteSpace: "normal", minWidth: 220, maxWidth: 380, fontWeight: 600, color: INK }}>
                      {r.unattributed ? "Website & untracked leads" : r.ad_name}
                      {r.name_collision && (
                        <span title="Possible renamed or reused ad name" style={{ marginLeft: 6, color: "#8a5a2b" }}>
                          <AlertTriangle className="inline h-3 w-3" />
                        </span>
                      )}
                      {r.unattributed && (
                        <div style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>No ad or campaign on the lead — not costed against ads and not counted in any city</div>
                      )}
                    </td>
                    <td style={td2}>{r.location ?? "—"}</td>
                    <td style={td2r}>{r.unattributed ? "—" : r.spend ? money(r.spend) : "—"}</td>
                    <td style={td2r}>{r.leads}</td>
                    <td style={td2}><PipelineBar p={r.pipeline} /></td>
                    <td style={td2r}>{moneyOrDash(r.costPerLead)}</td>
                    <td style={td2r}>{r.booked}</td>
                    <td style={td2r}>{pctOrDash(r.bookRate)}</td>
                    <td style={td2r}>{r.shows}{r.noshow > 0 && <span style={{ color: FAINT, fontWeight: 400 }}> · {r.noshow} no-show</span>}</td>
                    <td style={{ ...td2r, fontWeight: 600 }}>{moneyOrDash(r.adCostPerShow)}</td>
                    <td style={{ ...td2, paddingRight: 18 }}>
                      <Pill tone={TONE_FOR[r.verdict.key]}>{r.verdict.label}</Pill>
                    </td>
                  </tr>
                );
              })}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={11} style={{ ...td2, padding: 18, color: FAINT }}>No ads in this range yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Footnote>
          A show is any booking not marked no-show. Winning = cost per show at least 20% under the average shown above. Poor = 20% over. Too early = fewer than 3 shows.
          Not booking = 10+ leads, none booked, and the leads have been called. Not called yet = 10+ leads, none booked, most still to call. Ads are matched to leads by ad name. Website enquiries have no ad and sit outside the city figures.
        </Footnote>
      </div>
    </div>
  );
}
