// Ported from the Legal app (family-law-floater/src/components/numbers/VideoStages.tsx). Re-run the port script to refresh.
import { ArrowRight, Check, Info } from "lucide-react";
import { rankVideoStage, VIDEO_STAGES, type VideoStage } from "@/legal/lib/video-stages";
import type { AdMetricRow } from "@/legal/lib/ad-metrics";

const percent = (value: number | null) => (value === null ? "—" : `${(value * 100).toFixed(1)}%`);
const count = (value: number | null) => (value === null ? "—" : value.toLocaleString("en-AU"));
const money = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
export function VideoStages({
  rows,
  trusted,
  stage,
  onStage,
}: {
  rows: AdMetricRow[];
  trusted: boolean;
  stage: VideoStage;
  onStage: (stage: VideoStage) => void;
}) {
  const stages = (["hook", "meat", "cta"] as const).map((key) => ({
    key,
    ...VIDEO_STAGES[key],
    ...rankVideoStage(rows, key, trusted),
  }));
  const current = stages.find((item) => item.key === stage)!;
  return (
    <section className="video-stage-workspace" aria-label="Hook, meat and CTA performance">
      <div className="video-stage-heading">
        <div>
          <p>Choose a part to see the ads ranked for it.</p>
        </div>
        <span className="numbers-badge">Higher is better</span>
      </div>
      <div className="video-stage-cards" role="group" aria-label="Choose a video part">
        {stages.map((item, index) => (
          <button
            key={item.key}
            className={`video-stage-card stage-${item.key}`}
            aria-pressed={stage === item.key}
            onClick={() => onStage(item.key)}
          >
            <span className="video-stage-top">
              <span className="video-stage-number">0{index + 1}</span>
              {stage === item.key ? <Check size={16} /> : <ArrowRight size={16} />}
            </span>
            <span className="video-stage-label">{item.label}</span>
            <span className="video-stage-question">{item.question}</span>
            <strong className="video-stage-score">
              {percent(item.leader?.stage.ratio ?? null)}
            </strong>
            <span className="video-stage-measure">{item.measure}</span>
            <span className="video-stage-winner">
              {item.leader?.name ?? (trusted ? "More data needed" : "Awaiting verified data")}
            </span>
            <span className="video-stage-tag">
              {item.leader
                ? item.tied > 1
                  ? "Joint highest"
                  : "Highest observed"
                : "No ranking yet"}
            </span>
          </button>
        ))}
      </div>
      <p className="video-stage-caveat">
        <Info size={14} aria-hidden="true" />
        <span>
          CTA shows ending hold, not which closing words caused a lead. Compare similar video
          lengths.
        </span>
      </p>
      <div className={`video-stage-comparison stage-${stage}`}>
        <header>
          <div>
            <h3>
              {current.label}: {current.question.toLowerCase()}
            </h3>
            <p>
              {current.range} · {current.formula}
            </p>
          </div>
          <span>{trusted ? `${current.candidates} comparable ads` : "Rankings paused"}</span>
        </header>
        {!trusted && (
          <p className="numbers-small-note">
            A complete, current import is needed before naming leaders.
          </p>
        )}
        <div className="video-stage-ranked" role="list" aria-label={`${current.label} comparison`}>
          {current.ads.map((ad) => (
            <article role="listitem" key={ad.key} className="video-stage-row">
              <span className="video-stage-rank">
                {trusted && ad.stage.eligible
                  ? current.ads.findIndex(
                      (other) => Math.abs(other.stage.ratio! - ad.stage.ratio!) < 1e-12,
                    ) + 1
                  : "—"}
              </span>
              <div className="video-stage-identity">
                <strong>{ad.name}</strong>
                <small>
                  {ad.locations.join(" / ")} · Ad {ad.adIds[0]}
                </small>
              </div>
              <div className="video-stage-result">
                <strong>{percent(ad.stage.ratio)}</strong>
                <span>
                  {ad.stage.state === "early"
                    ? "Small sample"
                    : ad.stage.state === "unavailable"
                      ? "Not comparable"
                      : `${count(ad.stage.numerator)} / ${count(ad.stage.denominator)}`}
                </span>
              </div>
              <div className="video-stage-bar" aria-hidden="true">
                <i style={{ width: `${(ad.stage.ratio ?? 0) * 100}%` }} />
              </div>
              <div className="video-stage-leads">
                <strong>{count(ad.metrics.metaLeads)} leads</strong>
                <span>{money(ad.metrics.costPerLead)} / lead</span>
              </div>
            </article>
          ))}
          {!current.ads.length && (
            <p className="insights-empty">No ads match these dates and filters.</p>
          )}
        </div>
        <details className="numbers-help">
          <summary>How to read this comparison</summary>
          <p>
            These are our directional comparisons of Meta play counts. {current.minimum} per ad are
            required to rank. Minimums are review guardrails, not statistical confidence. Equal
            scores share the highest result.
          </p>
          <p>
            Milestones can include skipped plays. They do not prove continuous viewing or the exact
            location of a spoken hook, middle or CTA. The connection does not supply video lengths
            or timestamped CTA conversions. Short videos can count a near-complete play as a
            three-second play.
          </p>
          <p>
            Leads and cost per lead belong to the whole ad. A strong ending can still produce
            expensive leads. Test one part at a time before attributing a change to that part.
            Different audiences, placements and video lengths can affect the comparison.
          </p>
        </details>
      </div>
    </section>
  );
}
