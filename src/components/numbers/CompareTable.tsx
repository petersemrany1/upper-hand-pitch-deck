import type { CityStats, Diagnosis } from "./model";
import { compareToAvg, oneIn } from "./model";
import { CARD, FAINT, GREEN, INK, MUTED, RED, TONE, money, moneyOrDash, oneDp, pctOrDash, rowStyle, td2, td2r, th2, th2r } from "./format";
import { Dot } from "./primitives";

/**
 * Every city on one table, worst first, with the same verdict as the rail.
 * Cells that are well off the average are tinted so the problem column
 * stands out without reading.
 */
export function CompareTable({
  rows,
  all,
  selected,
  onSelect,
}: {
  rows: { city: CityStats; diagnosis: Diagnosis }[];
  all: CityStats;
  selected: string;
  onSelect: (city: string) => void;
}) {
  const tint = (value: number | null, avg: number | null, lowerIsBetter: boolean) => {
    const b = compareToAvg(value, avg, lowerIsBetter);
    return b.tone === "red" || b.tone === "amber" ? { background: TONE[b.tone].bg, color: TONE[b.tone].text, fontWeight: 600 } : b.tone === "green" ? { color: GREEN } : {};
  };
  const order: Record<Diagnosis["key"], number> = { mixed: 0, marketing: 1, labour: 1, shows: 1, healthy: 2, early: 3, nodata: 4 };
  const sorted = [...rows].sort((a, b) => {
    const d = order[a.diagnosis.key] - order[b.diagnosis.key];
    if (d !== 0) return d;
    return (b.city.trueCostPerShow ?? b.city.adCostPerShow ?? -1) - (a.city.trueCostPerShow ?? a.city.adCostPerShow ?? -1);
  });

  return (
    <div style={{ ...CARD, padding: 0 }}>
      <div style={{ padding: "14px 18px 6px", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>All cities, worst first</div>
        <div style={{ fontSize: 12, color: MUTED }}>Tinted cells are well off the account average</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th2, paddingLeft: 18 }}>City</th>
              <th style={th2}>Verdict</th>
              <th style={th2r}>Leads</th>
              <th style={th2r}>Cost / lead</th>
              <th style={th2r}>Book rate</th>
              <th style={th2r}>Show rate</th>
              <th style={th2r}>Cost / showed</th>
              <th style={th2r}>Marketing</th>
              <th style={th2r}>Labour</th>
              <th style={th2r}>Hours / booking</th>
              <th style={th2r}>True cost / showed</th>
              <th style={{ ...th2r, paddingRight: 18 }}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ city: c, diagnosis: d }) => {
              const active = c.key.toLowerCase() === selected.toLowerCase();
              return (
                <tr key={c.key} onClick={() => onSelect(active ? "" : c.key)} style={rowStyle(active, true)}>
                  <td style={{ ...td2, paddingLeft: 18, fontWeight: 600, color: INK }}>{c.key}</td>
                  <td style={td2}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: TONE[d.tone].text, fontWeight: 600, fontSize: 12.5 }}>
                      <Dot tone={d.tone} /> {d.short}
                    </span>
                  </td>
                  <td style={td2r}>{c.leads || "—"}</td>
                  <td style={{ ...td2r, ...tint(c.costPerLead, all.costPerLead, true) }}>{moneyOrDash(c.costPerLead)}</td>
                  <td style={{ ...td2r, ...tint(c.bookRate, all.bookRate, false) }}>
                    {pctOrDash(c.bookRate)}<span style={{ color: FAINT, fontWeight: 400 }}> · {oneIn(c.bookRate)}</span>
                  </td>
                  <td style={{ ...td2r, ...tint(c.showed + c.noshow >= 5 ? c.showRate : null, all.showRate, false) }}>{pctOrDash(c.showRate)}</td>
                  <td style={{ ...td2r, ...tint(c.adCostPerShow, all.adCostPerShow, true) }}>{moneyOrDash(c.adCostPerShow)}</td>
                  <td style={td2r}>{c.spend ? money(c.spend) : "—"}</td>
                  <td style={td2r}>{c.hoursOk ? money(c.labourCost) : "—"}</td>
                  <td style={{ ...td2r, ...tint(c.hoursPerBooking, all.hoursPerBooking, true) }}>{oneDp(c.hoursPerBooking)}</td>
                  <td style={{ ...td2r, fontWeight: 600, ...tint(c.trueCostPerShow, all.trueCostPerShow, true) }}>{moneyOrDash(c.trueCostPerShow)}</td>
                  <td style={{ ...td2r, paddingRight: 18, fontWeight: 600, color: !c.hoursOk ? INK : c.profit >= 0 ? GREEN : RED }}>{c.hoursOk ? money(c.profit) : "—"}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={12} style={{ ...td2, padding: 18, color: FAINT }}>Nothing in this range yet.</td></tr>
            )}
            {sorted.length > 1 && (
              <tr style={{ borderTop: "0.5px solid #111", fontWeight: 600 }}>
                <td style={{ ...td2, paddingLeft: 18 }}>Average</td>
                <td style={td2} />
                <td style={td2r}>{all.leads}</td>
                <td style={td2r}>{moneyOrDash(all.costPerLead)}</td>
                <td style={td2r}>{pctOrDash(all.bookRate)}<span style={{ color: FAINT, fontWeight: 400 }}> · {oneIn(all.bookRate)}</span></td>
                <td style={td2r}>{pctOrDash(all.showRate)}</td>
                <td style={td2r}>{moneyOrDash(all.adCostPerShow)}</td>
                <td style={td2r}>{money(all.spend)}</td>
                <td style={td2r}>{all.hoursOk ? money(all.labourCost) : "—"}</td>
                <td style={td2r}>{oneDp(all.hoursPerBooking)}</td>
                <td style={td2r}>{moneyOrDash(all.trueCostPerShow)}</td>
                <td style={{ ...td2r, paddingRight: 18, color: !all.hoursOk ? INK : all.profit >= 0 ? GREEN : RED }}>{all.hoursOk ? money(all.profit) : "—"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ padding: "10px 18px 14px", fontSize: 11.5, color: FAINT, lineHeight: 1.5 }}>
        Marketing = ad spend. Labour = rep hours × rate + booking bonuses. Verdict: Marketing when leads cost 30%+ more than average; Labour when reps need 30%+ more hours or leads per booking; No-shows when the show rate is 20%+ under average; Too early under 10 leads.
      </div>
    </div>
  );
}
