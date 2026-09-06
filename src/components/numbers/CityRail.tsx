import type { CityStats, Diagnosis } from "./model";
import { CARD, FAINT, INK, LABEL, MUTED, TONE, moneyOrDash } from "./format";
import { Dot } from "./primitives";

export type RailItem = { city: CityStats; diagnosis: Diagnosis | null };

/**
 * Master list of cities. One glance tells you which city has a problem and
 * what kind; one click opens it. "All cities" sits at the top.
 */
export function CityRail({
  all,
  items,
  selected,
  onSelect,
}: {
  all: CityStats;
  items: RailItem[];
  selected: string;
  onSelect: (city: string) => void;
}) {
  const row = (key: string, label: string, sub: string, diagnosis: Diagnosis | null, value: string) => {
    const active = key.toLowerCase() === selected.toLowerCase();
    const tone = diagnosis?.tone ?? "grey";
    return (
      <button
        key={key || "__all"}
        onClick={() => onSelect(key)}
        aria-current={active ? "true" : undefined}
        className="numbers-rail-item"
        style={{
          display: "grid",
          gridTemplateColumns: "10px 1fr auto",
          alignItems: "center",
          columnGap: 10,
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 10,
          border: "none",
          cursor: "pointer",
          background: active ? INK : "transparent",
          color: active ? "#fff" : INK,
        }}
      >
        <Dot tone={tone} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          <span style={{ display: "block", fontSize: 11.5, color: active ? "rgba(255,255,255,0.7)" : diagnosis ? TONE[tone].text : MUTED, whiteSpace: "nowrap" }}>
            {sub}
          </span>
        </span>
        <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: active ? "rgba(255,255,255,0.85)" : MUTED, whiteSpace: "nowrap" }}>
          {value}
        </span>
      </button>
    );
  };

  return (
    <div style={{ ...CARD, padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ ...LABEL, padding: "6px 12px 4px" }}>Cities</div>
      <div className="numbers-rail-list" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {row("", "All cities", `${all.leads} leads · ${all.showed} showed`, null, moneyOrDash(all.trueCostPerShow ?? all.adCostPerShow))}
        <div className="numbers-rail-divider" style={{ height: 1, background: "#f0f0ee", margin: "4px 8px" }} />
        {items.map(({ city, diagnosis }) =>
          row(city.key, city.key, diagnosis?.short ?? "—", diagnosis, moneyOrDash(city.trueCostPerShow ?? city.adCostPerShow)),
        )}
      </div>
      {items.length === 0 && <div style={{ fontSize: 12, color: FAINT, padding: "8px 12px" }}>No cities in this range.</div>}
      <div className="numbers-rail-note" style={{ fontSize: 10.5, color: FAINT, padding: "8px 12px 4px", lineHeight: 1.4 }}>
        Figure is true cost per showed appointment (ads + labour). Status reads each city against the account average.
      </div>
    </div>
  );
}
