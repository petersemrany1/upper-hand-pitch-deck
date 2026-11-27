// Ported from the Legal app (family-law-floater/src/lib/form-answers.ts). Re-run the port script to refresh.
// Every question and answer from a lead's Facebook form, read straight from the
// stored webhook payload. Forms change often, so nothing here depends on the
// question names: whatever the form asked shows up, exactly as it was written.

export type FormAnswer = { key: string; question: string; answer: string };

// Contact details and ad/tracking fields — shown elsewhere or not useful on a call.
const NOT_QUESTIONS = new Set([
  "first_name",
  "last_name",
  "full_name",
  "name",
  "email",
  "phone",
  "phone_number",
  "city",
  "lead_id",
  "leadgen_id",
  "id",
  "form_id",
  "form_name",
  "page_id",
  "page_name",
  "ad_id",
  "ad_name",
  "adset_id",
  "adset_name",
  "ad_set_id",
  "ad_set_name",
  "campaign_id",
  "campaign_name",
  "platform",
  "is_organic",
  "created_time",
  "created_at",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
]);

function keyName(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** "is_there_a_property_owned?" → "Is there a property owned?" */
function questionLabel(key: string): string {
  const text = key.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : key;
}

/** Form option slugs like "yes_we_own" read better as "Yes we own". Free text is left alone. */
function answerText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const parts = value.map(answerText).filter((v): v is string => Boolean(v));
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") return null;
  const s = String(value).replace(/ /g, " ").trim();
  if (!s) return null;
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(s)) return questionLabel(s);
  return s;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return value;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return value;
  }
}

export function formAnswers(rawPayload: unknown): FormAnswer[] {
  const out: FormAnswer[] = [];
  const seen = new Set<string>();

  const add = (key: string, value: unknown) => {
    const name = keyName(key);
    if (!name || NOT_QUESTIONS.has(name) || seen.has(name)) return;
    const answer = answerText(value);
    if (!answer) return;
    seen.add(name);
    out.push({ key: name, question: questionLabel(key), answer });
  };

  const walk = (node: unknown, depth: number) => {
    const value = parseMaybeJson(node);
    if (!value || typeof value !== "object" || depth > 3) return;

    // Meta's own shape: [{ name: "question", values: ["answer"] }]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "name" in item) {
          const row = item as { name?: unknown; values?: unknown; value?: unknown };
          add(String(row.name ?? ""), row.values ?? row.value);
        }
      }
      return;
    }

    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const inner = parseMaybeJson(raw);
      if (inner && typeof inner === "object") {
        const isPlainList = Array.isArray(inner) && inner.every((v) => typeof v !== "object");
        if (isPlainList) add(key, inner);
        else walk(inner, depth + 1);
      } else {
        add(key, inner);
      }
    }
  };

  walk(rawPayload, 0);
  return out;
}
