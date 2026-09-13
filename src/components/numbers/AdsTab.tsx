import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { AdPerformanceRow } from "@/lib/ad-spend.functions";
import type { AdStats, AdVerdictKey } from "./model";
import { CARD, FAINT, INK, MUTED, type Tone, money, moneyOrDash, pctOrDash, td2, td2r, th2, th2r } from "./format";
import { Footnote, Pill, SectionTitle } from "./primitives";

const TONE_FOR: Record<AdVerdictKey, Tone> = {
  winning: "green",
  ok: "amber",
  poor: "red",
  notBooking: "red",
  early: "grey",
  noName: "grey",
};

type SortKey = "verdict" | "spend" | "leads" | "costPerLead" | "booked" | "bookRate" | "showed" | "adCostPerShow";

/**
 * Tab 3 — "Which ads are working?"  One plain verdict per ad, best first.
 * Judged on what a showed appointment costs against the average of the ads
 * on screen.
 */
export function AdsTab({
  rows,
  avgCostPerShow,
  loading,
  scopeLabel,
  onDrill,
}: {
  rows: AdStats[];
  avgCostPerShow: number | null;
  loading: boolean;
  scopeLabel: string;
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
        case "showed": return r.showed;
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
    const c: Record<AdVerdictKey, number> = { winning: 0, ok: 0, poor: 0, notBooking: 0, early: 0, noName: 0 };
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
      <div style={{ ...CARD, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <Pill tone="green">{counts.winning} winning</Pill>
        <Pill tone="amber">{counts.ok} average</Pill>
        <Pill tone="red">{counts.poor + counts.notBooking} poor</Pill>
        <Pill tone="grey">{counts.early} too early</Pill>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: MUTED }}>
          {scopeLabel} · average cost per showed {moneyOrDash(avgCostPerShow)}
        </div>
      </div>

      <div style={{ ...CARD, padding: 0 }}>
        <SectionTitle right="Click an ad to see its leads">Ads, best first</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {th("verdict", "Ad", "left", { paddingLeft: 18 })}
                <th style={th2}>City</th>
                {th("spend", "Spend")}
                {th("leads", "Leads")}
                {th("costPerLead", "Cost / lead")}
                {th("booked", "Booked")}
                {th("bookRate", "Leads → booked")}
                {th("showed", "Showed")}
                {th("adCostPerShow", "Cost / showed")}
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
                    <td style={td2r}>{moneyOrDash(r.costPerLead)}</td>
                    <td style={td2r}>{r.booked}</td>
                    <td style={td2r}>{pctOrDash(r.bookRate)}</td>
                    <td style={td2r}>{r.showed}</td>
                    <td style={{ ...td2r, fontWeight: 600 }}>{moneyOrDash(r.adCostPerShow)}</td>
                    <td style={{ ...td2, paddingRight: 18 }}>
                      <Pill tone={TONE_FOR[r.verdict.key]}>{r.verdict.label}</Pill>
                    </td>
                  </tr>
                );
              })}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={10} style={{ ...td2, padding: 18, color: FAINT }}>No ads in this range yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Footnote>
          Winning = cost per showed at least 20% under the average shown above. Poor = 20% over. Too early = fewer than 3 showed appointments.
          Not booking = 10+ leads and not one booking. Ads are matched to leads by ad name. Website enquiries have no ad and sit outside the city figures.
        </Footnote>
      </div>
    </div>
  );
}
