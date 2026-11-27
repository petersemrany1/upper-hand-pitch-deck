// Ported from the Legal app (family-law-floater/src/components/numbers/CompareTable.tsx). Re-run the port script to refresh.
import { useState } from "react";
import type { CityStats, Diagnosis } from "./model";
import { hasCompleteContribution } from "./model";
import { money, moneyOrDash, oneDp, pctOrDash } from "./format";
export function CompareTable({
  rows,
  all,
  selected,
  onSelect,
}: {
  rows: { city: CityStats; diagnosis: Diagnosis }[];
  all: CityStats;
  selected: string;
  onSelect: (city: string) => void;
}) {
  const [details, setDetails] = useState(false);
  const order: Record<Diagnosis["key"], number> = {
    mixed: 0,
    marketing: 1,
    labour: 1,
    shows: 1,
    healthy: 2,
    early: 3,
    nodata: 4,
    pending: 3,
  };
  const sorted = [...rows].sort(
    (a, b) =>
      order[a.diagnosis.key] - order[b.diagnosis.key] ||
      (b.city.trueCostPerShow ?? b.city.adCostPerShow ?? -1) -
        (a.city.trueCostPerShow ?? a.city.adCostPerShow ?? -1),
  );
  const extra = (c: CityStats) => (
    <>
      <td>{moneyOrDash(c.costPerLead)}</td>
      <td>{pctOrDash(c.bookRate)}</td>
      <td>{pctOrDash(c.showRate)}</td>
      <td>{moneyOrDash(c.adCostPerShow)}</td>
      <td>{c.spendVerified === false ? "—" : money(c.spend)}</td>
      <td>{c.hoursOk ? money(c.labourCost) : "—"}</td>
      <td>{oneDp(c.hoursPerBooking)}</td>
      <td>{hasCompleteContribution(c) ? money(c.profit) : "—"}</td>
    </>
  );
  return (
    <div>
      <div className="numbers-table-tools">
        <span>Locations needing attention appear first. Select a city to update Overview.</span>
        <label>
          <input type="checkbox" checked={details} onChange={(e) => setDetails(e.target.checked)} />{" "}
          More metrics
        </label>
      </div>
      <div className="legal-table-scroll">
        <table className="numbers-table">
          <caption className="sr-only">Compare city performance in the selected date range</caption>
          <thead>
            <tr>
              <th>Location</th>
              <th>Enquiries</th>
              <th>Booked</th>
              <th>Expected attendance</th>
              <th>Combined cost / expected attendance</th>
              <th>Assessment</th>
              {details && (
                <>
                  <th>Ad cost / enquiry</th>
                  <th>Booking rate</th>
                  <th>Confirmed attendance rate</th>
                  <th>Ad cost / expected attendance</th>
                  <th>Ad spend</th>
                  <th>Team pay</th>
                  <th>Hours / booking</th>
                  <th>Contribution</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ city: c, diagnosis: d }) => (
              <tr key={c.key} aria-selected={c.key === selected}>
                <td>
                  <button
                    aria-pressed={c.key === selected}
                    onClick={() => onSelect(c.key === selected ? "" : c.key)}
                  >
                    {c.key}
                  </button>
                </td>
                <td>{c.leads}</td>
                <td>{c.booked}</td>
                <td>{c.shows}</td>
                <td>{moneyOrDash(c.trueCostPerShow)}</td>
                <td>{d.short}</td>
                {details && extra(c)}
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan={details ? 14 : 6}>No locations in this range.</td>
              </tr>
            )}
            {!!sorted.length && (
              <tr>
                <td>
                  <strong>All locations</strong>
                </td>
                <td>{all.leads}</td>
                <td>{all.booked}</td>
                <td>{all.shows}</td>
                <td>{moneyOrDash(all.trueCostPerShow)}</td>
                <td>Account totals</td>
                {details && extra(all)}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="numbers-small-note">
        Expected attendance includes confirmed, upcoming and unresolved past consultations. Combined
        cost includes advertising and team pay. Assessments compare each city with the account
        average.
      </p>
      <details className="numbers-help">
        <summary>Assessment rules</summary>
        <p>
          Marketing: lead cost 10%+ above average. Labour: hours or leads per booking 30%+ above
          average. No-shows: confirmed attendance rate 20%+ below average. Under 10 leads is too
          early to judge. Incomplete costs remain unavailable.
        </p>
      </details>
    </div>
  );
}
