import { z } from "zod";
import { requestNorwoodJson } from "./norwood-json.server";
import { NORWOOD_MODEL, NORWOOD_SYSTEM_PROMPT, NORWOOD_VIEWS, hasAllNorwoodViews, type NorwoodView } from "../lib/norwood-assessment";
import { parseNorwoodModelResult, norwoodModelSchema, type NorwoodModelResult } from "../lib/norwood-evidence";

export function configuredNorwoodModel() {
  const model = process.env.NORWOOD_MODEL || NORWOOD_MODEL;
  if (!/^claude-[a-z0-9-]+$/.test(model)) throw new Error("Invalid Norwood model configuration");
  return model;
}

// All photos are assessed together. Format failures use the same bounded transport
// as capture checks; an explicit clinical abstention is never retried as a format error.
const enumField = (values: readonly string[]) => ({ type: "string", enum: values });
const object = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const observations = object({
  views: object(Object.fromEntries(NORWOOD_VIEWS.map(view => [view, enumField(["clear", "limited", "unusable", "wrong_view"])]))),
  pattern: enumField(["standard", "vertex", "anterior", "atypical", "uncertain"]),
  hairline: enumField(["minimal", "mild_temple", "deep_temple", "extensive", "unknown"]),
  crown: enumField(["preserved", "distinct_loss", "joined_loss", "unknown"]),
  bridge: enumField(["substantial", "narrow_sparse", "absent", "not_applicable", "unknown"]),
  fringe: enumField(["broad", "narrow_low", "unknown"]),
  anterior_extent: enumField(["not_applicable", "well_before_ear", "approaching_ear", "past_ear_before_crown", "reaches_crown", "unknown"]),
  boundary_uncertain: { type: "boolean" },
});
export const NORWOOD_ESTIMATE_SCHEMA = object({ assessment: { anyOf: [{ type: "null" }, object({
  norwood: { type: "integer", enum: [1, 2, 3, 4, 5, 6, 7] }, confidence: enumField(["low", "medium", "high"]),
  reason: { type: "string", description: "One calm sentence, 1–300 characters." },
  photo_problems: { type: "array", items: { type: "string" }, description: "At most 10 short photo problems, each 1–150 characters." }, observations,
})] } });
export async function requestNorwoodEstimate(images: { view: NorwoodView; base64: string }[], apiKey: string, request: typeof fetch = fetch, model = NORWOOD_MODEL): Promise<NorwoodModelResult> {
  if (!hasAllNorwoodViews(images.map(i => i.view))) throw new Error("All five distinct views are required");
  const content: object[] = [];
  for (const view of NORWOOD_VIEWS) {
    const photo = images.find(i => i.view === view)!;
    content.push({ type: "text", text: `Photo: ${view}` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photo.base64 } });
  }
  content.push({ type: "text", text: 'Assess these five views together. Return {"assessment": <the assessment object or null>}. A null assessment is a valid completed review when no stage is supportable.' });
  const value = await requestNorwoodJson({ model, apiKey, request, maxTokens: 2048, schema: NORWOOD_ESTIMATE_SCHEMA,
    system: NORWOOD_SYSTEM_PROMPT + '\nResponse envelope: put the result described above inside the single key "assessment". When the rubric calls for null, return {"assessment":null}.', content,
    parse: raw => z.object({ assessment: norwoodModelSchema.nullable() }).strict().parse(JSON.parse(raw)).assessment,
  });
  // Evidence checks run after transport validation. A correctly formatted null or
  // contradictory stage is a review outcome, not a reason to keep asking the model.
  return parseNorwoodModelResult(JSON.stringify(value));
}
