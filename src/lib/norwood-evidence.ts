import { z } from "zod";
import { NORWOOD_VIEWS, norwoodResultSchema, type NorwoodResult } from "./norwood-assessment";

const quality = z.enum(["clear", "limited", "unusable", "wrong_view"]);
export const norwoodObservationsSchema = z.object({
  views: z.object({ front: quality, top: quality, crown: quality, left: quality, right: quality }).strict(),
  pattern: z.enum(["standard", "vertex", "anterior", "atypical", "uncertain"]),
  hairline: z.enum(["minimal", "mild_temple", "deep_temple", "extensive", "unknown"]),
  crown: z.enum(["preserved", "distinct_loss", "joined_loss", "unknown"]),
  bridge: z.enum(["substantial", "narrow_sparse", "absent", "not_applicable", "unknown"]),
  fringe: z.enum(["broad", "narrow_low", "unknown"]),
  anterior_extent: z.enum(["not_applicable", "well_before_ear", "approaching_ear", "past_ear_before_crown", "reaches_crown", "unknown"]),
  boundary_uncertain: z.boolean(),
}).strict();
export type NorwoodObservations = z.infer<typeof norwoodObservationsSchema>;
export type NorwoodModelResult = NorwoodResult & { observations: NorwoodObservations };
export const norwoodModelSchema = norwoodResultSchema.extend({ observations: norwoodObservationsSchema }).strict();

export class NorwoodAbstentionError extends Error {
  constructor(public code: "HP-REVIEW" | "HP-EVIDENCE" = "HP-REVIEW", public evidence?: NorwoodModelResult) { super("These photos do not support a consistent estimate. Advisor review required."); this.name = "NorwoodAbstentionError"; }
}

// These are conservative consistency checks, NOT a clinically validated classifier.
// They cannot establish whether a model's observations match the actual pixels.
export function stageSupportedByObservations(stage: number, o: NorwoodObservations): boolean {
  if (NORWOOD_VIEWS.some(v => ["unusable", "wrong_view"].includes(o.views[v]))) return false;
  if (o.pattern === "atypical" || o.pattern === "uncertain") return false;
  if (o.pattern === "anterior") {
    const extent = ["", "", "well_before_ear", "approaching_ear", "past_ear_before_crown", "reaches_crown"][stage];
    return Boolean(extent) && o.anterior_extent === extent && o.hairline !== "minimal" && o.hairline !== "unknown"
      && o.bridge === "not_applicable" && o.fringe === "broad"
      && o.crown === (stage === 5 ? "joined_loss" : "preserved");
  }
  if (o.anterior_extent !== "not_applicable") return false;
  if (o.pattern === "vertex") return stage === 3 && ["minimal", "mild_temple", "deep_temple"].includes(o.hairline)
    && o.crown === "distinct_loss" && o.bridge === "substantial" && o.fringe === "broad";
  if (stage <= 3) return o.hairline === ["", "minimal", "mild_temple", "deep_temple"][stage]
    && o.crown === "preserved" && o.bridge === "not_applicable" && o.fringe === "broad";
  if (o.hairline !== "extensive") return false;
  if (stage === 4 || stage === 5) return o.crown === "distinct_loss" && o.fringe === "broad"
    && o.bridge === (stage === 4 ? "substantial" : "narrow_sparse");
  if (stage === 6 || stage === 7) return o.crown === "joined_loss" && o.bridge === "absent"
    && o.fringe === (stage === 7 ? "narrow_low" : "broad");
  return false;
}

const reasons: Record<number, string> = {
  1: "The photos suggest minimal hairline recession with preserved crown coverage.",
  2: "The photos suggest mild temple recession with preserved crown coverage.",
  3: "The photos suggest deeper temple recession with preserved crown coverage.",
  4: "The front and crown areas appear separated by a substantial band of hair.",
  5: "The front and crown areas appear separated by a narrower, sparser band of hair.",
  6: "The front and crown areas appear joined, with a broader band of hair at the sides and back.",
  7: "The top appears largely uncovered, with only a narrow low band of hair at the sides and back.",
};

export function parseNorwoodModelResult(raw: string): NorwoodModelResult {
  const value = JSON.parse(raw);
  if (value === null) throw new NorwoodAbstentionError();
  const result = norwoodModelSchema.parse(value);
  const o = result.observations;
  if (!stageSupportedByObservations(result.norwood, o)) throw new NorwoodAbstentionError("HP-EVIDENCE", result);
  const limitedViews = NORWOOD_VIEWS.filter(v => o.views[v] === "limited").map(v => `${v} view is partly unclear`);
  result.photo_problems = [...new Set([...result.photo_problems, ...limitedViews])].slice(0, 10);
  if (result.photo_problems.length || o.pattern === "anterior" || o.boundary_uncertain) result.confidence = "low";
  // Display a description tied to the checked fields; never a contradictory free-text explanation.
  result.reason = o.pattern === "vertex" ? "The photos suggest crown-focused loss with limited frontal recession (III vertex)."
    : o.pattern === "anterior" ? `The photos suggest the entire frontal hairline has moved back together (anterior ${result.norwood}A pattern); your advisor should check the boundary.`
    : reasons[result.norwood];
  if (o.boundary_uncertain) result.reason += " The boundary with the adjacent grade is unclear.";
  return result;
}
