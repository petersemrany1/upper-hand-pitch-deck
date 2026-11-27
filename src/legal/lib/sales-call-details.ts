// Ported from the Legal app (family-law-floater/src/lib/sales-call-details.ts). Re-run the port script to refresh.
import {
  ASSET_BAND_LABELS,
  FUNDING_LABELS,
  RELATIONSHIP_STAGE_LABELS,
  TIMELINE_LABELS,
} from "@/legal/lib/client-leads";
import type { CallLead } from "@/legal/lib/sales-call";
import { CLIENT_INTAKE_ANSWER_ALIASES } from "@/legal/lib/client-intake-aliases";

type DetailKey =
  | "city"
  | "relationship_stage"
  | "has_kids_under_18"
  | "asset_band"
  | "settlement_timeline"
  | "funding_preference";

export type ClientDetailsLead = Pick<CallLead, DetailKey | "raw_payload">;

// Keep the core details consistent, then retain relevant financial answers.
// Full form answers remain on Leads; websites, ads, IDs and tracking stay out.
const DETAILS: {
  key: DetailKey;
  label: string;
  aliases: string[];
  labels?: Record<string, string>;
}[] = [
  {
    key: "city",
    label: "Location",
    aliases: [
      "location_full",
      "city",
      "location",
      "suburb",
      "town",
      "town_city",
      "city_suburb",
      "suburb_city",
      "your_location",
      "where_do_you_live",
      "what_city_do_you_live_in",
      "which_city_do_you_live_in",
      "where_are_you_located",
      "postcode",
      "post_code",
      "postal_code",
      "zip_code",
    ],
  },
  {
    key: "relationship_stage",
    label: "Stage",
    aliases: [
      "relationship_stage",
      "relationship_status",
      "separation_stage",
      "where_things_are_at",
      "where_things_at",
      "where_are_things_at",
    ],
    labels: RELATIONSHIP_STAGE_LABELS,
  },
  {
    key: "has_kids_under_18",
    label: "Kids under 18",
    aliases: [
      "has_kids_under_18",
      "has_children_under_18",
      "children_under_18",
      "kids_under_18",
      "do_you_have_children_under_18",
      "do_you_have_kids_under_18",
    ],
  },
  {
    key: "asset_band",
    label: "Assets",
    aliases: [
      "asset_band",
      "asset_range",
      "asset_value",
      "estimated_asset_value",
      "assets",
      "total_asset_value",
      "combined_assets",
      "combined_assets_home_super_savings_business",
    ],
    labels: ASSET_BAND_LABELS,
  },
  {
    key: "settlement_timeline",
    label: "Timeline",
    aliases: ["settlement_timeline", "settlement_timeframe", "timeline", "timeframe"],
    labels: TIMELINE_LABELS,
  },
  {
    key: "funding_preference",
    label: "Funding",
    aliases: [
      "funding_preference",
      "funding_method",
      "payment_preference",
      "covering_legal_costs",
      "how_would_you_cover_legal_costs",
    ],
    labels: FUNDING_LABELS,
  },
];

const FINANCIAL_DETAILS = [
  {
    key: "legal_budget",
    label: "Legal budget",
    aliases: ["legal_budget", "legal_fees_budget", "budget_for_legal_fees", "legal_spend"],
  },
  {
    key: "own_savings",
    label: "Own savings",
    aliases: ["own_savings", "own_available_savings", "savings_for_legal_fees"],
  },
  {
    key: "net_asset_pool",
    label: "Net asset pool",
    aliases: ["net_asset_pool", "net_assets"],
  },
  {
    key: "wants_lawyer",
    label: "Wants lawyer",
    aliases: [
      "wants_lawyer",
      "do_you_want_to_speak_to_a_lawyer_about_your_situation",
      "would_you_like_to_speak_to_a_family_law_expert",
    ],
  },
];

export type SalesCallDetail = {
  key: string;
  label: string;
  value: string | null;
  formAnswer?: string;
  isQuestion?: boolean;
  source?: string;
  needsConfirmation?: boolean;
};

type IntakeField = { question: string; answer: string };
const INTAKE_KEYS = new Set([...DETAILS, ...FINANCIAL_DETAILS].flatMap((detail) => detail.aliases));

function isFinancialQuestion(key: string): boolean {
  // Match the question, never infer a budget from an amount in an unrelated answer.
  // Custom yes/no questions retain their full wording, including any threshold.
  if (/(^|_)(ad|ads|adset|campaign|utm|tracking|website|url|source|id|metadata)(_|$)/.test(key))
    return false;
  return /(^|_)(assets?|property|savings|budget|spend|afford|funding|legal_fees|legal_costs)(_|$)/.test(key);
}

function questionLabel(key: string): string {
  const text = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_+/g, " ")
    .trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
// Read form containers only: a city inside ad targeting or request metadata is
// not the client's location. These cover flat, wrapped and Meta field_data forms.
const CONTAINERS = new Set([
  "body",
  "payload",
  "raw_payload",
  "data",
  "lead",
  "fields",
  "field_data",
  "answers",
  "form_data",
  "form_answers",
  "form",
  "entry",
  "changes",
  "value",
]);

function keyName(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([a-zA-Z])(\d)/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function answerText(value: unknown): string | null {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map(answerText).filter(Boolean).join(", ") || null;
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return answerText(row["values"] ?? row["value"] ?? row["answer"]);
  }
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value)
    .replace(/\u00a0/g, " ")
    .trim();
  return !text || /^(null|undefined|n\/?a|not provided|[-—])$/i.test(text) ? null : text;
}

function intakeFields(payload: unknown): Map<string, IntakeField[]> {
  const fields = new Map<string, IntakeField[]>();
  const add = (key: string, value: unknown) => {
    const name = keyName(key);
    if (!INTAKE_KEYS.has(name) && !isFinancialQuestion(name)) return;
    const answer = answerText(value);
    if (answer !== null) {
      const existing = fields.get(name) ?? [];
      if (!existing.some((field) => field.answer === answer)) {
        fields.set(name, [...existing, { question: questionLabel(key), answer }]);
      }
    }
  };
  const walk = (node: unknown, depth = 0): void => {
    if (depth > 8) return;
    if (typeof node === "string") {
      try {
        walk(JSON.parse(node), depth + 1);
      } catch {
        /* Not a JSON form container. */
      }
      return;
    }
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, depth + 1));
      return;
    }
    const row = node as Record<string, unknown>;
    // The website form stores the client's chosen suburb/state/postcode here.
    // Do not search attribution, ad targeting or a firm's address for a location.
    const location = row["location"];
    if (location && typeof location === "object" && !Array.isArray(location)) {
      const place = location as Record<string, unknown>;
      const full = answerText(place["full"]);
      const parts = [place["suburb"], place["state"], place["postcode"]]
        .map(answerText)
        .filter(Boolean);
      add("location_full", full ?? (parts.length ? parts.join(", ") : null));
    }
    const name = row["name"] ?? row["key"] ?? row["question"];
    if (typeof name === "string") {
      add(name, row["values"] ?? row["value"] ?? row["answer"]);
    }
    for (const [key, value] of Object.entries(row)) {
      add(key, value);
      if (CONTAINERS.has(keyName(key))) walk(value, depth + 1);
    }
  };
  walk(payload);
  return fields;
}

function displayAnswer(
  raw: string | null,
  labels?: Record<string, string>,
  isBoolean = false,
): string | null {
  if (raw === null) return null;
  const slug = keyName(raw);
  if (isBoolean && ["true", "yes", "y", "1"].includes(slug)) return "Yes";
  if (isBoolean && ["false", "no", "n", "0"].includes(slug)) return "No";
  if (labels?.[slug]) return labels[slug];
  if (raw.includes("_")) {
    const text = raw.replace(/_/g, " ");
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  return raw;
}

// Exact options audited in the live enquiry forms on 7 Nov 2026. Do not apply
// substring amount matching: a negation, hypothetical or an OR is not a fact.
const NET_POOL_OPTION = keyName(
  "if_me_and_my_ex_sold_everything_we_own_(house,_super,_savings,_cars)_and_paid_off_all_our_loans,_there’d_be_over_$750k_left",
);
const OWN_SAVINGS_OPTION = keyName(
  "i_have_no_property_but_i_have_$50k_or_more_in_savings_that_i_can_spend_on_a_lawyer",
);

function assetAnswer(raw: string): "asset" | "net_pool" | "own_savings" | "unclear" {
  const key = keyName(raw);
  if (key === NET_POOL_OPTION) return "net_pool";
  if (key === OWN_SAVINGS_OPTION) return "own_savings";
  if (ASSET_BAND_LABELS[key]) return "asset";
  const readable = displayAnswer(raw)!;
  // Only a complete monetary amount/range is an asset amount. "Yes", "owned",
  // "neither of these", and new narrative answers need their original context.
  return /^(?:(?:under|over|at least|less than|more than)\s+)?\$?\d[\d,.]*(?:\s*[km])?\s*(?:\+|(?:-|–|—|to)\s*\$?\d[\d,.]*(?:\s*[km])?)?$/i.test(
    readable,
  )
    ? "asset"
    : "unclear";
}

export function salesCallDetails(lead: ClientDetailsLead): SalesCallDetail[] {
  const fields = intakeFields(lead.raw_payload);
  const consumed = new Set<IntakeField>();
  const extra: SalesCallDetail[] = [];
  const details: SalesCallDetail[] = DETAILS.map(({ key, label, aliases, labels }) => {
    // Only exact, field-valid importer aliases are equivalent. Never copy the
    // importer's loose substring fallback or use broad asset bands as proof.
    const comparable = (answer: string) => {
      const slug = keyName(answer);
      if (key === "asset_band") return slug;
      const alias = CLIENT_INTAKE_ANSWER_ALIASES[slug];
      return alias && labels?.[alias] ? alias : slug;
    };
    const candidates = aliases.flatMap((alias) => fields.get(alias) ?? []);
    candidates.forEach((field) => consumed.add(field));
    const originals = [
      ...new Set(
        candidates.map((field) =>
          displayAnswer(field.answer, labels, key === "has_kids_under_18")!,
        ),
      ),
    ];
    const original = originals[0] ?? null;
    const saved = displayAnswer(answerText(lead[key]), labels, key === "has_kids_under_18");
    const conflicting = new Set(originals.map(comparable)).size > 1;
    if (key === "asset_band") {
      const input = [...new Set([...(saved ? [saved] : []), ...originals])];
      const monetary = input.filter((answer) => assetAnswer(answer) === "asset");
      const netPool = input.find((answer) => assetAnswer(answer) === "net_pool");
      for (const answer of input) {
        const kind = assetAnswer(answer);
        if (kind === "own_savings") {
          extra.push({
            key: "form_own_savings",
            label: "Own savings for fees",
            value: "$50k or more",
            formAnswer: answer,
            source: "Client's form answer",
          });
        } else if (kind === "net_pool" && monetary.length) {
          extra.push({
            key: "form_net_asset_pool",
            label: "Net asset pool",
            value: "Over $750k after debts",
            formAnswer: answer,
            source: "Client's form answer",
          });
        } else if (kind === "unclear") {
          extra.push({
            key: `asset_context_${extra.length}`,
            label: "Financial form answer",
            value: answer,
            needsConfirmation: true,
          });
        }
      }
      return {
        key,
        label,
        value: monetary[0] ?? (netPool ? "Over $750k net, after debts" : null),
        ...(!monetary.length && netPool
          ? { formAnswer: netPool, source: "Client's form answer" }
          : {}),
        ...(monetary.length > 1
          ? { formAnswer: monetary.slice(1).join(" / "), needsConfirmation: true }
          : {}),
        ...(saved && monetary[0] === saved ? { source: "Saved asset band" } : {}),
      };
    }
    if (key === "city") {
      // Explicit form location is more precise than the imported campaign market.
      const fullAnswers = fields.get("location_full") ?? [];
      const full = fullAnswers.length === 1 ? fullAnswers[0]?.answer : undefined;
      const value = full ?? (conflicting ? null : original) ?? saved;
      return {
        key,
        label,
        value,
        ...(full || (!conflicting && original)
          ? { source: "Client's form location" }
          : saved
            ? { source: "Saved lead location", needsConfirmation: true }
            : {}),
        ...(conflicting && !full
          ? { formAnswer: originals.join(" / "), needsConfirmation: true }
          : {}),
      };
    }
    const matchedImport =
      saved && original && !conflicting && comparable(saved) === comparable(original);
    // Prefer the client's answer when the saved enum is its exact import mapping.
    const value = matchedImport ? original : (saved ?? (conflicting ? null : original));
    const differing = originals.filter(
      (answer) => value === null || comparable(answer) !== comparable(value),
    );
    return {
      key,
      label,
      value,
      ...(differing.length
        ? {
            formAnswer: differing.join(" / "),
            source: saved ? "Saved record" : "Form answers",
            needsConfirmation: conflicting || Boolean(saved),
          }
        : {}),
      ...(key === "has_kids_under_18" && value && !["Yes", "No"].includes(value)
        ? { needsConfirmation: true }
        : {}),
    };
  });

  for (const { key, label, aliases } of FINANCIAL_DETAILS) {
    const candidates = aliases.flatMap((alias) => fields.get(alias) ?? []);
    candidates.forEach((field) => consumed.add(field));
    const answers = [
      ...new Set(
        candidates.map((field) => displayAnswer(field.answer, undefined, key === "wants_lawyer")!),
      ),
    ];
    if (!answers.length) continue;
    details.push({
      key,
      label,
      value: answers.join(" / "),
      ...(answers.length > 1 ? { needsConfirmation: true } : {}),
    });
  }
  details.push(...extra);
  for (const [key, entries] of fields) {
    const remaining = entries.filter((field) => !consumed.has(field));
    if (!remaining.length || !isFinancialQuestion(key)) continue;
    details.push({
      key: `form_${key}`,
      label: remaining[0]!.question,
      value: remaining.map((field) => displayAnswer(field.answer)).join(" / "),
      isQuestion: true,
      ...(remaining.length > 1 ? { needsConfirmation: true } : {}),
    });
  }
  return details;
}
