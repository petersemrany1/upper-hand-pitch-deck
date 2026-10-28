import { useId, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, CalendarDays, Check, ChevronRight, Clock3, PhoneOutgoing, TrendingUp, Users } from "lucide-react";
import type { BookingPerformanceReport } from "@/utils/booking-performance.functions";
import { groupBookingDays, type BookingGrouping } from "@/lib/booking-performance";
import { APP_TIMEZONE, sydneyTodayISO } from "@/lib/timezone";
import { addDays, type ReportingPeriod } from "@/lib/reporting-period";
import { ReportingPeriodSelect } from "./ReportingPeriodSelect";
import "./booking-performance.css";

const number = (value: number) => value.toLocaleString("en-AU");
const percent = (value: number | null | undefined) => value == null ? "—" : `${value.toLocaleString("en-AU", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
const dateLabel = (date: string, monthOnly = false) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", monthOnly ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
const monthLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export type BookingPerformanceTab = "bookings" | "conversion";

type ViewProps = {
  tab: BookingPerformanceTab;
  onTab: (tab: BookingPerformanceTab) => void;
  report?: BookingPerformanceReport;
  isAdmin: boolean;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  period: ReportingPeriod;
  onPeriod: (period: ReportingPeriod) => void;
  start: string;
  end: string;
  onStart: (start: string) => void;
  onEnd: (end: string) => void;
};

export function BookingPerformanceView({ report, isAdmin, loading, error, onRetry, period, onPeriod, start, end, onStart, onEnd, tab, onTab }: ViewProps) {
  const [repId, setRepId] = useState("");
  const [grouping, setGrouping] = useState<BookingGrouping>(period === "all" || period === "year" ? "month" : "day");
  const changePeriod = (next: ReportingPeriod) => {
    onPeriod(next);
    if (tab === "bookings" && next !== "custom") setGrouping(next === "all" || next === "year" ? "month" : "day");
  };
  const changeGrouping = (next: BookingGrouping) => {
    setGrouping(next);
    // Monthly is the complete booking history, even after viewing a short period.
    if (next === "month") onPeriod("all");
  };
  const gradientId = useId().replace(/:/g, "");
  const selectedRep = report?.reps.find(rep => rep.id === repId);
  const points = useMemo(() => groupBookingDays(report?.days ?? [], grouping, selectedRep?.id), [report?.days, grouping, selectedRep?.id]);
  const conversion = report?.conversion;
  const conversionName = isAdmin ? "Nina" : conversion?.repName.split(/\s+/)[0] || "My";
  const conversionTitle = conversionName === "My" ? "My calls to bookings" : `${conversionName}'s calls to bookings`;
  const summaryCards = [
    { key: "today", label: "Today", period: "day", Icon: CalendarDays, note: "Bookings made today" },
    { key: "yesterday", label: "Yesterday", period: "yesterday", Icon: Clock3, note: "Previous day's bookings" },
    { key: "week", label: "This week", period: "week", Icon: TrendingUp, note: "Monday to today" },
    { key: "month", label: "This month", period: "month", Icon: CalendarDays, note: "Month to date" },
  ] as const;
  const rangeLabel = !report || report.start > report.end ? "Selected period"
    : report.start === report.end ? `${dateLabel(report.start)} ${report.start.slice(0, 4)}`
    : report.start.slice(0, 4) !== report.end.slice(0, 4) ? `${dateLabel(report.start)} ${report.start.slice(0, 4)} – ${dateLabel(report.end)} ${report.end.slice(0, 4)}`
    : `${dateLabel(report.start)} – ${dateLabel(report.end)} · ${report.start.slice(0, 4)}`;
  const selectedBookings = selectedRep?.bookings ?? report?.total ?? 0;
  const maxRepBookings = Math.max(1, ...(report?.reps.map(rep => rep.bookings) ?? []));
  const totalLabel = `${number(selectedBookings)} booking${selectedBookings === 1 ? "" : "s"}`;
  const currentMonth = report ? sydneyTodayISO(new Date(report.asOf)).slice(0, 7) : "";
  const lastMonth = currentMonth ? addDays(`${currentMonth}-01`, -1).slice(0, 7) : "";

  return <section className="booking-performance" aria-label="Booking performance">
    <div className="booking-summary">
      {summaryCards.map(({ Icon, ...card }) => <button key={card.key} type="button" className={`booking-stat ${period === card.period ? "selected" : ""}`} onClick={() => changePeriod(card.period)} aria-label={`Bookings ${card.label.toLowerCase()}`} aria-pressed={period === card.period}>
        <span className="booking-stat-top"><span>{card.label}</span><span className="booking-stat-icon"><Icon size={16} strokeWidth={1.6} /></span></span>
        <span className="booking-stat-value"><strong>{report ? number(report.summary[card.key]) : <span className="booking-skeleton-number" />}</strong><span>bookings</span></span>
        <span className="booking-stat-bottom"><span>{!isAdmin && report ? `$${number(report.summary[card.key] * 50)} booking bonus` : card.note}</span><ArrowUpRight size={14} /></span>
      </button>)}
    </div>

    <div className="booking-report">
      <div className="booking-report-header">
        <div className="booking-report-intro"><span className="booking-section-icon"><TrendingUp size={18} /></span><div><h2>Booking performance</h2><p>A clear view of the work turning into bookings.</p></div></div>
        <div className="booking-period-control"><CalendarDays size={15} /><ReportingPeriodSelect value={period} onChange={changePeriod} start={start} end={end} onStart={onStart} onEnd={onEnd} /></div>
      </div>
      <div className="booking-tab-bar">
        <div className="booking-tabs" role="tablist" aria-label="Booking reports">
          {(["bookings", "conversion"] as const).map((key, index) => <button type="button" key={key}
            id={`booking-tab-${key}`} role="tab" aria-selected={tab === key} aria-controls={`booking-panel-${key}`} tabIndex={tab === key ? 0 : -1}
            onClick={() => onTab(key)} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "bookings" : event.key === "End" ? "conversion" : index === 0 ? "conversion" : "bookings";
              onTab(next); document.getElementById(`booking-tab-${next}`)?.focus();
            }}>
            {key === "bookings" ? <TrendingUp size={15} /> : <PhoneOutgoing size={15} />}
            {key === "bookings" ? "Booking overview" : conversionTitle}
            <span className="booking-tab-count">{key === "bookings" ? report ? number(report.total) : "—" : percent(conversion?.percentage)}</span>
          </button>)}
        </div>
        <span className={`booking-freshness ${error ? "stale" : ""}`}>{report && !error ? <><span />Updated {new Date(report.asOf).toLocaleTimeString("en-AU", { timeZone: APP_TIMEZONE, hour: "numeric", minute: "2-digit" })}</> : error ? "Update unavailable" : "Updating…"}</span>
      </div>
      {error && <div role="status" className="booking-notice">{report ? "Could not refresh. Showing the last loaded figures." : "Could not load booking performance. Check the selected dates and try again."} <button onClick={onRetry}>Retry</button></div>}
      {loading && <div role="status" className="booking-loading"><div className="booking-chart-skeleton" /><span>Loading booking performance…</span></div>}
      {report && <div role="tabpanel" id={`booking-panel-${tab}`} aria-labelledby={`booking-tab-${tab}`} tabIndex={0}>
        {tab === "bookings" ? <>
          <div className={`booking-charts ${!isAdmin ? "personal" : ""}`}>
            <div className="booking-trend">
              <div className="booking-chart-header">
                <div><span className="booking-eyebrow">{selectedRep ? selectedRep.name : isAdmin ? "All reps" : "Your performance"}</span><h3>{selectedRep ? `${selectedRep.name.split(/\s+/)[0]}'s booking trend` : isAdmin ? "Team booking trend" : "Your booking trend"}</h3></div>
                <div className="booking-interval" role="group" aria-label="Chart interval">{(["day", "week", "month"] as const).map(interval => <button type="button" key={interval} aria-pressed={grouping === interval} onClick={() => changeGrouping(interval)}>{interval === "day" ? "Daily" : interval === "week" ? "Weekly" : "Monthly"}</button>)}</div>
              </div>
              <div className="booking-chart-metrics"><div className="booking-chart-total"><strong>{number(selectedBookings)}</strong><span>booking{selectedBookings === 1 ? "" : "s"}<small>{rangeLabel}</small></span></div>
                {isAdmin && <select aria-label="Booking trend rep" value={selectedRep?.id ?? ""} onChange={e => setRepId(e.target.value)}><option value="">All reps</option>{report.reps.map(rep => <option key={rep.id} value={rep.id}>{rep.name}</option>)}</select>}
              </div>
              {points.length ? <div aria-label={`Booking trend line chart: ${totalLabel}`} className="booking-line-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={points} margin={{ top: 18, right: 16, bottom: 4, left: -22 }} accessibilityLayer>
                    <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9613e" stopOpacity={0.14} /><stop offset="100%" stopColor="#e9613e" stopOpacity={0.005} /></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="#ecedf0" strokeDasharray="3 5" />
                    <XAxis dataKey="date" tickFormatter={value => dateLabel(value, grouping === "month")} tick={{ fontSize: 11, fill: "#858994" }} axisLine={false} tickLine={false} minTickGap={34} dy={8} />
                    <YAxis allowDecimals={false} domain={[0, (max: number) => Math.max(1, max)]} tick={{ fontSize: 11, fill: "#858994" }} axisLine={false} tickLine={false} />
                    <Tooltip labelFormatter={(_, payload) => { const point = payload[0]?.payload; return point ? grouping === "month" ? monthLabel(point.date) : point.date === point.end ? dateLabel(point.date) : `${dateLabel(point.date)} – ${dateLabel(point.end)}` : ""; }} formatter={value => [value, "Bookings"]} contentStyle={{ borderRadius: 12, padding: "10px 14px", fontSize: 12, border: "1px solid #e9eaee", boxShadow: "0 8px 24px #1d243014" }} />
                    <Area type="linear" dataKey="bookings" fill={`url(#${gradientId})`} stroke="none" tooltipType="none" isAnimationActive={false} />
                    <Line type="linear" dataKey="bookings" name="Bookings" stroke="#e9613e" strokeWidth={2.5} dot={points.length <= 35 ? { r: 3, fill: "#fff", strokeWidth: 2 } : false} activeDot={{ r: 5, strokeWidth: 3, stroke: "#fff" }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div> : <p className="booking-empty">No recorded work activity in this period.</p>}
              <div className="booking-chart-caption"><span><i />Bookings per {grouping}{grouping === "month" ? " · all months" : " · active workdays only"}</span><span>{selectedBookings === 0 ? "No bookings in this period" : `Current ${grouping} may be incomplete`}</span></div>
              {grouping === "month" && points.length > 0 && <div className="booking-monthly-totals">
                <div className="booking-table-scroll" tabIndex={0} role="region" aria-label="Monthly booking totals">
                  <table><caption>Monthly booking totals{period === "all" ? " · since tracking began" : ""}</caption>
                    <thead><tr><th scope="col">Month</th><th scope="col">Bookings</th></tr></thead>
                    <tbody>{[...points].reverse().map(point => <tr key={point.date}>
                      <th scope="row">{monthLabel(point.date)}{point.date.slice(0, 7) === currentMonth ? <span>This month · to date</span> : point.date.slice(0, 7) === lastMonth ? <span>Last month</span> : null}</th>
                      <td>{number(point.bookings)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </div>}
            </div>
            {isAdmin && <div className="booking-by-rep">
              <div className="booking-rep-heading"><div><span className="booking-eyebrow">TEAM CONTRIBUTION</span><h3>Bookings by rep</h3></div><Users size={17} /></div>
              <div className="booking-rep-scroll" aria-label="Bookings by rep bar chart">
                {report.reps.length ? report.reps.map((rep, index) => <button key={rep.id} type="button" className={`booking-rep-row ${selectedRep?.id === rep.id ? "active" : ""}`} onClick={() => setRepId(repId === rep.id ? "" : rep.id)} aria-label={`${rep.name}: ${rep.bookings} bookings. Show booking trend.`} aria-pressed={selectedRep?.id === rep.id}>
                  <span className={`booking-rep-avatar tone-${index % 4}`}>{initials(rep.name)}</span><span className="booking-rep-detail"><span className="booking-rep-name">{rep.name}<strong>{number(rep.bookings)}</strong></span><span className="booking-rep-track"><span style={{ width: `${rep.bookings / maxRepBookings * 100}%` }} /></span></span>
                </button>) : <p className="booking-empty">No reps found.</p>}
              </div>
              <div className="booking-rep-footer"><span>Choose a rep to explore their trend</span><ArrowUpRight size={14} /></div>
            </div>}
          </div>
          {(isAdmin || grouping !== "month") && <details className="booking-details"><summary>{grouping === "month" ? "View counts by rep" : "View booking counts"} <ChevronRight size={14} /></summary>
            {isAdmin && <table><caption>Bookings by rep · {rangeLabel}</caption><thead><tr><th>Rep</th><th>Bookings</th></tr></thead><tbody>{report.reps.map(rep => <tr key={rep.id}><td>{rep.name}</td><td>{number(rep.bookings)}</td></tr>)}</tbody></table>}
            {grouping !== "month" && <div className="booking-table-scroll"><table><caption>{selectedRep?.name ?? (isAdmin ? "All reps" : "Your bookings")} · per {grouping}</caption><thead><tr><th>Date</th><th>Bookings</th></tr></thead><tbody>{points.map(point => <tr key={point.date}><td>{point.date}{point.end !== point.date ? ` – ${point.end}` : ""}</td><td>{number(point.bookings)}</td></tr>)}</tbody></table></div>}
          </details>}
        </> : conversion ? <div className="booking-conversion">
          <div className="booking-conversion-main">
            <div className="booking-conversion-hero"><span className="booking-conversion-kicker"><PhoneOutgoing size={16} />CALLS TO BOOKINGS</span><h3>{conversion.repName}</h3><strong className="booking-percentage">{percent(conversion.percentage)}</strong><p>{number(conversion.bookedPeople)} people booked ÷ {number(conversion.connectedPeople)} people connected × 100</p><div className="booking-conversion-period"><CalendarDays size={14} />{rangeLabel}</div></div>
            <div className="booking-conversion-breakdown"><div className="booking-conversion-heading"><div><h3>Behind the percentage</h3><p>People she connected with, counted once.</p></div><span className="booking-badge"><Check size={13} />Each person counts once</span></div>
              <dl className="booking-conversion-counts">
                <div><dt><Users size={15} />People connected</dt><dd>{number(conversion.connectedPeople)}</dd><p>Excludes unanswered calls</p></div>
                <div><dt><CalendarDays size={15} />People who booked</dt><dd>{number(conversion.bookedPeople)}</dd><p>From those connected people</p></div>
                <div><dt><Users size={15} />Not booked yet</dt><dd>{number(conversion.connectedPeople - conversion.bookedPeople)}</dd><p>Connected, without a later booking</p></div>
                <div><dt><PhoneOutgoing size={15} />Repeat connections excluded</dt><dd>{number(conversion.repeatConnections)}</dd><p>Double dials and repeat conversations</p></div>
              </dl>
              {conversion.percentage === null && <p className="booking-no-calls">No connected people in this period, so there is no percentage yet.</p>}
            </div>
          </div>
          <details className="booking-metric-definition"><summary>How this percentage is calculated <ChevronRight size={14} /></summary>
            <p>Of the people {conversion.repName} connected with in the selected period, the percentage who subsequently booked with {conversion.repName}. Each person counts once, including double dials and repeat conversations. A connection follows the portal rule: at least 15 seconds, or manually marked connected. Unanswered, failed and pending calls are excluded.</p>
            <p>Only bookings linked to those people count. Later bookings are included up to the last update, even if made after the selected period. Calls after a booking or deposit payment, test/demo records, inbound calls and clinic prospecting are excluded.</p>
          </details>
        </div> : <p className="booking-empty">{isAdmin ? "Nina's rep account could not be found." : "Your rep account could not be found."}</p>}
      </div>}
      <div className="booking-report-footnote"><span><Clock3 size={12} />Sydney time</span><span>By date booked · Reschedules count once</span></div>
    </div>
  </section>;
}
