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
  { label: "Norwood 5", min: 4000, max: 5000 },
  { label: "Norwood 6", min: 5000, max: 6000, note: "Set expectations if pushing 6–7" },
  { label: "Norwood 7", min: 6000, max: 8000, note: "Set patient expectations" },
];

const NITAI_PRICES: Record<string, { min: number; max: number }> = {
  "Norwood 2": { min: 8000, max: 10000 },
  "Norwood 3": { min: 10000, max: 13000 },
  "Norwood 3 Vertex": { min: 10000, max: 15000 },
  "Norwood 4": { min: 12000, max: 15000 },
  "Norwood 5": { min: 13000, max: 16000 },
  "Norwood 6": { min: 15000, max: 18000 },
  "Norwood 7": { min: 20000, max: 24000 },
};

const BIJAN_PRICES: Record<string, { min: number; max: number }> = {
  "Norwood 2": { min: 6000, max: 8500 },
  "Norwood 3": { min: 6500, max: 9500 },
  "Norwood 3 Vertex": { min: 6500, max: 9500 },
  "Norwood 4": { min: 7500, max: 10000 },
  "Norwood 5": { min: 8000, max: 11000 },
  "Norwood 6": { min: 14000, max: 16000 },
  "Norwood 7": { min: 17000, max: 20000 },
};

const BYRON_PRICES: Record<string, { min: number; max: number }> = {
  "Norwood 2": { min: 7500, max: 11000 },
  "Norwood 3": { min: 10000, max: 13000 },
  "Norwood 3 Vertex": { min: 10000, max: 14000 },
  "Norwood 4": { min: 12000, max: 16000 },
  "Norwood 5": { min: 15000, max: 18000 },
  "Norwood 6": { min: 18000, max: 22000 },
  "Norwood 7": { min: 22000, max: 28000 },
};

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const fmtGrafts = (min: number, max: number) =>
  min === max ? `${min.toLocaleString()} grafts` : `${min.toLocaleString()}–${max.toLocaleString()} grafts`;

// Shailandra 5-year finance plan brackets (always use 5-year)
const FINANCE_BRACKETS: { min: number; max: number; wMin: number; wMax: number }[] = [
  { min: 8000, max: 12000, wMin: 41, wMax: 62 },
  { min: 13000, max: 16000, wMin: 67, wMax: 82 },
  { min: 17000, max: 20000, wMin: 88, wMax: 103 },
  { min: 21000, max: 25000, wMin: 108, wMax: 128 },
  { min: 26000, max: 30000, wMin: 134, wMax: 154 },
];

function financeWeeklyFor(price: number): number | null {
  for (const b of FINANCE_BRACKETS) {
    if (price >= b.min && price <= b.max) {
      // linear interpolate within the bracket
      if (b.max === b.min) return b.wMin;
      const t = (price - b.min) / (b.max - b.min);
      return Math.round(b.wMin + t * (b.wMax - b.wMin));
    }
  }
  return null;
}

function financeWeeklyText(lo: number, hi: number): string | null {
  const wLo = financeWeeklyFor(lo);
  const wHi = financeWeeklyFor(hi);
  if (wLo == null && wHi == null) return null;
  if (wLo != null && wHi != null) {
    return wLo === wHi
      ? `≈ $${wLo}/week on 5-yr finance`
      : `≈ $${wLo} – $${wHi}/week on 5-yr finance`;
  }
  const w = (wLo ?? wHi) as number;
  return `≈ $${w}/week on 5-yr finance (partial range)`;
}

export default function NorwoodPricingCalculator() {
  const [open, setOpen] = useState(false);
  const [clinic, setClinic] = useState<"nitai" | "byron" | "bijan">("nitai");
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
          {/* Clinic selector */}
          <div style={{ display: "flex", gap: 6 }}>
            {(["nitai", "byron", "bijan"] as const).map((c) => {
              const active = clinic === c;
              return (
                <button
                  key={c}
                  onClick={() => setClinic(c)}
                  style={{
                    flex: 1,
                    background: active ? "#111" : "#fff",
                    color: active ? "#fff" : "#111",
                    border: "1px solid #111",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 12px",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {c === "nitai" ? "Nitai" : c === "byron" ? "Byron" : "Bijan"}
                </button>
              );
            })}
          </div>

          {(clinic === "nitai" || clinic === "bijan" || clinic === "byron") && (
            <div
              style={{
                fontSize: 11,
                color: COLORS.muted,
                background: "#fafaf9",
                border: `0.5px solid ${COLORS.line}`,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {clinic === "nitai" ? "Nitai" : clinic === "bijan" ? "Bijan" : "Byron"} charges a fixed fee per procedure, not per graft
            </div>
          )}

          {clinic === "byron" && (
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
          )}

          {/* Price rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ROWS.map((r) => {
              let lo: number;
              let hi: number;
              if (clinic === "nitai") {
                const np = NITAI_PRICES[r.label];
                lo = np.min;
                hi = np.max;
              } else if (clinic === "bijan") {
                const bp = BIJAN_PRICES[r.label];
                lo = bp.min;
                hi = bp.max;
              } else if (clinic === "byron") {
                const byp = BYRON_PRICES[r.label];
                lo = byp.min;
                hi = byp.max;
              } else {
                lo = r.min * pricePerGraft;
                hi = r.max * pricePerGraft;
              }
              const priceText = lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
              const weeklyLo = lo / 260;
              const weeklyHi = hi / 260;
              const weeklyText =
                lo === hi
                  ? `≈ ${fmt(weeklyLo)}/week over 5 years`
                  : `≈ ${fmt(weeklyLo)} – ${fmt(weeklyHi)}/week over 5 years`;
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
                  <div style={{ fontSize: 11, color: COLORS.coral, fontWeight: 500 }}>{weeklyText}</div>
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
            Estimates only · 5-year plan = 260 weeks
          </div>
        </div>
      )}
    </div>
  );
}
