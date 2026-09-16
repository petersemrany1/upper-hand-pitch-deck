import type { CityStats } from "./model";
import { BIG, CARD, FAINT, INK, LABEL, MUTED, money, moneyOrDash, oneDp } from "./format";

// The three headline costs, in plain language: what a lead costs in ad money,
// what it costs in rep time, and what it costs all in. Deliberately simple —
// everything else on the page is detail underneath these.

const CSS = `
.cpl-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:820px){.cpl-strip{grid-template-columns:1fr}}
`;

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ ...CARD, padding: 18, background: accent ? "#111" : "#fff", border: accent ? "0.5px solid #111" : CARD.border }}>
      <div style={{ ...LABEL, color: accent ? "rgba(255,255,255,0.65)" : FAINT }}>{label}</div>
      <div style={{ ...BIG, fontSize: 34, color: accent ? "#fff" : INK }}>{value}</div>
      <div style={{ fontSize: 12, color: accent ? "rgba(255,255,255,0.7)" : MUTED, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export function CostPerLeadStrip({ scope, city, loading }: { scope: CityStats; city: string; loading: boolean }) {
  const leads = scope.leads;
  const noLeads = leads === 0;
  const noHours = !scope.hoursOk;

  // Anything that makes these figures less than exact, said plainly.
  const caveats: string[] = [];
  if (noLeads) caveats.push("No leads in this range, so nothing can be worked out per lead.");
  if (noHours && !noLeads) caveats.push("No rep hours recorded for this range, so the labour figures are blank.");
  if (scope.hoursMissingRate > 0)
    caveats.push(`${oneDp(scope.hoursMissingRate)} rep hours have no pay rate saved, so they cost nothing here — the real labour figure is higher.`);
  if (scope.hoursFallback > 0)
    caveats.push(`${oneDp(scope.hoursFallback)} rep hours were estimated from call times rather than entered by hand.`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>What a lead is costing you</div>
        <div style={{ fontSize: 12.5, color: MUTED }}>
          {city} · {leads.toLocaleString("en-AU")} leads{loading ? " · updating…" : ""}
        </div>
      </div>

      <div className="cpl-strip">
        <Tile
          label="Marketing per lead"
          value={moneyOrDash(scope.costPerLead)}
          sub={`${money(scope.spend)} of ad spend ÷ ${leads.toLocaleString("en-AU")} leads`}
        />
        <Tile
          label="Labour per lead"
          value={moneyOrDash(scope.labourPerLead)}
          sub={
            noHours
              ? "No rep hours recorded for this range"
              : `${money(scope.labourCost)} in wages and booking bonuses ÷ ${leads.toLocaleString("en-AU")} leads`
          }
        />
        <Tile
          accent
          label="Marketing + labour per lead"
          value={moneyOrDash(scope.totalCostPerLead)}
          sub={
            noHours
              ? "Needs rep hours to work out"
              : `${money(scope.totalCost)} all in ÷ ${leads.toLocaleString("en-AU")} leads`
          }
        />
      </div>

      {caveats.length > 0 && (
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          {caveats.map((c) => (
            <div key={c}>· {c}</div>
          ))}
        </div>
      )}
    </div>
  );
}
