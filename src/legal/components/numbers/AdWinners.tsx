// Ported from the Legal app (family-law-floater/src/components/numbers/AdWinners.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { Trophy } from "lucide-react";
import {
  rankAdOutcomes,
  type AdOutcome,
  type AdOutcomeReport,
  type OutcomeRanking,
} from "@/legal/lib/ad-outcomes";
const count = (n: number) => n.toLocaleString("en-AU");
const money = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 2,
      }).format(n);
const rate = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);
export function AdWinners({
  report,
  trusted,
  rows,
}: {
  report: AdOutcomeReport;
  trusted: boolean;
  rows: AdOutcome[];
}) {
  const [ranking, setRanking] = useState<OutcomeRanking>("bookings");
  const ranked = rankAdOutcomes(rows, ranking);
  const leaders = trusted ? ranked.slice(0, 2) : [];
  const eligible = new Set(ranked.map((ad) => ad.key));
  const ordered = [...ranked, ...rows.filter((ad) => !eligible.has(ad.key))];
  return (
    <section className="ad-winners" aria-label="Best ads for leads and bookings">
      <div className="numbers-section-heading">
        <div>
          <h2>Your top two ads</h2>
          <p>
            See which ads bring enquiries that turn into bookings, using your saved client records.
          </p>
        </div>
        <div className="tracking-navigation" role="group" aria-label="Rank ads by">
          {(
            [
              ["bookings", "Most bookings"],
              ["leads", "Most leads"],
              ["conversion", "Best conversion"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} aria-pressed={ranking === key} onClick={() => setRanking(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {report.unmatchedLeads > 0 && (
        <p className="numbers-small-note" role="status">
          Across the selected dates, {count(report.unmatchedLeads)} enquiries, including{" "}
          {count(report.unmatchedBookings)} booked{" "}
          {report.unmatchedBookings === 1 ? "client" : "clients"}, cannot yet be matched to one ad.
          Rankings cover matched ads.
        </p>
      )}
      <div className="ad-winner-grid">
        {leaders.map((ad, index) => (
          <article className="ad-winner-card" key={ad.key}>
            <div className="ad-winner-rank">
              <Trophy size={18} aria-hidden="true" />{" "}
              <span>
                #{index + 1} ·{" "}
                {ranking === "bookings"
                  ? "Most bookings"
                  : ranking === "leads"
                    ? "Most leads"
                    : "Lead-to-booking conversion"}
              </span>
            </div>
            <h3>{ad.name}</h3>
            <p>
              {ad.locations.join(" · ") || "Location unassigned"} · Ad {ad.adId}
            </p>
            <dl className="ad-winner-stats">
              <div>
                <dt>Leads</dt>
                <dd>{count(ad.leads)}</dd>
              </div>
              <div>
                <dt>Booked clients</dt>
                <dd>{count(ad.booked)}</dd>
              </div>
              <div>
                <dt>Lead → booking</dt>
                <dd>{rate(ad.bookingRate)}</dd>
              </div>
            </dl>
            <div className="ad-winner-cost">
              <span>{money(ad.costPerLead)} / lead</span>
              <strong>{money(ad.costPerBooking)} / booked client</strong>
            </div>
            {ad.booked < 5 && (
              <small>
                Early results · {ad.booked} booked {ad.booked === 1 ? "client" : "clients"}
              </small>
            )}
          </article>
        ))}
        {leaders.length === 1 && (
          <div className="ad-winner-empty">
            <strong>One ad qualifies so far</strong>
            <p>
              A second appears when it has{" "}
              {ranking === "conversion"
                ? "at least ten leads and two bookings"
                : ranking === "bookings"
                  ? "a matched booking"
                  : "a matched lead"}
              .
            </p>
          </div>
        )}
        {!leaders.length && (
          <div className="ad-winner-empty">
            <strong>
              {trusted ? "No leader yet in this view" : "Rankings are waiting for client results"}
            </strong>
            <p>
              {!trusted
                ? "Saved results remain below. Refresh to load the latest leads and bookings."
                : ranking === "conversion"
                  ? "Conversion rankings need at least ten leads and two booked clients per ad."
                  : "Try another date range or clear the filters."}
            </p>
          </div>
        )}
      </div>
      <details className="numbers-disclosure">
        <summary>
          <span>
            <strong>Compare all ads</strong>
            <small>Leads, bookings, conversion and acquisition costs</small>
          </span>
        </summary>
        <div className="numbers-disclosure-body legal-table-scroll">
          <table className="legal-report-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Leads</th>
                <th>Booked clients</th>
                <th>Conversion</th>
                <th>Cost / lead</th>
                <th>Cost / booking</th>
              </tr>
            </thead>
            <tbody>
              {!ordered.length && (
                <tr>
                  <td colSpan={6}>No ads match these dates and filters.</td>
                </tr>
              )}
              {ordered.map((ad) => (
                <tr key={ad.key}>
                  <td>
                    {ad.name}
                    <small className="ad-id-label">{ad.adId}</small>
                  </td>
                  <td>{count(ad.leads)}</td>
                  <td>{count(ad.booked)}</td>
                  <td>{rate(ad.bookingRate)}</td>
                  <td>{money(ad.costPerLead)}</td>
                  <td>{money(ad.costPerBooking)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details className="numbers-help">
        <summary>About these results</summary>
        <p>
          Leads are client enquiries received during the selected dates. Bookings count each of
          those clients once, including a later cancellation or no-show. Subsequent rebookings do
          not inflate the result. Business results separately show current appointment outcomes.
        </p>
        <p>
          Matches use the saved ad ID, or a unique ad name with its campaign and ad set. Ambiguous
          matches stay unassigned. Meta-reported leads below can differ from enquiries saved in the
          app. Conversion rankings need ten leads and two booked clients; rankings describe observed
          results, not a guaranteed winner.
        </p>
        <p>
          Lead and booking rankings update independently of ad spend. Costs remain unavailable until
          spend is complete.
        </p>
      </details>
    </section>
  );
}
