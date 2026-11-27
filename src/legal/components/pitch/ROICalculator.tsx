// Ported from the Legal app (family-law-floater/src/components/pitch/ROICalculator.tsx). Re-run the port script to refresh.
import { motion } from "framer-motion";
import { useState } from "react";

import { CONVERSION_OPTIONS, conversionValue, formatCurrency } from "./deck-utils";
import { ChapterLabel, Slide, SlideHeading, item } from "./SlideShell";

const PACK_SIZES = [10, 20, 50, 100, 150];

function labelForSignPerTen(signPerTen: number): string {
  const target = signPerTen / 10;
  let best = CONVERSION_OPTIONS[0]!;
  for (const o of CONVERSION_OPTIONS) {
    if (Math.abs(o.value - target) < Math.abs(best.value - target)) best = o;
  }
  return best.label;
}

function signPerTenFromLabel(label: string): number {
  return Math.min(10, Math.max(1, Math.round(conversionValue(label) * 10)));
}

function formatClients(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function Row({
  label,
  suffix,
  children,
  emphasis = false,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`deck-roi-row${emphasis ? " deck-roi-row-emphasis" : ""}`}>
      <span className="deck-roi-row-label">
        {label}
        {suffix ? <span className="deck-roi-suffix"> {suffix}</span> : null}
      </span>
      {children}
    </div>
  );
}

export function ROICalculator({
  matterValue,
  pricePerShow,
  conversionLabel,
  onChange,
}: {
  matterValue: number;
  pricePerShow: number;
  conversionLabel: string;
  onChange: (next: { matterValue?: number; conversionLabel?: string }) => void;
}) {
  const signPerTen = signPerTenFromLabel(conversionLabel);
  const [packSize, setPackSize] = useState(10);

  const cost = packSize * pricePerShow;
  const clientsWhoSign = packSize * (signPerTen / 10);
  const costPerClient = clientsWhoSign > 0 ? cost / clientsWhoSign : 0;
  const fees = clientsWhoSign * matterValue;
  const multiple = cost > 0 ? fees / cost : 0;

  return (
    <Slide>
      <div>
        <ChapterLabel>The Numbers · Move The Sliders</ChapterLabel>
        <SlideHeading>Run it on your figures.</SlideHeading>

        <motion.div variants={item} className="deck-roi deck-section-gap">
          {/* Left: inputs */}
          <div className="deck-roi-inputs">
            <p className="deck-label">Your Firm</p>

            <div className="deck-roi-control">
              <div className="deck-roi-input-label">
                <label htmlFor="roi-matter" className="deck-copy">
                  Average matter value
                </label>
                <span className="deck-roi-input-value">{formatCurrency(matterValue)}</span>
              </div>
              <input
                id="roi-matter"
                type="range"
                min={5000}
                max={90000}
                step={2500}
                value={Math.min(90000, Math.max(5000, matterValue))}
                onChange={(e) => onChange({ matterValue: Number(e.target.value) })}
                className="deck-range"
              />
            </div>

            <div className="deck-roi-control">
              <div className="deck-roi-input-label">
                <label htmlFor="roi-sign" className="deck-copy">
                  How many sign out of 10?
                </label>
                <span className="deck-roi-input-value">{signPerTen}</span>
              </div>
              <input
                id="roi-sign"
                type="range"
                min={1}
                max={10}
                step={1}
                value={signPerTen}
                onChange={(e) =>
                  onChange({ conversionLabel: labelForSignPerTen(Number(e.target.value)) })
                }
                className="deck-range"
              />
            </div>

            <div className="deck-roi-control">
              <p className="deck-copy">Pack size</p>
              <div className="deck-pack-options">
                {PACK_SIZES.map((size) => {
                  const selected = size === packSize;
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setPackSize(size)}
                      className="deck-pack-option"
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: outputs */}
          <div className="deck-roi-outputs">
            <p className="deck-label">Estimate</p>

            <div className="deck-roi-rows">
              <Row label="Cost of pack" suffix="(ex GST)">
                <span className="deck-roi-value text-primary">{formatCurrency(cost)}</span>
              </Row>
              <Row label="Clients who sign">
                <span className="deck-roi-value">{formatClients(clientsWhoSign)}</span>
              </Row>
              <Row label="Cost per signed client">
                <span className="deck-roi-value">{formatCurrency(costPerClient)}</span>
              </Row>
              <Row label="Fees generated" emphasis>
                <span className="deck-roi-value deck-roi-fees">{formatCurrency(fees)}</span>
              </Row>
            </div>

            <div className="deck-roi-return">
              <span className="deck-roi-multiple">
                {multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}×
              </span>
              <span className="deck-copy">return on what you spend with us</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Slide>
  );
}
