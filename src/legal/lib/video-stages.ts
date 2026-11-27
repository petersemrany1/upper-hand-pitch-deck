// Ported from the Legal app (family-law-floater/src/lib/video-stages.ts). Re-run the port script to refresh.
import { groupAds, type AdMetricRow, type AdMetrics } from "./ad-metrics";

export type VideoStage = "hook" | "meat" | "cta";
export const VIDEO_STAGES = {
  hook: {
    label: "Hook",
    question: "Stops the scroll",
    measure: "3-second play rate",
    range: "Opening · first 3 seconds",
    formula: "3-second plays ÷ impressions",
    minimum: "1,000 impressions and 100 three-second plays",
  },
  meat: {
    label: "Meat",
    question: "Holds the middle",
    measure: "Middle hold",
    range: "Middle · 25% → 75%",
    formula: "75% plays ÷ 25% plays",
    minimum: "1,000 impressions and 100 plays at 25%",
  },
  cta: {
    label: "CTA",
    question: "Holds through the close",
    measure: "Ending hold",
    range: "Ending · 75% → 95%",
    formula: "95% plays ÷ 75% plays",
    minimum: "1,000 impressions and 100 plays at 75%",
  },
} as const;

// Milestone events are directional proxies, not a cohort of continuous viewers
// or a timestamped conversion funnel. Never infer CTA conversions from these.
export function stageMeasure(m: AdMetrics, stage: VideoStage) {
  const numerator = stage === "hook" ? m.threeSecond : stage === "meat" ? m.p75 : m.p95;
  const denominator = stage === "hook" ? m.impressions : stage === "meat" ? m.p25 : m.p75;
  const ratio =
    numerator !== null && denominator !== null && denominator > 0 ? numerator / denominator : null;
  const valid = ratio !== null && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1;
  const enough =
    m.impressions >= 1000 &&
    (stage === "hook" ? (numerator ?? 0) >= 100 : (denominator ?? 0) >= 100);
  return {
    numerator,
    denominator,
    ratio: valid ? ratio : null,
    eligible: valid && enough,
    state: !valid ? "unavailable" : enough ? "comparable" : "early",
  } as const;
}

export function rankVideoStage(rows: AdMetricRow[], stage: VideoStage, trusted: boolean) {
  const ads = groupAds(rows, "ad", false, trusted).map((ad) => ({
    ...ad,
    stage: stageMeasure(ad.metrics, stage),
  }));
  const ranked = ads.sort(
    (a, b) =>
      Number(b.stage.eligible) - Number(a.stage.eligible) ||
      (b.stage.ratio ?? -1) - (a.stage.ratio ?? -1) ||
      (b.stage.denominator ?? 0) - (a.stage.denominator ?? 0) ||
      a.key.localeCompare(b.key),
  );
  const candidates = ranked.filter((ad) => ad.stage.eligible);
  const top = candidates[0];
  // A tie is displayed as joint highest, rather than inventing a unique winner.
  const tied = top
    ? candidates.filter((ad) => Math.abs(ad.stage.ratio! - top.stage.ratio!) < 1e-12)
    : [];
  return {
    ads: ranked,
    leader: trusted ? (top ?? null) : null,
    candidates: candidates.length,
    tied: trusted ? tied.length : 0,
  };
}
