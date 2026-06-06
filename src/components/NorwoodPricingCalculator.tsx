import { useState } from "react";

const COLORS = {
  line: "#e8e8e6",
  muted: "#6b6b6b",
  coral: "#f4522d",
};

type Row = {
  label: string;
  min: number;
  max: number;
  note?: string;
};

const ROWS: Row[] = [
  { label: "Norwood 2", min: 1500, max: 1500 },
  { label: "Norwood 3", min: 2000, max: 2000 },
  { label: "Norwood 3 Vertex", min: 2000, max: 3000 },
  { label: "Norwood 4", min: 3000, max: 4000 },
  { label: "Norwood 5", min: 4000, max: 4500 },
  { label: "Norwood 6", min: 4000, max: 5000, note: "Set expectations if pushing a Norwood 6–7" },
  { label: "Norwood 7", min: 6000, max: 10000, note: "Set patient expectations" },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const fmtGrafts = (min: number, max: number) =>
  min === max ? `${min.toLocaleString()} grafts` : `${min.toLocaleString()}–${max.toLocaleString()} grafts`;

export default function NorwoodPricingCalculator() {
  const [open, setOpen] = useState(false);
  const [pricePerGraft, setPricePerGraft] = useState<number>(5);

  return (
    <div style={{ padding: "14px 18px", borderTop: `0.5px solid ${COLORS.line}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          background: open ? "#111" : "#ffffff",
          color: open ? "#fff" : "#111",
          border: "1px solid #111",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        {open ? "Hide pricing calculator" : "💰 Pricing by Norwood"}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Price per graft input */}
          <div
            style={{
              background: "#fafaf9",
              border: `0.5px solid ${COLORS.line}`,
              borderRadius: 8,
              padding: 10,
            }}
          >
            <label
              style={{
                fontSize: 11,
                color: "#666",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                display: "block",
                marginBottom: 6,
              }}
            >
              Price per graft
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>$</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={Number.isFinite(pricePerGraft) ? pricePerGraft : 0}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPricePerGraft(Number.isFinite(v) ? v : 0);
                }}
                style={{
                  flex: 1,
                  border: `0.5px solid ${COLORS.line}`,
                  borderRadius: 6,
                  padding: "6px 8px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#111",
                  background: "#fff",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: COLORS.muted }}>/ graft</span>
            </div>
          </div>

          {/* Price rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ROWS.map((r) => {
              const lo = r.min * pricePerGraft;
              const hi = r.max * pricePerGraft;
              const priceText = lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
              return (
                <div
                  key={r.label}
                  style={{
                    background: "#fff",
                    border: `0.5px solid ${COLORS.line}`,
                    borderRadius: 8,
                    padding: "8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{r.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.coral, whiteSpace: "nowrap" }}>
                      {priceText}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{fmtGrafts(r.min, r.max)}</div>
                  {r.note && (
                    <div style={{ fontSize: 10, color: "#9a6b00", fontStyle: "italic", marginTop: 2 }}>
                      ⚠ {r.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 10, color: COLORS.muted, textAlign: "center" }}>
            Estimates only · price = grafts × $/graft
          </div>
        </div>
      )}
    </div>
  );
}
