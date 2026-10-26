import type { BookingPerformanceReport } from "@/utils/booking-performance.functions";
import type { ReportingPeriod } from "@/lib/reporting-period";
import { ReportingPeriodSelect } from "./ReportingPeriodSelect";

type Props = {
  report?: BookingPerformanceReport; loading: boolean; error?: string; onRetry: () => void;
  period: ReportingPeriod; onPeriod: (period: ReportingPeriod) => void;
  start: string; end: string; onStart: (value: string) => void; onEnd: (value: string) => void;
};

/** Keep the rep's original dashboard compact: one added metric, without charts. */
export function BookingConversionCard({ report, loading, error, onRetry, ...period }: Props) {
  const conversion = report?.conversion;
  const name = conversion?.repName.trim().split(/\s+/)[0];
  return <section aria-label="Connected calls to bookings" style={{ background: "#fff", border: "0.5px solid #e8e8e6", borderRadius: 14, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "16px 20px", borderBottom: "0.5px solid #f0f0ee" }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{name ? `${name}'s calls to bookings` : "My calls to bookings"}</h2>
      <ReportingPeriodSelect value={period.period} onChange={period.onPeriod} start={period.start} end={period.end} onStart={period.onStart} onEnd={period.onEnd} />
    </div>
    <div style={{ padding: 20 }}>
      {error && <p role="status" style={{ fontSize: 12, color: "#9a6700", marginBottom: 12 }}>Could not {report ? "refresh" : "load"} connected-call conversion. {report ? "Showing the last loaded figures." : ""} <button onClick={onRetry} style={{ textDecoration: "underline" }}>Retry</button></p>}
      <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, color: "#111" }}>{conversion?.percentage == null ? "—" : `${conversion.percentage.toLocaleString("en-AU", { maximumFractionDigits: 2 })}%`}</div>
      <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>{loading ? "Loading…" : conversion ? `${conversion.bookedPeople.toLocaleString()} of ${conversion.connectedPeople.toLocaleString()} connected people booked` : "Connected-call data unavailable"}</p>
      <p style={{ fontSize: 12, color: "#999", marginTop: 6 }}>Each person counts once. Unanswered calls are excluded.</p>
      <details style={{ fontSize: 12, color: "#666", marginTop: 16, lineHeight: 1.6 }}><summary style={{ cursor: "pointer" }}>How this percentage is calculated</summary>
        <p style={{ marginTop: 8 }}>People connected with in the selected period who subsequently booked ÷ people connected with × 100. Double dials and repeat conversations count once per person. A connection is at least 15 seconds, or manually marked connected.</p>
        <p style={{ marginTop: 8 }}>Only bookings linked to those people count, including later bookings up to the last update. Calls after a booking or deposit payment, unanswered/failed/pending calls, test/demo records, inbound calls and clinic prospecting are excluded. Dates use Sydney time.</p>
      </details>
    </div>
  </section>;
}
