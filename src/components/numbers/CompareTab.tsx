import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabourRow } from "@/lib/ad-spend.functions";
import type { CityStats } from "./model";
import { AMBER, CARD, FAINT, GREEN, INK, LABEL, MUTED, RED, money, moneyOrDash, oneDp, pctOrDash, rowStyle, td2, td2r, th2, th2r } from "./format";
import { Footnote, Note, SectionTitle, SplitBar, StatTile } from "./primitives";

const COLORS = ["#111111", "#2f6f4f", "#8a5a2b", "#3a5a9a", "#8a2b4a", "#6b6b6b"];

export type TrendPoint = Record<string, number | string>;

/**
 * Tab 2 — "Marketing vs labour".  For the selected city: what was spent on
 * ads, what was spent on reps, and what that comes to per showed appointment.
 * Then every city side by side, with "how hard" measures (rep hours and leads
 * needed per booking) so Byron can be compared with Melbourne at a glance.
 */
export function CompareTab({
  scope,
  cities,
  all,
  selected,
  onSelect,
  unallocated,
  countMyPay,
  trend,
}: {
  scope: CityStats;
  cities: CityStats[];
  all: CityStats;
  selected: string;
  onSelect: (city: string) => void;
  unallocated: LabourRow | null;
  countMyPay: boolean;
  trend: { locs: string[]; data: TrendPoint[] };
}) {
  const [showTrend, setShowTrend] = useState(false);
  const s = scope;
  const showingAll = !selected;
  const unallocCost = unallocated ? unallocated.hourly_cost + unallocated.bonus_cost : 0;

  const profitColor = !s.hoursOk ? INK : s.profit >= 0 ? GREEN : RED;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Marketing vs labour, side by side */}
      <div style={{ ...CARD, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <StatTile
            label="Marketing"
            value={s.spend ? money(s.spend) : "—"}
            sub={<>{moneyOrDash(s.adCostPerShow)} per showed · {pctOrDash(s.marketingShare)} of cost</>}
            title="Ad spend in this range."
          />
          <StatTile
            label="Labour"
            value={s.hoursOk ? money(s.labourCost) : "—"}
            sub={
              s.hoursOk
                ? <>{moneyOrDash(s.labourPerShow)} per showed · {oneDp(s.hours)} h · {money(s.bonusCost)} bonuses</>
                : "hours could not be calculated"
            }
            title="Rep hourly pay (hours from call timestamps × each rep's rate) plus booking bonuses."
          />
          <StatTile
            label="True cost per showed"
            value={moneyOrDash(s.trueCostPerShow)}
            sub={<>{s.hoursOk ? money(s.totalCost) : "—"} total ÷ {s.showed} showed</>}
            title="(Ad spend + labour) ÷ showed appointments."
          />
          <StatTile
            label="Profit"
            value={s.hoursOk ? money(s.profit) : "—"}
            accent={profitColor}
            sub={<>{s.revenue ? money(s.revenue) : "—"} revenue · cost {pctOrDash(s.costPct)} of it</>}
            title="Revenue recognised on shows delivered, minus ad spend and labour."
          />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: MUTED, marginBottom: 6 }}>
            <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: INK, marginRight: 6 }} />Marketing {pctOrDash(s.marketingShare)}</span>
            <span>Labour {s.marketingShare === null ? "—" : pctOrDash(1 - s.marketingShare)}<span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: "#d8c6a8", marginLeft: 6 }} /></span>
          </div>
          <SplitBar share={s.hoursOk ? s.marketingShare : null} height={12} title="Share of total cost: black is ads, tan is rep pay and bonuses." />
        </div>
        {!countMyPay && (
          <Note tone="grey">Your own pay is excluded from labour on every figure here.</Note>
        )}
        {showingAll && unallocated && unallocCost > 0 && (
          <Note tone="grey">
            Includes {money(unallocCost)} of labour ({oneDp(unallocated.hours)} h) on leads with no campaign, which can't be tied to a city.
          </Note>
        )}
        {s.hoursMissingRate > 0 && (
          <Note>{oneDp(s.hoursMissingRate)} hours are from a rep with no rate set — labour is understated.</Note>
        )}
        {s.hoursFallback > 0 && (
          <Note>{oneDp(s.hoursFallback)} hours were split by leads contacted rather than call time.</Note>
        )}
        {s.bonusMissingRate > 0 && (
          <Note>{s.bonusMissingRate} bookings have no bonus rate set.</Note>
        )}
      </div>

      {/* City comparison */}
      <div style={{ ...CARD, padding: 0 }}>
        <SectionTitle right="Higher hours or leads per booking = harder to convert">Is one city harder than another?</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th2, paddingLeft: 18 }}>City</th>
                <th style={th2r}>Marketing</th>
                <th style={th2r}>Labour</th>
                <th style={{ ...th2, minWidth: 120 }}>Split</th>
                <th style={th2r}>Ads / showed</th>
                <th style={th2r}>Labour / showed</th>
                <th style={th2r}>True cost / showed</th>
                <th style={th2r}>Rep hours / booking</th>
                <th style={th2r}>Leads / booking</th>
                <th style={{ ...th2r, paddingRight: 18 }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const active = c.key.toLowerCase() === selected.toLowerCase();
                return (
                  <tr key={c.key} onClick={() => onSelect(active ? "" : c.key)} style={rowStyle(active, true)}>
                    <td style={{ ...td2, paddingLeft: 18, fontWeight: 600, color: INK }}>{c.key}</td>
                    <td style={td2r}>{c.spend ? money(c.spend) : "—"}</td>
                    <td style={td2r}>{c.hoursOk ? money(c.labourCost) : "—"}</td>
                    <td style={{ ...td2, minWidth: 120 }}>
                      <SplitBar share={c.hoursOk ? c.marketingShare : null} title={`Marketing ${pctOrDash(c.marketingShare)}`} />
                    </td>
                    <td style={td2r}>{moneyOrDash(c.adCostPerShow)}</td>
                    <td style={td2r}>{moneyOrDash(c.labourPerShow)}</td>
                    <td style={{ ...td2r, fontWeight: 600 }}>{moneyOrDash(c.trueCostPerShow)}</td>
                    <td style={td2r}>{oneDp(c.hoursPerBooking)}</td>
                    <td style={td2r}>{oneDp(c.leadsPerBooking)}</td>
                    <td style={{ ...td2r, paddingRight: 18, fontWeight: 600, color: !c.hoursOk ? INK : c.profit >= 0 ? GREEN : RED }}>
                      {c.hoursOk ? money(c.profit) : "—"}
                    </td>
                  </tr>
                );
              })}
              {cities.length === 0 && (
                <tr><td colSpan={10} style={{ ...td2, padding: 18, color: FAINT }}>Nothing in this range yet.</td></tr>
              )}
              {cities.length > 1 && (
                <tr style={{ borderTop: "0.5px solid #111", fontWeight: 600 }}>
                  <td style={{ ...td2, paddingLeft: 18 }}>All cities</td>
                  <td style={td2r}>{money(all.spend)}</td>
                  <td style={td2r}>{all.hoursOk ? money(all.labourCost) : "—"}</td>
                  <td style={{ ...td2, minWidth: 120 }}><SplitBar share={all.hoursOk ? all.marketingShare : null} /></td>
                  <td style={td2r}>{moneyOrDash(all.adCostPerShow)}</td>
                  <td style={td2r}>{moneyOrDash(all.labourPerShow)}</td>
                  <td style={td2r}>{moneyOrDash(all.trueCostPerShow)}</td>
                  <td style={td2r}>{oneDp(all.hoursPerBooking)}</td>
                  <td style={td2r}>{oneDp(all.leadsPerBooking)}</td>
                  <td style={{ ...td2r, paddingRight: 18, color: !all.hoursOk ? INK : all.profit >= 0 ? GREEN : RED }}>
                    {all.hoursOk ? money(all.profit) : "—"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Footnote>
          Labour is rep hours (from call timestamps) × each rep's rate, plus booking bonuses, split across cities by talk time.
          A city that needs more rep hours or more leads for every booking is harder to convert, whatever the ad cost says.
          {all.hoursMissingRate > 0 ? <span style={{ color: AMBER }}> Some hours have no rate set, so labour is understated.</span> : null}
        </Footnote>
      </div>

      {/* Monthly trend, tucked away */}
      <div style={{ ...CARD, padding: 0 }}>
        <button
          onClick={() => setShowTrend((v) => !v)}
          style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>Trend by month</span>
          <span style={{ ...LABEL }}>{showTrend ? "Hide" : "Show"}</span>
        </button>
        {showTrend && (
          <div style={{ padding: "0 18px 16px" }}>
            {trend.data.length === 0 ? (
              <div style={{ fontSize: 13, color: MUTED }}>No spend and show data to chart yet.</div>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={trend.data}>
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
                    {trend.locs.map((loc, i) => (
                      <Line key={loc} yAxisId="cost" type="monotone" dataKey={loc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot connectNulls />
                    ))}
                    {trend.locs.map((loc, i) => (
                      <Line key={`${loc}-pct`} yAxisId="pct" type="monotone" dataKey={`${loc} total %`} stroke={COLORS[i % COLORS.length]} strokeDasharray="4 3" strokeWidth={1.5} dot={false} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
              Solid lines: ad cost per showed. Dashed lines: total cost (ads + rep pay + bonuses) as a share of revenue.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
