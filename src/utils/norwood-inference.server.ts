import { NORWOOD_MODEL, NORWOOD_SYSTEM_PROMPT, NORWOOD_VIEWS, hasAllNorwoodViews, type NorwoodView } from "../lib/norwood-assessment";
import { parseNorwoodModelResult, type NorwoodModelResult } from "../lib/norwood-evidence";

export function configuredNorwoodModel() {
  const model = process.env.NORWOOD_MODEL || NORWOOD_MODEL;
  if (!/^claude-[a-z0-9-]+$/.test(model)) throw new Error("Invalid Norwood model configuration");
  return model;
}

// Shared by the live server and the offline benchmark. No database or patient identity is sent.
export async function requestNorwoodEstimate(images: { view: NorwoodView; base64: string }[], apiKey: string, request: typeof fetch = fetch, model = NORWOOD_MODEL): Promise<NorwoodModelResult> {
  if (!hasAllNorwoodViews(images.map(i => i.view))) throw new Error("All five distinct views are required");
  const content: object[] = [];
  for (const view of NORWOOD_VIEWS) {
    const photo = images.find(i => i.view === view)!;
    content.push({ type: "text", text: `Photo: ${view}` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photo.base64 } });
  }
  content.push({ type: "text", text: "Assess these five views together. Check their visual evidence before selecting a stage. Return the exact JSON object with observations, or JSON null if no stage is supportable." });
  const response = await request("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: AbortSignal.timeout(45_000),
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model, temperature: 0, max_tokens: 1400, system: NORWOOD_SYSTEM_PROMPT, messages: [{ role: "user", content }] }),
  });
  if (!response.ok) throw new Error("AI unavailable");
  const json = await response.json();
  if (json.stop_reason !== "end_turn") throw new Error("Incomplete estimate");
  const raw = json.content?.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  return parseNorwoodModelResult(raw);
}
