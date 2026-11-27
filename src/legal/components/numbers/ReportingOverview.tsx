// Ported from the Legal app (family-law-floater/src/components/numbers/ReportingOverview.tsx). Re-run the port script to refresh.
import { AlertCircle, ArrowRight, ChevronDown } from "lucide-react";
import type { AdPerformanceRow, LabourRow } from "@/legal/lib/numbers.types";
import {
  hasCompleteCosts,
  hasCompleteContribution,
  type CityStats,
  type Diagnosis,
  type AdStats,
} from "./model";
import { money, moneyOrDash, oneDp, pctOrDash } from "./format";
import { CompareTable } from "./CompareTable";
import { AdsTab } from "./AdsTab";
import { NumberCard } from "./NumberCard";
export function ReportingOverview({
  scope: s,
  all,
  diagnosed,
  selectedCity,
  onSelectCity,
  adRows,
  onDrill,
  unallocated,
  website,
  countMyPay,
  spendStale,
  warnings,
  onOutcomes,
}: {
  scope: CityStats;
  all: CityStats;
  diagnosed: { city: CityStats; diagnosis: Diagnosis }[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
  adRows: AdStats[];
  onDrill: (ad: AdPerformanceRow) => void;
  unallocated: LabourRow | null;
  website: CityStats | null;
  countMyPay: boolean;
  spendStale: boolean;
  warnings: string[];
  onOutcomes: () => void;
}) {
  const diagnosis = diagnosed.find((d) => d.city.key === selectedCity)?.diagnosis;
  return (
    <div className="numbers-overview">
      {(s.spendVerified === false || !s.hoursOk || spendStale || s.revenueVerified === false) && (
        <div className="numbers-data-note">
          <AlertCircle size={16} aria-hidden="true" />
          <p>
            {s.spendVerified === false
              ? "Ad spend is incomplete. "
              : spendStale
                ? "Ad spend needs refreshing. "
                : ""}
            {!s.hoursOk ? "Team pay is incomplete. " : ""}
            {s.revenueVerified === false ? "Revenue is incomplete. " : ""}Missing inputs stay as
            “—”. Saved costs are labelled below.
          </p>
        </div>
      )}
      <section className="numbers-surface">
        <div className="numbers-section-title">
          <div>
            <h3>From enquiry to consultation</h3>
            <p>{selectedCity || "All locations"} · enquiries received in the selected period</p>
          </div>
        </div>
        <div className="numbers-journey">
          <NumberCard
            label="Client enquiries"
            value={s.leads.toLocaleString("en-AU")}
            note={`${s.disqualified} disqualified`}
          />
          <NumberCard
            label="Booked consultations"
            value={s.booked.toLocaleString("en-AU")}
            note={`${pctOrDash(s.bookRate)} of enquiries booked`}
          />
          <NumberCard
            label="Confirmed attendance"
            value={s.showed.toLocaleString("en-AU")}
            note={`${s.noshow} confirmed ${s.noshow === 1 ? "no-show" : "no-shows"}`}
          />
        </div>
        <div className="numbers-attendance numbers-booking-cost">
          <div>
            <strong>{moneyOrDash(s.costPerBooked)} ad cost per booked consultation</strong>
            <span>{pctOrDash(s.bookRate)} of enquiries book</span>
          </div>
          <p>
            {s.booked} booked from {s.leads} enquiries
          </p>
        </div>
        <div className="numbers-attendance">
          <div>
            <strong>
              {s.shows} expected {s.shows === 1 ? "attendance" : "attendances"}
            </strong>
            <span>Used for the costs below</span>
          </div>
          <p>
            <b>{s.showed}</b> confirmed <span>+</span> <b>{s.upcoming}</b> upcoming <span>+</span>{" "}
            <b>{s.needsOutcome}</b> awaiting outcome
          </p>
        </div>
      </section>
      {!!s.needsOutcome && (
        <div className="numbers-action-note">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>
              {s.needsOutcome} {s.needsOutcome === 1 ? "consultation needs" : "consultations need"}{" "}
              an outcome
            </strong>
            <span>Attendance is still unconfirmed.</span>
          </div>
          <button className="numbers-button" onClick={onOutcomes}>
            {selectedCity ? "Review all outcomes" : "Review outcomes"} <ArrowRight size={14} />
          </button>
        </div>
      )}
      <section aria-label="Cost per expected attendance">
        <div className="numbers-section-title">
          <div>
            <h3>What does each expected attendance cost?</h3>
            <p>Advertising and team pay only. Includes bookings that have not happened yet.</p>
          </div>
        </div>
        <div className="numbers-kpi-grid">
          <NumberCard
            label="Advertising"
            value={moneyOrDash(s.adCostPerShow)}
            note={
              s.spendVerified === false
                ? "Awaiting verified spend"
                : `${money(s.spend)} spend ÷ ${s.shows} expected attendances`
            }
          />
          <NumberCard
            label="Team pay"
            value={moneyOrDash(s.labourPerShow)}
            note={
              s.hoursOk
                ? `${money(s.labourCost)} wages & bonuses ÷ ${s.shows}`
                : "Hours or pay rates are incomplete"
            }
          />
          <NumberCard
            emphasis
            label="Combined cost"
            value={moneyOrDash(s.trueCostPerShow)}
            note={
              hasCompleteCosts(s)
                ? `${money(s.totalCost)} advertising + team pay ÷ ${s.shows}`
                : "Available when both costs are complete"
            }
          />
        </div>
      </section>
      {diagnosis && (
        <div className="numbers-city-summary">
          <strong>{diagnosis.headline}</strong>
          <details className="numbers-help">
            <summary>See the comparison</summary>
            {diagnosis.signals.map((sig) => (
              <p key={sig.key}>
                <strong>
                  {sig.title}: {sig.value}.
                </strong>{" "}
                {sig.detail}
              </p>
            ))}
          </details>
        </div>
      )}
      <details className="numbers-disclosure">
        <summary>
          <span>
            <strong>Costs & return</strong>
            <small>Spend, team pay and recorded revenue</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="numbers-disclosure-body">
          <div className="numbers-kpi-grid numbers-four">
            <NumberCard
              label="Advertising spend"
              value={s.spendVerified === false ? "—" : money(s.spend)}
              note="Selected spend dates"
            />
            <NumberCard
              label="Team pay"
              value={s.hoursOk ? money(s.labourCost) : "—"}
              note={`${oneDp(s.hours)} call hours + booking bonuses`}
            />
            <NumberCard
              label="Recorded revenue"
              value={s.revenueVerified === false ? "—" : money(s.revenue)}
              note="Confirmed attendance × pack pricing"
            />
            <NumberCard
              label="Contribution"
              value={hasCompleteContribution(s) ? money(s.profit) : "—"}
              note="Revenue less advertising and team pay"
            />
          </div>
          <p className="numbers-small-note">
            Contribution excludes overhead, software and other business costs. It is not cash
            profit.
          </p>
          <dl className="numbers-facts">
            <div>
              <dt>Ad cost per enquiry</dt>
              <dd>{moneyOrDash(s.costPerLead)}</dd>
            </div>
            <div>
              <dt>Team pay per enquiry</dt>
              <dd>{moneyOrDash(s.labourPerLead)}</dd>
            </div>
            <div>
              <dt>Combined cost per enquiry</dt>
              <dd>{moneyOrDash(s.totalCostPerLead)}</dd>
            </div>
            <div>
              <dt>Ad cost per booking</dt>
              <dd>{moneyOrDash(s.costPerBooked)}</dd>
            </div>
            <div>
              <dt>Hours per booking</dt>
              <dd>{oneDp(s.hoursPerBooking)}</dd>
            </div>
            <div>
              <dt>Confirmed attendance rate</dt>
              <dd>{pctOrDash(s.showRate)}</dd>
            </div>
          </dl>
        </div>
      </details>
      <details className="numbers-disclosure">
        <summary>
          <span>
            <strong>Compare locations</strong>
            <small>See which cities need attention</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="numbers-disclosure-body">
          <CompareTable
            rows={diagnosed}
            all={all}
            selected={selectedCity}
            onSelect={onSelectCity}
          />
        </div>
      </details>
      <details className="numbers-disclosure">
        <summary>
          <span>
            <strong>Client outcomes by ad</strong>
            <small>Follow enquiries through to bookings and attendance</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="numbers-disclosure-body">
          <AdsTab rows={adRows} loading={false} onDrill={onDrill} />
        </div>
      </details>
      <details className="numbers-disclosure">
        <summary>
          <span>
            <strong>
              Data checks & definitions
              {warnings.length
                ? ` · ${warnings.length} ${warnings.length === 1 ? "check" : "checks"}`
                : ""}
            </strong>
            <small>Coverage, calculation rules and anything missing</small>
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="numbers-disclosure-body numbers-help">
          {!!warnings.length && (
            <ul>
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <p>
            <strong>Expected attendance:</strong> confirmed attendance + future bookings + past
            consultations awaiting an outcome. No-shows, cancellations and disqualifications are
            excluded. This is the existing denominator for attendance costs; it is not confirmed
            attendance.
          </p>
          <p>
            <strong>Dates:</strong> enquiries use their received date in Sydney; advertising uses
            spend dates; team pay uses call dates and saved corrections. Revenue uses confirmed
            attendance for the selected enquiry group and linked pack pricing, or the firm’s
            weighted pack price.
          </p>
          <p>
            <strong>Missing values:</strong> a dash means a required input is unavailable or the
            rate cannot be calculated. Zero and unknown are different. Test records and the demo
            firm are excluded. Untracked enquiries stay included.
          </p>
          <p>
            {countMyPay ? "Peter’s pay is included." : "Peter’s pay is excluded."}{" "}
            {s.hoursMissingRate > 0 &&
              `${oneDp(s.hoursMissingRate)} hours have no saved pay rate. `}
            {s.bonusMissingRate > 0 && `${s.bonusMissingRate} bookings have no bonus rate. `}
            {s.hoursFallback > 0 &&
              `${oneDp(s.hoursFallback)} hours were allocated by leads contacted because no talk time was recorded.`}
          </p>
          {!selectedCity && website && (
            <p>
              All locations includes {website.leads} enquiries without a city. They are not counted
              again in a named location.
            </p>
          )}
          {!selectedCity && unallocated && (
            <p>
              All locations includes {oneDp(unallocated.hours)} unallocated team hours.{" "}
              {s.hoursOk &&
                `Their recorded cost is ${money(unallocated.hourly_cost + unallocated.bonus_cost)}.`}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
