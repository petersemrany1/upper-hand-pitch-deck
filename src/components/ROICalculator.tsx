import type { ReactNode } from "react";
import SlideHeader from "./SlideHeader";
import { CONVERSION_OPTIONS, calculateClinicReturn } from "../lib/clinic-roi";
import "./roi-calculator.css";

const PACK_SIZES = [10, 20, 50, 100, 150];
const currency = (value: number) => new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 0,
}).format(value);

interface Props {
  caseValue: number;
  convertRate: string;
  pricePerShow: number;
  packSize: number;
  onCaseValueChange: (value: number) => void;
  onConvertRateChange: (value: string) => void;
  onPricePerShowChange: (value: number) => void;
  onPackSizeChange: (value: number) => void;
}

function Row({ label, children, emphasis = false }: { label: string; children: ReactNode; emphasis?: boolean }) {
  return <div className={`roi-result-row${emphasis ? " roi-result-revenue" : ""}`}>
    <span>{label}</span><strong>{children}</strong>
  </div>;
}

export default function ROICalculator({ caseValue, convertRate, pricePerShow, packSize, onCaseValueChange, onConvertRateChange, onPricePerShowChange, onPackSizeChange }: Props) {
  const rateIndex = Math.max(0, CONVERSION_OPTIONS.findIndex(option => option.label === convertRate));
  const selectedRate = CONVERSION_OPTIONS[rateIndex];
  const result = calculateClinicReturn(caseValue, selectedRate.value, pricePerShow, packSize);

  return (
    <section className="deck-slide roi-slide" aria-labelledby="roi-heading">
      <SlideHeader />
      <div className="roi-content">
        <header className="roi-heading">
          <p>YOUR NUMBERS</p>
          <h2 id="roi-heading">What This Looks Like For Your Clinic</h2>
        </header>
        <div className="roi-calculator">
          <div className="roi-inputs">
            <h3>Your clinic</h3>
            <div className="roi-field">
              <div className="roi-field-label">
                <label htmlFor="roi-ticket">Average procedure value</label>
                <div className="roi-money-input"><span>$</span><input id="roi-ticket" type="number" min={1000} max={999999} step={500} value={caseValue || ""} onChange={e => { onCaseValueChange(Math.min(999999, Math.max(0, Number(e.target.value)))); }} onBlur={() => onCaseValueChange(Math.max(1000, caseValue))} /></div>
              </div>
              <input aria-label="Average procedure value slider" type="range" min={1000} max={Math.max(50000, caseValue)} step={500} value={caseValue} onChange={e => onCaseValueChange(Number(e.target.value))} />
            </div>
            <div className="roi-field">
              <div className="roi-field-label">
                <label htmlFor="roi-conversion">Consults that become procedures</label>
                <select id="roi-conversion" value={selectedRate.label} onChange={e => onConvertRateChange(e.target.value)}>
                  {CONVERSION_OPTIONS.map(option => <option key={option.label}>{option.label}</option>)}
                </select>
              </div>
              <input aria-label="Conversion rate slider" aria-valuetext={selectedRate.label} type="range" min={0} max={CONVERSION_OPTIONS.length - 1} step={1} value={rateIndex} onChange={e => onConvertRateChange(CONVERSION_OPTIONS[Number(e.target.value)].label)} />
            </div>
            <div className="roi-field roi-field-label">
              <label htmlFor="roi-price">Cost per attended consult <small>ex GST</small></label>
              <div className="roi-money-input"><span>$</span><input id="roi-price" type="number" min={100} max={99999} step={50} value={pricePerShow || ""} onChange={e => { onPricePerShowChange(Math.min(99999, Math.max(0, Number(e.target.value)))); }} onBlur={() => onPricePerShowChange(Math.max(100, pricePerShow))} /></div>
            </div>
            <fieldset className="roi-packs">
              <legend>Pack size <span>attended consults</span></legend>
              <div>{PACK_SIZES.map(size => <button key={size} type="button" aria-pressed={size === packSize} onClick={() => onPackSizeChange(size)}>{size}</button>)}</div>
            </fieldset>
          </div>
          <div className="roi-results" aria-live="polite" aria-atomic="true">
            <h3>Your estimate</h3>
            <Row label="Cost of pack (ex GST)">{currency(result.cost)}</Row>
            <Row label="Expected procedures">{new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 }).format(result.procedures)}</Row>
            <Row label="Cost per procedure acquired">{currency(result.costPerProcedure)}</Row>
            <Row label="Procedure revenue" emphasis>{currency(result.revenue)}</Row>
            <div className="roi-multiple"><strong>{result.multiple.toFixed(1)}×</strong><span>revenue for every dollar<br />spent with us</span></div>
            <p className="roi-note">Estimated revenue, before treatment costs and GST. Fractional procedures are averages, not guaranteed bookings.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
