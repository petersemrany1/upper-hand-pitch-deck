import type { CityStats } from "./model";
import { CARD, FAINT, INK, MUTED, moneyOrDash, money, pctOrDash, rowStyle, td2, td2r, th2, th2r } from "./format";
import { Footnote, Note, SectionTitle, StatTile, TileRow } from "./primitives";

/**
 * Tab 1 — "What do leads cost?"  Cost per lead, how many leads turn into a
 * booked appointment, and what a showed appointment costs, for the selected
 * city. Below it, every city side by side so the switch is one click.
 */
export function FunnelTab({
  scope,
  cities,
  all,
  selected,
  onSelect,
}: {
  scope: CityStats;
  cities: CityStats[];
  all: CityStats;
  selected: string;
  onSelect: (city: string) => void;
}) {
  const s = scope;
  const unresolvedShare = s.booked ? s.needsOutcome / s.booked : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TileRow>
        <StatTile
          label="Cost per lead"
          value={moneyOrDash(s.costPerLead)}
          sub={`${money(s.spend)} ad spend · ${s.leads} leads`}
          title="Ad spend ÷ leads that came in from ads in this range."
        />
        <StatTile
          label="Leads → booked"
          value={pctOrDash(s.bookRate)}
          sub={`${s.booked} of ${s.leads} leads booked an appointment`}
          title="Share of leads that booked a consult (excludes disqualified)."
        />
        <StatTile
          label="Cost per booked"
          value={moneyOrDash(s.costPerBooked)}
          sub={`${s.upcoming} still upcoming`}
          title="Ad spend ÷ booked appointments."
        />
        <StatTile
          label="Cost per showed"
          value={moneyOrDash(s.adCostPerShow)}
          sub={`${s.showed} showed · ${s.noshow} no-show · show rate ${pctOrDash(s.showRate)}`}
          title="Ad spend ÷ appointments that actually showed up. Ads only — see Marketing vs labour for the true figure with rep pay included."
        />
      </TileRow>

      {(unresolvedShare > 0.1 || s.needsOutcome > 0) && (
        <Note>
          {s.needsOutcome} booked appointment{s.needsOutcome === 1 ? "" : "s"} still need{s.needsOutcome === 1 ? "s" : ""} an outcome marked — cost per showed is overstated until they are.
        </Note>
      )}

      <div style={{ ...CARD, padding: 0 }}>
        <SectionTitle right="Click a city to focus on it">City by city</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th2, paddingLeft: 18 }}>City</th>
                <th style={th2r}>Ad spend</th>
                <th style={th2r}>Leads</th>
                <th style={th2r}>Cost / lead</th>
                <th style={th2r}>Booked</th>
                <th style={th2r}>Leads → booked</th>
                <th style={th2r}>Cost / booked</th>
                <th style={th2r}>Showed</th>
                <th style={th2r}>Show rate</th>
                <th style={{ ...th2r, paddingRight: 18 }}>Cost / showed</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const active = c.key.toLowerCase() === selected.toLowerCase();
                return (
                  <tr key={c.key} onClick={() => onSelect(active ? "" : c.key)} style={rowStyle(active, true)}>
                    <td style={{ ...td2, paddingLeft: 18, fontWeight: 600, color: INK }}>{c.key}</td>
                    <td style={td2r}>{c.spend ? money(c.spend) : "—"}</td>
                    <td style={td2r}>{c.leads || "—"}</td>
                    <td style={{ ...td2r, fontWeight: 600 }}>{moneyOrDash(c.costPerLead)}</td>
                    <td style={td2r}>{c.booked || "—"}</td>
                    <td style={{ ...td2r, fontWeight: 600 }}>{pctOrDash(c.bookRate)}</td>
                    <td style={td2r}>{moneyOrDash(c.costPerBooked)}</td>
                    <td style={td2r}>{c.showed || "—"}</td>
                    <td style={td2r}>{pctOrDash(c.showRate)}</td>
                    <td style={{ ...td2r, paddingRight: 18, fontWeight: 600 }}>{moneyOrDash(c.adCostPerShow)}</td>
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
                  <td style={td2r}>{all.leads}</td>
                  <td style={td2r}>{moneyOrDash(all.costPerLead)}</td>
                  <td style={td2r}>{all.booked}</td>
                  <td style={td2r}>{pctOrDash(all.bookRate)}</td>
                  <td style={td2r}>{moneyOrDash(all.costPerBooked)}</td>
                  <td style={td2r}>{all.showed}</td>
                  <td style={td2r}>{pctOrDash(all.showRate)}</td>
                  <td style={{ ...td2r, paddingRight: 18 }}>{moneyOrDash(all.adCostPerShow)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Footnote>
          Ad spend only on this tab. Leads are counted by the date they enquired. Show rate is showed ÷ (showed + no-show); upcoming appointments are not counted either way.
          <span style={{ color: MUTED }}> Disqualified leads are excluded from booked.</span>
        </Footnote>
      </div>
    </div>
  );
}
