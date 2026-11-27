// Ported from the Legal app (family-law-floater/src/components/numbers/NumbersDashboard.tsx). Re-run the port script to refresh.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  BrainCircuit,
  Lightbulb,
  SlidersHorizontal,
  RefreshCw,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { getNumbersReport } from "@/legal/lib/numbers.functions";
import type { AdPerformanceRow } from "@/legal/lib/numbers.types";
import { sydneyTodayISO, formatSydney } from "@/legal/lib/timezone";
import {
  buildAllCities,
  buildAdStats,
  diagnoseCity,
  sumCityStats,
  withReportingCoverage,
} from "./model";
import { money, oneDp, pctOrDash, resolveRange, type RangeKey } from "./format";
import { CreativeInsights } from "./CreativeInsights";
import { CallInsights } from "./CallInsights";
import { ReportingOverview } from "./ReportingOverview";
import { Ideation, type CreativeDraft } from "./Ideation";
import type { HookListItem } from "@/legal/lib/call-hooks";
import { ReportingSettings, type SettingsPanel } from "./ReportingSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/legal/components/ui/dialog";
import "@/legal/components/dashboard/legal-reporting.css";
import "./insights.css";
import "./numbers.css";

export type NumbersView = "brain" | "ideation" | "tracking";
const EMPTY_DRAFT: CreativeDraft = {
  hook: "",
  meat: "",
  cta: "",
  sourceCallId: null,
  concern: "",
};
const sections = [
  ["brain", "Brain", "Learn from your clients", BrainCircuit],
  ["ideation", "Ideation", "Create your next ad", Lightbulb],
  ["tracking", "Tracking", "See what works", BarChart3],
] as const;
const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  }).format(new Date(`${date}T12:00:00Z`));
export function NumbersDashboard({
  initialView = "brain",
  initialTrackingView = "ads",
  userId,
}: {
  initialView?: NumbersView;
  initialTrackingView?: "ads" | "business";
  userId?: string;
}) {
  const [view, setView] = useState<NumbersView>(initialView);
  const [trackingView, setTrackingView] = useState<"ads" | "business">(initialTrackingView);
  const business = view === "tracking" && trackingView === "business";
  const [draft, setDraft] = useState<CreativeDraft>(EMPTY_DRAFT);
  const [pendingHook, setPendingHook] = useState<HookListItem | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string | undefined>();
  const [storageStatus, setStorageStatus] = useState<"saved" | "unavailable" | "loading">(
    "loading",
  );
  useEffect(() => {
    setDraft(EMPTY_DRAFT);
    setPendingHook(null);
    setDraftLoaded(false);
    try {
      const raw = userId ? localStorage.getItem(`numbers-creative-draft:${userId}`) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          ["hook", "meat", "cta", "concern"].every(
            (k) => typeof parsed[k] === "string" && parsed[k].length <= 4000,
          ) &&
          (parsed.sourceCallId === null || typeof parsed.sourceCallId === "string")
        )
          setDraft(parsed);
      }
      setStorageStatus(userId ? "saved" : "unavailable");
    } catch {
      setStorageStatus("unavailable");
    }
    setDraftOwner(userId);
    setDraftLoaded(true);
  }, [userId]);
  useEffect(() => {
    if (!draftLoaded || !userId || draftOwner !== userId) return;
    try {
      localStorage.setItem(`numbers-creative-draft:${userId}`, JSON.stringify(draft));
      setStorageStatus("saved");
    } catch {
      setStorageStatus("unavailable");
    }
  }, [draft, draftLoaded, draftOwner, userId]);
  const useHook = (item: HookListItem) => {
    if (!item.hook || !draftLoaded) return;
    if (draft.hook.trim() && draft.hook !== item.hook) setPendingHook(item);
    else
      setDraft({
        ...draft,
        hook: item.hook,
        sourceCallId: item.callId,
        concern: item.insight ?? "",
      });
    setView("ideation");
  };
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [from, setFrom] = useState(resolveRange("30d", "", "").from!);
  const [to, setTo] = useState(sydneyTodayISO());
  const [city, setCity] = useState("");
  const [countMyPay, setCountMyPay] = useState(true);
  const [panel, setPanel] = useState<SettingsPanel>(null);
  const [drill, setDrill] = useState<AdPerformanceRow | null>(null);
  const range = useMemo(() => resolveRange(rangeKey, from, to), [rangeKey, from, to]);
  const validRange =
    rangeKey !== "custom" || (!!from && !!to && from <= to && to <= sydneyTodayISO());
  const usesRange = view === "tracking";
  const queryRange = range;
  const queryValid = validRange;
  const load = useServerFn(getNumbersReport);
  const report = useQuery({
    queryKey: ["legal-numbers", queryRange.from, queryRange.to, countMyPay],
    queryFn: () => load({ data: { ...queryRange, excludePeter: !countMyPay } }),
    staleTime: 60_000,
    refetchInterval: business ? 60_000 : false,
    enabled: business && queryValid,
  });
  const data = queryValid ? report.data : undefined;
  const { cities, all, unallocated, website } = useMemo(() => {
    const result = buildAllCities(
      data?.locations ?? [],
      data?.labourByLocation ?? [],
      data?.revenueByLocation ?? [],
    );
    const costed = (stats: ReturnType<typeof sumCityStats>) =>
      withReportingCoverage(stats, {
        spend: data?.coverageComplete ?? false,
        labour: data?.labourComplete ?? false,
        revenue: data?.revenueComplete ?? false,
      });
    return {
      ...result,
      cities: result.cities.map(costed),
      all: costed(result.all),
      website: result.website ? costed(result.website) : null,
    };
  }, [data]);
  // An unavailable city must not create an unverified zero-value report after a date change.
  const selectedCity = cities.some((c) => c.key === city) ? city : "";
  const scope = selectedCity ? cities.find((c) => c.key === selectedCity)! : all;
  const diagnosed = cities.map((c) => ({
    city: c,
    diagnosis: diagnoseCity(c, all, { money, pct: pctOrDash, oneDp }),
  }));
  const adStats = buildAdStats(
    (data?.ads ?? []).filter((a) => !selectedCity || a.location === selectedCity),
    data?.pipelines ?? {},
    data?.coverageComplete ?? false,
  );
  const stale =
    !data?.coverageComplete ||
    data?.syncState.last_status !== "ok" ||
    (!!data?.syncState.last_synced_at &&
      Date.now() - Date.parse(data.syncState.last_synced_at) > 26 * 3600000);
  const selectRange = (key: RangeKey) => {
    if (key === "custom") {
      setFrom(range.from ?? resolveRange("30d", "", "").from!);
      setTo(range.to ?? sydneyTodayISO());
    }
    setRangeKey(key);
  };
  return (
    <main className="legal-reporting legal-numbers">
      <div className="numbers-page">
        <header className="numbers-heading">
          <div>
            <h1>Numbers</h1>
            <p>Learn. Create. Improve.</p>
          </div>
          <div className="numbers-header-tools">
            <span className="numbers-context">
              AUD <span aria-hidden="true">·</span> Sydney time
            </span>
            {business && (
              <button
                className="numbers-button"
                aria-label="Manage reporting data"
                disabled={!data}
                onClick={() => setPanel("menu")}
              >
                <SlidersHorizontal size={15} aria-hidden="true" /> <span>Manage data</span>
              </button>
            )}
          </div>
        </header>
        <nav className="numbers-navigation" aria-label="Numbers sections">
          {sections.map(([key, label, description, Icon]) => (
            <button
              key={key}
              aria-pressed={view === key}
              onClick={() => {
                setView(key);
                setPanel(null);
                setDrill(null);
              }}
            >
              <Icon size={20} aria-hidden="true" />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </button>
          ))}
        </nav>
        {view === "tracking" && (
          <div className="tracking-controls">
            <div className="tracking-navigation" role="group" aria-label="Tracking view">
              <button
                aria-pressed={trackingView === "ads"}
                onClick={() => {
                  setTrackingView("ads");
                  setPanel(null);
                }}
              >
                Ad performance
              </button>
              <button
                aria-pressed={trackingView === "business"}
                onClick={() => setTrackingView("business")}
              >
                Business results
              </button>
            </div>
            <div className="numbers-filterbar">
              <label className="numbers-period">
                <CalendarDays size={16} aria-hidden="true" />
                <span className="sr-only">Date range</span>
                <select
                  aria-label="Date range"
                  value={rangeKey}
                  onChange={(e) => selectRange(e.target.value as RangeKey)}
                >
                  <option value="30d">Last 30 days</option>
                  <option value="month">This month</option>
                  <option value="60d">Last 60 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                  <option value="custom">Custom dates</option>
                </select>
              </label>
              {rangeKey === "custom" ? (
                <div className="numbers-custom-dates">
                  <label>
                    From
                    <input
                      type="date"
                      value={from}
                      max={to || sydneyTodayISO()}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      value={to}
                      min={from}
                      max={sydneyTodayISO()}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <span className="numbers-range-label">
                  {range.from && range.to
                    ? `${dayLabel(range.from)} – ${dayLabel(range.to)}`
                    : "All available history"}
                </span>
              )}
              {business && (
                <>
                  <label className="numbers-city">
                    <span className="sr-only">Location</span>
                    <select
                      aria-label="Location"
                      value={selectedCity}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">All locations</option>
                      {cities.map((c) => (
                        <option key={c.key}>{c.key}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          </div>
        )}
        {usesRange && !validRange && (
          <div className="numbers-notice" role="alert">
            <AlertCircle size={17} /> Choose a start and end date, with the start first and neither
            date in the future.
          </div>
        )}
        {view === "tracking" && trackingView === "ads" && validRange && (
          <CreativeInsights range={range} />
        )}
        {view === "brain" && <CallInsights onUseHook={useHook} />}
        {view === "ideation" && (
          <Ideation
            draft={draft}
            onChange={setDraft}
            pendingHook={pendingHook}
            onAcceptHook={() => {
              if (pendingHook?.hook)
                setDraft({
                  ...draft,
                  hook: pendingHook.hook,
                  sourceCallId: pendingHook.callId,
                  concern: pendingHook.insight ?? "",
                });
              setPendingHook(null);
            }}
            onDismissHook={() => setPendingHook(null)}
            onUseHook={useHook}
            onViewBrain={() => setView("brain")}
            storageStatus={storageStatus}
          />
        )}
        {business && (
          <>
            <div className="numbers-section-heading">
              <div>
                <h2>Business results</h2>
                <p>Enquiries, bookings and the cost of getting there.</p>
              </div>
              <button
                className="numbers-button"
                disabled={report.isFetching || !queryValid}
                onClick={() => void report.refetch()}
              >
                <RefreshCw size={15} aria-hidden="true" /> Refresh
              </button>
            </div>
            {report.error && (
              <div className="numbers-notice" role="alert">
                <AlertCircle size={18} />
                <div>
                  <strong>Couldn’t load the latest report.</strong>
                  <p>{data ? "Showing saved results. " : ""}Try Refresh in a moment.</p>
                </div>
              </div>
            )}
            {report.isPending && queryValid && (
              <div className="numbers-loading" role="status">
                Loading your report…
                <div className="numbers-skeletons">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            {data && business && (
              <>
                <div className="numbers-report-status">
                  <span>
                    {stale ? "Saved spend snapshot" : "Spend imported"}:{" "}
                    {data.syncState.last_synced_at
                      ? formatSydney(data.syncState.last_synced_at)
                      : "awaiting first import"}
                  </span>
                  <span>
                    Reporting through {dayLabel(data.reportingRange.to)}
                    {data.reportingRange.to === sydneyTodayISO() ? " · Today may change" : ""}
                  </span>
                  {!countMyPay && <strong>Peter’s pay excluded</strong>}
                </div>
                <ReportingOverview
                  scope={scope}
                  all={all}
                  diagnosed={diagnosed}
                  selectedCity={selectedCity}
                  onSelectCity={setCity}
                  adRows={adStats.rows}
                  onDrill={setDrill}
                  unallocated={unallocated}
                  website={website}
                  countMyPay={countMyPay}
                  spendStale={stale}
                  warnings={data.warnings}
                  onOutcomes={() => setPanel("outcomes")}
                />
              </>
            )}
          </>
        )}
      </div>
      {data && (
        <ReportingSettings
          data={data}
          range={range}
          panel={panel}
          setPanel={setPanel}
          countMyPay={countMyPay}
          setCountMyPay={setCountMyPay}
          onSaved={() => report.refetch()}
        />
      )}
      <Dialog
        open={!!drill}
        onOpenChange={(open) => {
          if (!open) setDrill(null);
        }}
      >
        <DialogContent className="numbers-settings legal-reporting">
          <DialogHeader>
            <DialogTitle>{drill?.ad_name}</DialogTitle>
            <DialogDescription>
              Client enquiries in the selected reporting period.
            </DialogDescription>
          </DialogHeader>
          <div className="legal-table-scroll">
            <table className="legal-report-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Calls</th>
                  <th>Outcome</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {data?.outcomes
                  .filter((l) => l.reporting_key === drill?.reporting_key)
                  .map((l) => (
                    <tr key={l.lead_id}>
                      <td>{[l.first_name, l.last_name].filter(Boolean).join(" ")}</td>
                      <td>{l.calls}</td>
                      <td>
                        {l.is_showed
                          ? "Attended"
                          : l.is_noshow
                            ? "No show"
                            : l.is_upcoming
                              ? "Upcoming"
                              : l.needs_outcome
                                ? "Outcome needed"
                                : l.is_disqualified
                                  ? "Disqualified"
                                  : l.status}
                      </td>
                      <td>{formatSydney(l.created_at, { dateStyle: "medium" })}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
