import { expect, test } from "bun:test";
import { parseNorwoodModelResult, NorwoodAbstentionError, type NorwoodObservations } from "./norwood-evidence";

const base: NorwoodObservations = {
  views: { front: "clear", top: "clear", crown: "clear", left: "clear", right: "clear" },
  pattern: "standard", hairline: "minimal", crown: "preserved", bridge: "not_applicable", fringe: "broad", anterior_extent: "not_applicable", boundary_uncertain: false,
};
function parse(stage: number, observations: Partial<NorwoodObservations> = {}, extra: object = {}) {
  return parseNorwoodModelResult(JSON.stringify({ norwood: stage, confidence: "high", reason: "Provider's unchecked explanation.", photo_problems: [], observations: { ...base, ...observations }, ...extra }));
}
test("accepts coherent standard stages and rejects contradictory stage/bridge pairs", () => {
  const cases: Partial<NorwoodObservations>[] = [
    {}, { hairline: "mild_temple" }, { hairline: "deep_temple" },
    { hairline: "extensive", crown: "distinct_loss", bridge: "substantial" },
    { hairline: "extensive", crown: "distinct_loss", bridge: "narrow_sparse" },
    { hairline: "extensive", crown: "joined_loss", bridge: "absent" },
    { hairline: "extensive", crown: "joined_loss", bridge: "absent", fringe: "narrow_low" },
  ];
  for (const [i, observations] of cases.entries()) {
    expect(parse(i + 1, observations).norwood).toBe(i + 1);
    for (let wrong = 1; wrong <= 7; wrong++) if (wrong !== i + 1) expect(() => parse(wrong, observations)).toThrow(NorwoodAbstentionError);
  }
  expect(() => parse(7)).toThrow(); // The earlier synthetic '7 with preserved coverage' is now rejected.
});
test("validates all views and does not interpret unclear evidence as absence of hair", () => {
  for (const status of ["unusable", "wrong_view"] as const) {
    expect(() => parse(1, { views: { ...base.views, crown: status } })).toThrow();
  }
  expect(() => parse(6, { hairline: "extensive", crown: "joined_loss", bridge: "unknown" })).toThrow();
  expect(() => parse(7, { hairline: "extensive", crown: "joined_loss", bridge: "absent", fringe: "unknown" })).toThrow();
  expect(() => parse(1, { pattern: "atypical" })).toThrow();
  expect(() => parseNorwoodModelResult("null")).toThrow(NorwoodAbstentionError);
});
test("lowers confidence for limited photos and preserves the specific view issue", () => {
  const result = parse(1, { views: { ...base.views, left: "limited" } });
  expect(result.confidence).toBe("low");
  expect(result.photo_problems).toContain("left view is partly unclear");
  expect(parse(1, {}, { photo_problems: ["glare"] }).confidence).toBe("low");
});
test("a debatable boundary forces review even when the model claims high confidence", () => {
  const result = parse(5, { hairline: "extensive", crown: "distinct_loss", bridge: "narrow_sparse", boundary_uncertain: true });
  expect(result.norwood).toBe(5);
  expect(result.confidence).toBe("low");
  expect(result.reason).toContain("boundary with the adjacent grade is unclear");
  expect(result.reason.length).toBeLessThanOrEqual(300);
  // An unknown bridge is not a borderline-but-supportable observation.
  expect(() => parse(5, { hairline: "extensive", crown: "distinct_loss", bridge: "unknown", boundary_uncertain: true })).toThrow(NorwoodAbstentionError);
});
test("handles III vertex and A variants separately, with conservative A confidence", () => {
  expect(parse(3, { pattern: "vertex", crown: "distinct_loss", bridge: "substantial" }).reason).toContain("III vertex");
  for (const [i, extent] of (["well_before_ear", "approaching_ear", "past_ear_before_crown", "reaches_crown"] as const).entries()) {
    const stage = i + 2;
    const result = parse(stage, { pattern: "anterior", hairline: "extensive", anterior_extent: extent, crown: stage === 5 ? "joined_loss" : "preserved" });
    expect(result.confidence).toBe("low");
    expect(result.reason).toContain(`${stage}A`);
  }
  expect(() => parse(3, { pattern: "anterior", anterior_extent: "unknown" })).toThrow();
});
test("displayed reason comes from checked evidence, not contradictory provider prose", () => {
  const result = parse(1, {}, { reason: "Only a narrow fringe remains, stage 7." });
  expect(result.reason).toContain("minimal hairline recession");
  expect(result.reason).not.toContain("stage 7");
});
test("missing evidence and invented fields cannot bypass the checks", () => {
  expect(() => parse(1, {}, { observations: undefined })).toThrow();
  expect(() => parse(1, { boundary_uncertain: undefined })).toThrow();
  expect(() => parse(1, {}, { observations: { ...base, diagnosis: "x" } })).toThrow();
});
