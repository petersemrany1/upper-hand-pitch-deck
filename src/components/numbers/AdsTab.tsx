import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdPerformanceRow } from "@/lib/ad-spend.functions";
import { pipelineSentence, type AdStats, type AdVerdictKey, type Pipeline } from "./model";
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

// "Called": how much of an ad's leads have had at least one call, as one
// number. An ad with lots of leads and no bookings is only bad once this is
// high; when it is low the leads are simply still in the queue.
function CalledCell({ p }: { p: Pipeline | null }) {
  if (!p || p.total === 0) return <td style={td2r}><span style={{ color: FAINT }}>—</span></td>;
  const called = p.total - p.toCall;
  const share = called / p.total;
  const tone = share < 0.5 ? { color: "#b03030", background: "#fdeeee" } : share < 0.8 ? { color: "#8a5a2b", background: "#fdf5e8" } : { color: INK };
  return (
    <td style={{ ...td2r, ...tone, fontWeight: 600 }} title={`${called} of ${p.total} called · ${pipelineSentence(p)}`}>
      {Math.round(share * 100)}%<span style={{ fontWeight: 400, color: share < 0.8 ? tone.color : FAINT }}> · {called} of {p.total}</span>
    </td>
  );
}

type SortKey = "verdict" | "spend" | "leads" | "called" | "costPerLead" | "booked" | "bookRate" | "shows" | "adCostPerShow";

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
        case "called": return r.pipeline && r.pipeline.total ? (r.pipeline.total - r.pipeline.toCall) / r.pipeline.total : null;
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
                {th("called", "Called")}
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
                    <CalledCell p={r.pipeline} />
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
