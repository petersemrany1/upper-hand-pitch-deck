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

type TreatmentPrice = {
  min: number;
  max: number;
  weekly?: { min: number; max: number };
};

type ProcedurePrice = TreatmentPrice & { secondTreatment?: TreatmentPrice };

// Nitai's quoted weekly repayments come directly from Shailendra's pricing email.
const NITAI_PRICES: Record<string, ProcedurePrice> = {
  "Norwood 2": { min: 8000, max: 10000 },
  "Norwood 3": { min: 10000, max: 13000 },
  "Norwood 3 Vertex": { min: 10000, max: 15000 },
  "Norwood 4": { min: 12000, max: 15000 },
  "Norwood 5": { min: 15000, max: 20000, weekly: { min: 77, max: 103 } },
  "Norwood 6": {
    min: 18000, max: 20000, weekly: { min: 93, max: 103 },
    secondTreatment: { min: 10000, max: 15000, weekly: { min: 52, max: 77 } },
  },
  "Norwood 7": {
    min: 20000, max: 25000, weekly: { min: 103, max: 129 },
    secondTreatment: { min: 10000, max: 15000, weekly: { min: 52, max: 77 } },
  },
};

// Keep Boss Clinic's existing prices independent of Nitai's updated quotes.
const BOSS_PRICES: Record<string, TreatmentPrice> = {
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
const fmtPrice = ({ min, max }: TreatmentPrice) => min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
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

function treatmentWeeklyText(price: TreatmentPrice): string {
  if (price.weekly) return `≈ $${price.weekly.min} – $${price.weekly.max}/week on 5-yr finance`;
  return financeWeeklyText(price.min, price.max) ?? "Outside standard finance range ($8k–$30k)";
}

type PricingClinic = "nitai" | "byron" | "bijan" | "boss" | "gro";

export default function NorwoodPricingCalculator({ defaultClinic = "nitai" }: { defaultClinic?: PricingClinic }) {
  const [open, setOpen] = useState(false);
  const [clinic, setClinic] = useState<PricingClinic>(defaultClinic);
  const clinicLabel = (c: string) =>
    c === "gro" ? "GRO Sydney" : c === "nitai" ? "Nitai" : c === "byron" ? "Byron" : c === "bijan" ? "Bijan" : "Boss";
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(["nitai", "byron", "bijan", "boss", "gro"] as const).map((c) => {
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
                  {clinicLabel(c)}
                </button>
              );
            })}
          </div>

          {(clinic === "nitai" || clinic === "bijan" || clinic === "byron" || clinic === "boss") && (
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
              {clinicLabel(clinic)} charges a fixed fee per procedure, not per graft
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
          {clinic === "gro" ? (
            <div style={{ background: "#fafaf9", border: `0.5px solid ${COLORS.line}`, borderRadius: 8, padding: "12px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>GRO Sydney — indicative pricing</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.coral, marginTop: 6 }}>$15,000–$25,000</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.coral, marginTop: 4 }}>Approximately $40–$130/week on a payment plan</div>
              <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.55, margin: "8px 0 0" }}>
                Give this ballpark to each person, depending on what they need. Weekly payments depend on the treatment and finance terms. The consultation confirms their personalised quote.
              </p>
            </div>
          ) : (
            <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ROWS.map((r) => {
                let price: ProcedurePrice;
                if (clinic === "nitai" || clinic === "boss") {
                  price = clinic === "boss" ? BOSS_PRICES[r.label] : NITAI_PRICES[r.label];
                } else if (clinic === "bijan") {
                  price = BIJAN_PRICES[r.label];
                } else if (clinic === "byron") {
                  price = BYRON_PRICES[r.label];
                } else {
                  price = { min: r.min * pricePerGraft, max: r.max * pricePerGraft };
                }
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
                      {!price.secondTreatment && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.coral, whiteSpace: "nowrap" }}>
                          {fmtPrice(price)}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{fmtGrafts(r.min, r.max)}</div>
                    {price.secondTreatment ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#111", marginTop: 4 }}>2 treatments required</div>
                        {[price, price.secondTreatment].map((treatment, index) => (
                          <div key={index} style={{ borderTop: `0.5px solid ${COLORS.line}`, paddingTop: 6, marginTop: 4 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>{index === 0 ? "1st treatment" : "2nd treatment"}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.coral, whiteSpace: "nowrap" }}>{fmtPrice(treatment)}</div>
                            </div>
                            <div style={{ fontSize: 11, color: COLORS.coral, fontWeight: 500, marginTop: 2 }}>{treatmentWeeklyText(treatment)}</div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: COLORS.coral, fontWeight: 500 }}>{treatmentWeeklyText(price)}</div>
                    )}
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
              Finance estimates use Shailandra's 5-year plan (fortnightly payments shown as weekly)
            </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
