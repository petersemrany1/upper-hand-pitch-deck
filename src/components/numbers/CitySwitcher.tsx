import { INK, MUTED } from "./format";

/**
 * The one control the owner reaches for most: flip between cities. Big
 * segmented buttons rather than a dropdown, so it's one click, always visible.
 */
export function CitySwitcher({
  cities,
  selected,
  onSelect,
}: {
  cities: string[];
  selected: string;
  onSelect: (city: string) => void;
}) {
  const options = ["", ...cities];
  return (
    <div
      role="tablist"
      aria-label="City"
      style={{ display: "flex", flexWrap: "wrap", gap: 6, background: "#eeeeec", borderRadius: 12, padding: 4 }}
    >
      {options.map((c) => {
        const active = c.toLowerCase() === selected.toLowerCase();
        return (
          <button
            key={c || "__all"}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c)}
            style={{
              fontSize: 14,
              padding: "9px 18px",
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
              background: active ? "#fff" : "transparent",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              fontWeight: active ? 600 : 500,
              color: active ? INK : MUTED,
            }}
          >
            {c || "All cities"}
          </button>
        );
      })}
    </div>
  );
}
