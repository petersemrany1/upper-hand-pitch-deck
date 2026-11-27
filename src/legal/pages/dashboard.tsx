// Ported from the Legal app (family-law-floater/src/routes/_authenticated/dashboard.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteContext } from "@/legal/runtime/router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, CalendarDays, Target, Users, PhoneCall, Info } from "lucide-react";
import { toast } from "sonner";
import { BookingPerformanceView } from "@/legal/components/BookingPerformanceView";
import { ReportingPeriodSelect } from "@/legal/components/ReportingPeriodSelect";
import { getBookingPerformance, saveBookingTarget } from "@/legal/lib/reporting.functions";
import { type ReportingPeriod, periodDates } from "@/legal/lib/reporting-period";
import { APP_TIMEZONE, sydneyTodayISO } from "@/legal/lib/timezone";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/legal/components/ui/dialog";
import "@/legal/components/dashboard-overview.css";
import "@/legal/components/dashboard/legal-reporting.css";
// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { DashboardPage as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [{ title: "Dashboard — Legal Group Portal" }, { name: "robots", content: "noindex" }],
  }),
  component: DashboardPage,
});
function DashboardPage() {
  const [bookingTab, setBookingTab] = useState<"bookings" | "conversion">("bookings");
  const { role } = useRouteContext({ from: "/_authenticated" });
  const [period, setPeriod] = useState<ReportingPeriod>("all"),
    [start, setStart] = useState(sydneyTodayISO()),
    [end, setEnd] = useState(sydneyTodayISO());
  const [conversionPeriod, setConversionPeriod] = useState<ReportingPeriod>("month"),
    [cs, setCs] = useState(sydneyTodayISO()),
    [ce, setCe] = useState(sydneyTodayISO()),
    [city, setCity] = useState(""),
    [repId, setRepId] = useState("");
  const [editing, setEditing] = useState(false),
    [targetRep, setTargetRep] = useState(""),
    [target, setTarget] = useState(""),
    [saving, setSaving] = useState(false);
  const load = useServerFn(getBookingPerformance),
    saveTarget = useServerFn(saveBookingTarget),
    cache = useQueryClient();
  const performance = useQuery({
    queryKey: ["legal-dashboard", period, start, end, repId],
    queryFn: () => load({ data: { period, start, end, repId } }),
    refetchInterval: 60000,
  });
  const conversions = useQuery({
    queryKey: ["legal-dashboard-conversions", conversionPeriod, cs, ce, city],
    queryFn: () => load({ data: { period: conversionPeriod, start: cs, end: ce, city } }),
    refetchInterval: 60000,
  });
  const report = performance.data,
    totals = conversions.data?.conversionTotals;
  const percent = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
  const now = new Date(),
    month = sydneyTodayISO(now).slice(0, 7);
  const caption = now.toLocaleDateString("en-AU", {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <main className="legal-reporting dashboard-overview">
      <div className="dashboard-overview-shell">
        <header className="dashboard-overview-heading">
          <div>
            <div className="dashboard-breadcrumb">
              Legal Group <span>/</span> Overview
            </div>
            <h1>
              {role.isAdmin ? "Performance overview" : "Your performance"}
              <span>.</span>
            </h1>
            <p>
              {role.isAdmin
                ? "Here’s how your team is tracking."
                : "Every conversation is a step towards helping your next client."}
            </p>
          </div>
          <div className="dashboard-heading-actions">
            <span>
              <CalendarDays size={14} />
              {caption}
            </span>
            <Link to="/booked-appointments" search={{ biz: "legal" } as never} className="dashboard-action-link">
              View appointments <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        {role.isAdmin && report && (
          <label className="legal-rep-filter">
            Conversion report for{" "}
            <select
              value={repId || report.conversion?.repId || ""}
              onChange={(e) => setRepId(e.target.value)}
            >
              <option value="">Select a rep</option>
              {report.reps
                .filter((r) => r.id !== "unassigned")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <BookingPerformanceView
          tab={bookingTab}
          onTab={setBookingTab}
          report={report}
          isAdmin={role.isAdmin}
          loading={performance.isPending}
          error={performance.error?.message}
          onRetry={() => void performance.refetch()}
          period={period}
          onPeriod={setPeriod}
          start={start}
          end={end}
          onStart={setStart}
          onEnd={setEnd}
        />
        <section className="dashboard-overview-card dashboard-conversion-card">
          <div className="dashboard-card-heading">
            <div>
              <h2>Lead & conversation conversion</h2>
              <p>Understand each step from first contact to booking.</p>
            </div>
            <div className="dashboard-filters">
              <select
                aria-label="Conversion city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {report?.cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <ReportingPeriodSelect
                value={conversionPeriod}
                onChange={setConversionPeriod}
                start={cs}
                end={ce}
                onStart={setCs}
                onEnd={setCe}
              />
            </div>
          </div>
          {conversions.error && (
            <p role="alert">
              Could not update conversion figures.{" "}
              <button onClick={() => void conversions.refetch()}>Retry</button>
            </p>
          )}
          <div className="dashboard-conversion-grid">
            {[
              {
                label: "Leads called → bookings",
                count: totals?.called,
                detail: "unique clients called",
              },
              {
                label: "Connections → bookings",
                count: totals?.connected,
                detail: "connected clients",
              },
              { label: "Conversations → bookings", count: totals?.convos, detail: "conversations" },
            ].map((m, i) => (
              <div key={m.label} className="dashboard-conversion-stat">
                <div className="dashboard-conversion-label">
                  <span className="dashboard-step-number">0{i + 1}</span>
                  {m.label}
                </div>
                <strong>
                  {totals && !conversions.error ? percent(totals.booked, m.count ?? 0) : "—"}
                </strong>
                <p>
                  {totals ? `${totals.booked} bookings from ${m.count} ${m.detail}` : "Loading…"}
                </p>
              </div>
            ))}
          </div>
          <details className="legal-definition">
            <summary>
              <Info size={13} /> How these figures are counted
            </summary>
            <p>
              Bookings created in the selected Sydney dates divided by unique clients called per
              rep. Connections require 15 seconds; conversations require 2 minutes. Pending calls,
              tests, firm prospecting and calls after deposit payment are excluded. Bookings and
              calls use their own dates, so these period ratios may exceed 100%. The conversion tab
              above follows the same people through to a later booking.
            </p>
          </details>
        </section>
        {report && (
          <>
            <div className="dashboard-section-heading">
              <h2>Today, at a glance</h2>
              <span>Bookings, new clients and your monthly goal</span>
            </div>
            <section className="dashboard-overview-card">
              <div className="dashboard-card-heading">
                <div>
                  <h2>Booked today</h2>
                  <p>New bookings, with the source that brought them in.</p>
                </div>
                <span className="dashboard-count-badge">
                  {report.todayBookings.length} bookings
                </span>
              </div>
              <div className="legal-table-scroll">
                <table className="legal-report-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Firm</th>
                      <th>Consultation</th>
                      <th>Ad / source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.todayBookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.name || "Unnamed client"}</td>
                        <td>{b.firm}</td>
                        <td>
                          {b.date} · {b.time}
                        </td>
                        <td>{b.ad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!report.todayBookings.length && (
                  <p className="dashboard-empty">
                    No bookings made today yet. Your next booking will appear here.
                  </p>
                )}
              </div>
            </section>
            <div className="dashboard-secondary-grid">
              <section className="dashboard-overview-card">
                <div className="dashboard-card-heading">
                  <div>
                    <h2>
                      <Users size={16} /> New clients today
                    </h2>
                    <p>The latest opportunities for your team.</p>
                  </div>
                  <span className="dashboard-count-badge">{report.newLeads.length}</span>
                </div>
                <div className="dashboard-lead-list">
                  {report.newLeads.map((l) => (
                    <Link
                      key={l.id}
                      to="/sales-call" search={{ biz: "legal", ...({ lead: l.id }) } as never}
                      className="dashboard-lead-row"
                    >
                      <span className="dashboard-lead-avatar">
                        {l.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="dashboard-lead-info">
                        <strong>{l.name}</strong>
                        <span>{l.source}</span>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                  {!report.newLeads.length && (
                    <p className="dashboard-empty">No new clients yet today.</p>
                  )}
                </div>
                <Link to="/leads" search={{ biz: "legal" } as never} className="dashboard-card-footer">
                  View all leads →
                </Link>
              </section>
              <section className="dashboard-overview-card dashboard-goal-card">
                <div className="dashboard-card-heading">
                  <div>
                    <h2>
                      <Target size={16} /> Monthly booking goal
                    </h2>
                    <p>
                      {now.toLocaleDateString("en-AU", {
                        month: "long",
                        year: "numeric",
                        timeZone: APP_TIMEZONE,
                      })}
                    </p>
                  </div>
                  {role.isAdmin && (
                    <button className="dashboard-text-button" onClick={() => setEditing(true)}>
                      {report.target ? "Edit target" : "Set target"}
                    </button>
                  )}
                </div>
                <div className="dashboard-goal-body">
                  <div className="dashboard-goal-value">
                    <strong>{report.monthlyBookings}</strong>
                    <span>
                      {report.target ? `of ${report.target} bookings` : "bookings this month"}
                    </span>
                  </div>
                  <div className="dashboard-goal-track">
                    <span
                      style={{
                        width: `${report.target ? Math.min(100, (report.monthlyBookings / report.target) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p>
                    {report.target
                      ? `${Math.max(0, report.target - report.monthlyBookings)} bookings to go`
                      : "Set a target to track your progress"}
                  </p>
                </div>
              </section>
            </div>
            <div className="dashboard-secondary-grid dashboard-operations-grid">
              {report.capacity && (
                <section className="dashboard-overview-card">
                  <div className="dashboard-card-heading">
                    <div>
                      <h2>Firm capacity</h2>
                      <p>Shows remaining across active firm packs.</p>
                    </div>
                    <span className="dashboard-count-badge">{report.capacity.toBook} to fill</span>
                  </div>
                  <div className="dashboard-capacity-list">
                    {report.capacity.rows.map((f) => (
                      <div key={f.id} className="dashboard-capacity-row">
                        <span>{f.name}</span>
                        <span>
                          {f.toBook} to book · {f.booked} reserved · {f.remaining} owed
                        </span>
                      </div>
                    ))}
                    {!report.capacity.rows.length && <p>No outstanding pack capacity.</p>}
                  </div>
                </section>
              )}
              <section className="dashboard-overview-card">
                <div className="dashboard-card-heading">
                  <h2>
                    <PhoneCall size={16} /> Pickup rate
                  </h2>
                  <span>{periodDates(conversionPeriod, cs, ce)?.start ?? "All time"}</span>
                </div>
                <div className="dashboard-goal-body">
                  <strong className="legal-large-number">
                    {conversions.data?.pickup.percentage == null
                      ? "—"
                      : `${Math.round(conversions.data.pickup.percentage)}%`}
                  </strong>
                  <p>
                    {conversions.data?.pickup.answered ?? "—"} answered of{" "}
                    {conversions.data?.pickup.dials ?? "—"} client calls · same period and city as
                    conversion
                  </p>
                  <p>At least 10 seconds, excluding failed calls.</p>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly booking target</DialogTitle>
          </DialogHeader>
          <label>
            Rep
            <select value={targetRep} onChange={(e) => setTargetRep(e.target.value)}>
              <option value="">Choose a rep</option>
              {report?.reps
                .filter((r) => r.id !== "unassigned")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Bookings
            <input
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <button
            disabled={
              saving ||
              !targetRep ||
              target === "" ||
              !Number.isInteger(Number(target)) ||
              Number(target) < 0
            }
            onClick={async () => {
              setSaving(true);
              try {
                await saveTarget({ data: { repId: targetRep, month, target: Number(target) } });
                await cache.invalidateQueries({ queryKey: ["legal-dashboard"] });
                setEditing(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not save target");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save target"}
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
