// Ported from the Legal app (family-law-floater/src/components/numbers/CreativeInsights.tsx). Re-run the port script to refresh.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ChevronDown, Film, RefreshCw, Search, Trophy } from "lucide-react";
import { getAdMetrics } from "@/legal/lib/numbers-insights.functions";
import { filterTrackingAds } from "@/legal/lib/ad-outcomes";
import {
  adSignals,
  adLeaders,
  aggregateAdMetrics,
  divide,
  groupAds,
  type AdGrouping,
  type AdMetrics,
  type AdMetricRow,
} from "@/legal/lib/ad-metrics";
import { formatSydney } from "@/legal/lib/timezone";
import { AdWinners } from "./AdWinners";
import { VideoStages } from "./VideoStages";
import type { VideoStage } from "@/legal/lib/video-stages";

const n = (v: number | null) =>
  v === null ? "—" : new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(v);
const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const cash = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(v);
const secs = (v: number | null) => (v === null ? "—" : `≈ ${v.toFixed(1)}s`);

export function CreativeInsights({ range }: { range: { from: string | null; to: string | null } }) {
  const load = useServerFn(getAdMetrics);
  const [grouping, setGrouping] = useState<AdGrouping>("ad");
  const [split, setSplit] = useState(false);
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("lead");
  const [stage, setStage] = useState<VideoStage>("hook");
  const report = useQuery({
    queryKey: ["ad-creative-metrics", range.from, range.to],
    queryFn: () => load({ data: range }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const data = report.data;
  const { rows, ads, locations, selectedLocation } = useMemo(
    () => filterTrackingAds(data?.rows ?? [], data?.outcomes?.ads ?? [], location, search),
    [data, location, search],
  );
  const complete = data?.coverageComplete ?? false;
  const groups = useMemo(
    () =>
      groupAds(rows, grouping, split, complete).sort((a, b) =>
        sort === "lead"
          ? (a.metrics.costPerLead ?? Infinity) - (b.metrics.costPerLead ?? Infinity)
          : sort === "retention"
            ? (b.metrics.retention95 ?? -1) - (a.metrics.retention95 ?? -1)
            : b.metrics.spend - a.metrics.spend,
      ),
    [rows, grouping, split, complete, sort],
  );
  const totals = aggregateAdMetrics(rows, complete);
  const stale =
    !data?.lastSynced ||
    !Number.isFinite(Date.parse(data.lastSynced)) ||
    Date.now() - Date.parse(data.lastSynced) > 26 * 3600000;
  const leaders = adLeaders(rows, complete && !stale && !data?.syncFailed);
  const signalsFor = (metrics: AdMetrics) =>
    stale || data?.syncFailed
      ? [
          {
            tone: "neutral",
            label: "Refresh before judging",
            detail:
              "Health signals are withheld while the source snapshot is stale or the latest import has failed.",
          },
        ]
      : adSignals(metrics);
  return (
    <section className="insights-workspace numbers-ads" aria-label="Ad creative performance">
      <div className="numbers-section-heading">
        <div>
          <h2>What works best?</h2>
        </div>
        <button
          className="numbers-button"
          disabled={report.isFetching}
          onClick={() => void report.refetch()}
          aria-label="Refresh ad results"
        >
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>
      {report.error && (
        <div className="insights-notice" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Ad insights could not load.</strong>
            <p>Try Refresh in a moment.</p>
            {data && <p>Showing the previous snapshot.</p>}
            <button className="insights-button" onClick={() => void report.refetch()}>
              Try again
            </button>
          </div>
        </div>
      )}
      {report.isPending && (
        <div className="insights-empty" role="status">
          Loading verified ad data…
        </div>
      )}
      {data && (
        <>
          <div className="numbers-report-status">
            <span>
              {data.accountName ?? "Legal Group"} · {data.currency ?? "Currency unverified"}
            </span>
            <span>
              Imported {data.lastSynced ? formatSydney(data.lastSynced) : "never"}
              {data.provisional ? " · Today may change" : ""}
            </span>
          </div>
          {(!complete || stale || data.syncFailed || data.metricsRows !== data.totalRows) && (
            <div className="insights-notice">
              <AlertCircle size={17} />
              <p>
                {!complete &&
                  (data.missingDays
                    ? `${data.missingDays} ${data.missingDays === 1 ? "day is" : "days are"} missing verified ad data. Meta counts cover imported records only. `
                    : "Ad spend is awaiting source verification. ")}
                {(stale || data.syncFailed) &&
                  "This is a saved snapshot; the latest refresh is stale or failed. "}
                {data.metricsRows !== data.totalRows &&
                  `Video data is available on ${data.metricsRows} of ${data.totalRows} daily records. Missing fields stay unavailable.`}
              </p>
            </div>
          )}
          <div className="insights-toolbar numbers-ad-toolbar stage-filters">
            <label className="insights-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search ads</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find an ad"
              />
            </label>
            <label>
              <span className="sr-only">Location</span>
              <select
                aria-label="Ad location"
                value={selectedLocation}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            {(search || selectedLocation) && (
              <button
                className="numbers-button"
                onClick={() => {
                  setSearch("");
                  setLocation("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          {data.outcomes && <AdWinners report={data.outcomes} trusted={!report.error} rows={ads} />}
          <div className="numbers-section-heading">
            <div>
              <h2>Video performance</h2>
              <p>How the opening, middle and ending hold attention.</p>
            </div>
          </div>
          <VideoStages
            rows={rows}
            trusted={complete && !stale && !data.syncFailed}
            stage={stage}
            onStage={setStage}
          />
          <article className="numbers-lead-result" aria-label="Whole-ad lead result">
            <Trophy size={21} aria-hidden="true" />
            <div>
              <span>Lowest cost per lead · whole ad</span>
              <h3>{leaders.lead?.name ?? "No reliable lead-cost leader yet"}</h3>
              <p>
                {leaders.lead
                  ? `${n(leaders.lead.metrics.metaLeads)} Meta leads · ${cash(leaders.lead.metrics.spend)} spend`
                  : "Needs a current, complete import, 5 leads and 1,000 impressions per ad."}
              </p>
            </div>
            <strong>
              {cash(leaders.lead?.metrics.costPerLead ?? null)}
              <small>per Meta lead</small>
            </strong>
            <details className="numbers-help">
              <summary>Why this ad leads</summary>
              <p>
                Lowest observed cost per lead among {leaders.candidates} qualifying individual ads.
                Early evidence, not proof of qualified client outcomes or of which video part caused
                a lead.
              </p>
              {leaders.lead && (
                <p>
                  Ad {leaders.lead.adIds[0]} · {leaders.lead.locations.join(" / ")}
                </p>
              )}
            </details>
          </article>
          <div className="numbers-kpi-grid ad-totals">
            <Metric
              label="Ad spend"
              value={cash(complete ? totals.spend : null)}
              note={`${new Set(rows.map((r) => r.ad_id)).size} individual ads in this view`}
            />
            <Metric
              label="Meta-reported leads"
              value={n(totals.metaLeads)}
              note={complete ? "Enquiries attributed by Meta" : "From imported records only"}
            />
            <Metric
              label="Average cost per lead"
              value={cash(totals.costPerLead)}
              note="Ad spend ÷ Meta-reported leads"
            />
          </div>
          <details className="numbers-disclosure ad-source-library">
            <summary>
              <span>
                <strong>Ad details & source records</strong>
                <small>Video metrics, grouping and original records</small>
              </span>
              <ChevronDown size={18} />
            </summary>
            <div className="numbers-disclosure-body">
              <div className="insights-toolbar">
                <label>
                  Detail order
                  <select value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="lead">Lowest cost per lead</option>
                    <option value="spend">Highest spend</option>
                    <option value="retention">Most watched to 95%</option>
                  </select>
                </label>
              </div>
              <details className="numbers-help numbers-ad-options">
                <summary>
                  Grouping options{grouping !== "ad" || split ? " · Custom grouping applied" : ""}
                </summary>
                <div className="insights-toolbar">
                  <label>
                    Group ads
                    <select
                      value={grouping}
                      onChange={(e) => setGrouping(e.target.value as AdGrouping)}
                    >
                      <option value="ad">Individual ads</option>
                      <option value="creative">Same creative ID</option>
                      <option value="name">Same exact name (may mix creatives)</option>
                    </select>
                  </label>
                  <label className="insights-check">
                    <input
                      type="checkbox"
                      checked={split}
                      onChange={(e) => setSplit(e.target.checked)}
                    />{" "}
                    Split locations
                  </label>
                </div>
                <p>
                  Individual ads stay separate by ad ID. Creative grouping combines only identical
                  creative IDs. Locations come from campaign labels, not viewer geography.
                </p>
              </details>
              {grouping === "name" && (
                <div className="numbers-notice">
                  You are explicitly combining identical names, including different creative IDs.
                  Review the individual records before treating a group as one creative.
                </div>
              )}
              {grouping === "creative" && (
                <p className="numbers-small-note">
                  Grouped by creative ID. Different IDs with the same name stay separate.
                </p>
              )}
              <div className="insights-ad-list">
                {groups.map((g) => (
                  <article className="insights-ad" key={g.key}>
                    <header>
                      <div>
                        <h3>{g.name}</h3>
                        <p>
                          {g.locations.join(" · ")}{" "}
                          <span>
                            {" "}
                            / {g.adIds.length} {g.adIds.length === 1 ? "ad" : "ads"}
                            {g.creativeIds.length > 1
                              ? ` · ${g.creativeIds.length} different creative IDs`
                              : ""}
                          </span>
                        </p>
                      </div>
                      {g.adIds.length === 1 && g.adIds[0] === leaders.lead?.adIds[0] && (
                        <span className="numbers-badge positive">Lowest lead cost</span>
                      )}
                    </header>
                    <div className="insights-ad-metrics">
                      <Metric
                        label="Meta leads"
                        value={n(g.metrics.metaLeads)}
                        note="Attributed enquiries"
                      />
                      <Metric
                        label="Cost per lead"
                        value={cash(g.metrics.costPerLead)}
                        note="Spend ÷ Meta leads"
                      />
                      <Metric
                        label="Spend"
                        value={cash(complete ? g.metrics.spend : null)}
                        note="Selected dates"
                      />
                      <Metric
                        label="Watched to 95%"
                        value={pct(g.metrics.retention95)}
                        note="Share of video starts"
                      />
                    </div>
                    <details className="insights-details">
                      <summary>
                        Video results & source records <ChevronDown size={15} aria-hidden="true" />
                      </summary>
                      <div className="insights-ad-metrics ad-video-metrics">
                        <Metric
                          label="3-second view rate"
                          value={pct(g.metrics.hookRate)}
                          note="3-second plays ÷ impressions"
                        />
                        <Metric
                          label="Hold rate"
                          value={pct(g.metrics.holdRate)}
                          note="ThruPlays ÷ 3-second plays"
                        />
                        <Metric
                          label="Average watch"
                          value={secs(g.metrics.averageSeconds)}
                          note="Weighted by video starts"
                        />
                        <Metric
                          label="Cost / ThruPlay"
                          value={cash(g.metrics.costPerThruPlay)}
                          note="15 seconds or shorter completion"
                        />
                      </div>
                      <div className="insights-detail-grid">
                        <div>
                          <h4>Video milestones</h4>
                          <p>
                            Share of starts reaching each point. Skipped plays count; these are play
                            events, not unique people.
                          </p>
                          {([25, 50, 75, 95, 100] as const).map((point) => {
                            const count = g.metrics[`p${point}`],
                              rate = divide(count, g.metrics.starts);
                            return (
                              <div className="insights-retention" key={point}>
                                <span>{point}%</span>
                                <div>
                                  <i style={{ width: `${Math.min(100, (rate ?? 0) * 100)}%` }} />
                                </div>
                                <strong>{pct(rate)}</strong>
                                <small>{n(count)} plays</small>
                              </div>
                            );
                          })}
                        </div>
                        <div>
                          <h4>What to check next</h4>
                          {signalsFor(g.metrics).map((s) => (
                            <p key={s.label}>
                              <strong>{s.label}. </strong>
                              {s.detail}
                            </p>
                          ))}
                          <p>
                            Compare like durations and formats. Their lengths are unavailable here,
                            so a mixed group cannot establish continuous watch-through.
                          </p>
                        </div>
                      </div>
                      <div className="insights-detail-stats">
                        <span>{n(g.metrics.impressions)} impressions</span>
                        <span>{n(g.metrics.clicks)} clicks (all)</span>
                        <span>CTR {pct(g.metrics.ctr)} (all clicks / impressions)</span>
                        <span>Link CTR {pct(g.metrics.linkCtr)}</span>
                        <span>CPC {cash(g.metrics.cpc)}</span>
                        <span>CPM {cash(g.metrics.cpm)}</span>
                        <span>{n(g.metrics.threeSecond)} 3-second plays</span>
                        <span>{n(g.metrics.thruPlays)} ThruPlays</span>
                        <span>100% completion {pct(g.metrics.completion)} of starts</span>
                        <span>Exact 15-second cost {cash(g.metrics.costPer15Seconds)}</span>
                      </div>
                      <AdRecords rows={g.rows} complete={complete} />
                    </details>
                  </article>
                ))}
                {!groups.length && (
                  <div className="insights-empty">
                    <Film size={28} />
                    <h3>No delivered ads in this view</h3>
                    <p>
                      Try another date range or clear the filters. Ads without delivery do not
                      appear in this verified spend ledger.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </details>
          <details className="insights-definitions">
            <summary>How these ad numbers work</summary>
            <p>
              Hook rate = 3-second plays ÷ impressions. Hold rate = ThruPlays ÷ 3-second plays.
              These are our explicit reporting formulas, not universal Meta health scores. A
              3-second play can mean nearly full length for a shorter video. ThruPlay counts
              completion or at least 15 seconds; it is not an exact 15-second count. We do not
              substitute it for your AUD $0.30 target. Exact 15-second counts are unavailable in
              this connection; this is a source limitation, not a missing upload.
            </p>
            <p>
              95% and 100% rates use video starts, excluding replays from the denominator.
              Milestones include skipped plays. Average watch includes replay time; the approximate
              combined figure weights Meta’s rounded daily averages by starts. Unknown fields
              suppress the combined metric, and zero denominators show a dash. Percentages and costs
              are recalculated from totals.
            </p>
            <p>
              Meta leads use actions_lead only, with the connector’s explicit 7-day click / 1-day
              view attribution; component lead types are never added again. These are not qualified
              CRM enquiries or confirmed consultations. Use Tracking’s Business results when
              assessing client outcomes. Recent conversions can be restated by Meta.
            </p>
            <p>
              <a
                href="https://developers.facebook.com/docs/marketing-api/reference/ads-insights/"
                target="_blank"
                rel="noreferrer"
              >
                Meta Insights reference
              </a>{" "}
              ·{" "}
              <a
                href="https://www.facebook.com/business/help/1792720544284355"
                target="_blank"
                rel="noreferrer"
              >
                Meta ThruPlay definition
              </a>
            </p>
          </details>
        </>
      )}
    </section>
  );
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="insights-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function AdRecords({ rows, complete }: { rows: AdMetricRow[]; complete: boolean }) {
  const ads = groupAds(rows, "ad", true, complete);
  return (
    <div className="insights-records">
      <h4>Included ad records</h4>
      {ads.map((ad) => {
        const r = ad.rows[ad.rows.length - 1]!;
        const fetched = ad.rows
          .map((row) => row.metrics_fetched_at)
          .filter((value): value is string => Boolean(value))
          .sort();
        return (
          <div key={ad.key}>
            <strong>
              {ad.name} · {ad.locations.join(", ")}
            </strong>
            <p>
              Ad {r.ad_id} · Creative {r.creative_id ?? "unavailable"}
              <br />
              {r.campaign_name ?? "Unknown campaign"} ({r.campaign_id ?? "—"}) /{" "}
              {r.adset_name ?? "Unknown ad set"} ({r.adset_id ?? "—"})<br />
              {ad.rows[0]!.date} — {r.date} · {cash(complete ? ad.metrics.spend : null)} ·{" "}
              {n(ad.metrics.starts)} starts · {n(ad.metrics.p95)} at 95% · {n(ad.metrics.metaLeads)}{" "}
              Meta leads
              <br />
              {fetched.length === ad.rows.length
                ? `Video snapshots: ${new Date(fetched[0]!).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}–${new Date(fetched[fetched.length - 1]!).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} (Sydney)`
                : "Some daily records have no video snapshot timestamp."}
            </p>
          </div>
        );
      })}
    </div>
  );
}
