import type { CityStats } from "./model";
import { BIG, CARD, FAINT, INK, LABEL, MUTED, money, moneyOrDash, oneDp } from "./format";

// The three headline costs, in plain language: what a show (a patient who
// actually turned up) costs in ad money, what it costs in rep time, and what it
// costs all in. Everything else on the page is detail underneath these.

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
  const shows = scope.showed;
  const noShowsYet = shows === 0;
  const noHours = !scope.hoursOk;
  const n = (x: number) => x.toLocaleString("en-AU");

  // Anything that makes these figures less than exact, said plainly.
  const caveats: string[] = [];
  if (noShowsYet) caveats.push("Nobody has turned up in this range yet, so nothing can be worked out per show.");
  if (noHours && !noShowsYet) caveats.push("No rep hours recorded for this range, so the labour figures are blank.");
  if (scope.hoursMissingRate > 0)
    caveats.push(`${oneDp(scope.hoursMissingRate)} rep hours have no pay rate saved, so they cost nothing here — the real labour figure is higher.`);
  if (scope.hoursFallback > 0)
    caveats.push(`${oneDp(scope.hoursFallback)} rep hours were estimated from call times rather than entered by hand.`);
  if (scope.upcoming > 0)
    caveats.push(`${n(scope.upcoming)} booked consults haven't happened yet — their cost is already counted, but they aren't shows yet, so these figures read high.`);
  if (scope.needsOutcome > 0)
    caveats.push(`${n(scope.needsOutcome)} past consults have no outcome saved, so they don't count as shows yet.`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>What a show is costing you</div>
        <div style={{ fontSize: 12.5, color: MUTED }}>
          {city} · {n(scope.leads)} leads → {n(scope.booked)} booked → {n(shows)} showed{loading ? " · updating…" : ""}
        </div>
      </div>

      <div className="cpl-strip">
        <Tile
          label="Marketing per show"
          value={moneyOrDash(scope.adCostPerShow)}
          sub={`${money(scope.spend)} of ad spend ÷ ${n(shows)} shows`}
        />
        <Tile
          label="Labour per show"
          value={moneyOrDash(scope.labourPerShow)}
          sub={
            noHours
              ? "No rep hours recorded for this range"
              : `${money(scope.labourCost)} in wages and booking bonuses ÷ ${n(shows)} shows`
          }
        />
        <Tile
          accent
          label="Marketing + labour per show"
          value={moneyOrDash(scope.trueCostPerShow)}
          sub={noHours ? "Needs rep hours to work out" : `${money(scope.totalCost)} all in ÷ ${n(shows)} shows`}
        />
      </div>

      <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
        <div>
          · Per lead, for reference: {moneyOrDash(scope.costPerLead)} marketing, {moneyOrDash(scope.labourPerLead)} labour,{" "}
          {moneyOrDash(scope.totalCostPerLead)} all in.
        </div>
        <div>
          · Per booking: {moneyOrDash(scope.costPerBooked)} marketing
          {scope.hoursOk && scope.hoursPerBooking !== null
            ? ` · ${oneDp(scope.hoursPerBooking)} rep hours per booking`
            : ""}
          .
        </div>
        {caveats.map((c) => (
          <div key={c}>· {c}</div>
        ))}
      </div>
    </div>
  );
}
