// Ported from the Legal app (family-law-floater/src/lib/cold-calling/debrief.ts). Re-run the port script to refresh.
// The AI debrief of a firm cold call, for Peter to read before the closer Zoom.
// Pure types + prompt + rendering; the model call lives in cold-calling.server.ts.

export type Concern = { concern: string; their_words: string; how_it_was_handled: string };
export type Question = { question: string; answered: string; note: string };

export type FirmDebrief = {
  headline: string;
  temperature: "hot" | "warm" | "lukewarm" | "cold" | string;
  who_we_spoke_to: string;
  their_situation: string[];
  what_they_liked: string[];
  concerns_and_hesitations: Concern[];
  questions_they_asked: Question[];
  pricing: { price_stated: boolean; reaction: string; pack_interest: string };
  commitments_and_next_steps: string[];
  risks_to_the_close: string[];
  how_to_open_the_zoom: string[];
  setter_performance_note: string;
};

export const FIRM_DEBRIEF_SYSTEM_PROMPT = `You are debriefing Peter, the closer, on a cold call his appointment setter just had with an Australian family-law firm. Peter will run the follow-up Zoom to sell a pay-per-show client placement package: $1,850 + GST per vetted client who shows up, sold in packs of 10, 20 or 40, with the 10-pack splittable into two payments. Your job is to make Peter feel he was on the call.

Rules:
- Use ONLY what is in the transcript. Never invent. If something was not discussed, say "Not discussed".
- Where the firm's exact words matter (hesitations, objections, enthusiasm, numbers), quote them briefly.
- Be specific and concrete. Numbers they gave (consults per week, sign rate, cost per acquisition, team size, spend) must be captured exactly.
- Capture EVERY hesitation, doubt, pushback or condition, even small ones, and how the setter answered it.
- Note anything the setter promised, and anything the setter should have covered but did not (for example: was the price stated? were the decision-makers identified?).
- Do not include the setter's script lines unless the firm reacted to them.
- Return ONLY valid JSON with exactly this shape and nothing else:
{
  "headline": "one sentence: where this stands and how warm it is",
  "temperature": "hot|warm|lukewarm|cold",
  "who_we_spoke_to": "name and role; who makes the decisions; anyone else who needs to be involved",
  "their_situation": ["one fact per item, only if said: consults per week, sign rate, current marketing, cost per acquisition, capacity to grow, other lawyers, hourly rate, anything about their intake process"],
  "what_they_liked": ["what excited or resonated with them, in their words where possible"],
  "concerns_and_hesitations": [{"concern": "...", "their_words": "short quote", "how_it_was_handled": "what the setter said and whether it landed"}],
  "questions_they_asked": [{"question": "...", "answered": "yes|no|partly", "note": "what was said, or what Peter must answer on the Zoom"}],
  "pricing": {"price_stated": true, "reaction": "how they reacted to $1,850 + GST, or 'Not discussed'", "pack_interest": "10/20/40, split, or 'Not discussed'"},
  "commitments_and_next_steps": ["meeting time and how it was agreed", "email given", "who will attend the Zoom", "anything they said they would do"],
  "risks_to_the_close": ["what could stop this closing"],
  "how_to_open_the_zoom": ["3 to 5 concrete suggestions tailored to this person and what they said"],
  "setter_performance_note": "one line: what the setter did well and anything missed"
}`;

function list(items: string[] | undefined, empty = "Not discussed"): string[] {
  const clean = (items ?? []).map((i) => String(i).trim()).filter(Boolean);
  return clean.length ? clean : [empty];
}

export function coerceDebrief(raw: Record<string, unknown>): FirmDebrief {
  const str = (v: unknown, fallback = "Not discussed") =>
    typeof v === "string" && v.trim() ? v.trim() : fallback;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))) : [];
  const concerns = Array.isArray(raw["concerns_and_hesitations"])
    ? (raw["concerns_and_hesitations"] as Array<Record<string, unknown>>)
        .map((c) => ({
          concern: str(c?.["concern"], ""),
          their_words: str(c?.["their_words"], ""),
          how_it_was_handled: str(c?.["how_it_was_handled"], ""),
        }))
        .filter((c) => c.concern)
    : [];
  const questions = Array.isArray(raw["questions_they_asked"])
    ? (raw["questions_they_asked"] as Array<Record<string, unknown>>)
        .map((q) => ({
          question: str(q?.["question"], ""),
          answered: str(q?.["answered"], "unknown"),
          note: str(q?.["note"], ""),
        }))
        .filter((q) => q.question)
    : [];
  const pricing = (raw["pricing"] as Record<string, unknown> | undefined) ?? {};
  return {
    headline: str(raw["headline"], "Call debrief"),
    temperature: str(raw["temperature"], "unknown").toLowerCase(),
    who_we_spoke_to: str(raw["who_we_spoke_to"]),
    their_situation: arr(raw["their_situation"]),
    what_they_liked: arr(raw["what_they_liked"]),
    concerns_and_hesitations: concerns,
    questions_they_asked: questions,
    pricing: {
      price_stated: pricing["price_stated"] === true,
      reaction: str(pricing["reaction"]),
      pack_interest: str(pricing["pack_interest"]),
    },
    commitments_and_next_steps: arr(raw["commitments_and_next_steps"]),
    risks_to_the_close: arr(raw["risks_to_the_close"]),
    how_to_open_the_zoom: arr(raw["how_to_open_the_zoom"]),
    setter_performance_note: str(raw["setter_performance_note"], ""),
  };
}

/** Plain-text sections, one idea per line. */
export function renderDebriefText(d: FirmDebrief): string {
  const out: string[] = [];
  out.push(`${d.headline} (${d.temperature})`, "");
  out.push("WHO YOU'RE MEETING", d.who_we_spoke_to, "");
  out.push("THEIR SITUATION", ...list(d.their_situation).map((i) => `- ${i}`), "");
  out.push(
    "WHAT THEY LIKED",
    ...list(d.what_they_liked, "Nothing specific stood out").map((i) => `- ${i}`),
    "",
  );
  out.push("CONCERNS AND HESITATIONS");
  if (d.concerns_and_hesitations.length === 0) out.push("- None raised");
  for (const c of d.concerns_and_hesitations) {
    out.push(`- ${c.concern}`);
    if (c.their_words) out.push(`  Their words: "${c.their_words}"`);
    if (c.how_it_was_handled) out.push(`  Handled: ${c.how_it_was_handled}`);
  }
  out.push("");
  out.push("QUESTIONS THEY ASKED");
  if (d.questions_they_asked.length === 0) out.push("- None");
  for (const q of d.questions_they_asked)
    out.push(`- ${q.question} (answered: ${q.answered})${q.note ? ` — ${q.note}` : ""}`);
  out.push("");
  out.push(
    "PRICING",
    `- Price stated on the call: ${d.pricing.price_stated ? "yes" : "NO — say it early on the Zoom"}`,
    `- Reaction: ${d.pricing.reaction}`,
    `- Pack interest: ${d.pricing.pack_interest}`,
    "",
  );
  out.push(
    "COMMITMENTS AND NEXT STEPS",
    ...list(d.commitments_and_next_steps).map((i) => `- ${i}`),
    "",
  );
  out.push(
    "RISKS TO THE CLOSE",
    ...list(d.risks_to_the_close, "None obvious").map((i) => `- ${i}`),
    "",
  );
  out.push("HOW TO OPEN THE ZOOM", ...list(d.how_to_open_the_zoom).map((i) => `- ${i}`), "");
  if (d.setter_performance_note) out.push("SETTER NOTE", d.setter_performance_note, "");
  return out.join("\n");
}
