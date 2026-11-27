// Ported from the Legal app (family-law-floater/src/lib/client-leads.server.ts). Re-run the port script to refresh.
// Server-only ingestion for the public client-lead webhook (/api/public/legal-client-leads).
// Rule #1: never reject a request. Always return 200. Never touch `status`.

import { CLIENT_INTAKE_ANSWER_ALIASES as ANSWER_ALIASES } from "./client-intake-aliases";

type AnyRecord = Record<string, unknown>;

// Ordered longest-first at match time so "Gold Coast" wins over "Coast" style overlaps.
const LAUNCH_CITIES = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Perth",
  "Adelaide",
  "Canberra",
  "Hobart",
  "Launceston",
  "Darwin",
  "Alice Springs",
  "Gold Coast",
  "Sunshine Coast",
  "Newcastle",
  "Wollongong",
  "Geelong",
  "Central Coast",
  "Townsville",
  "Cairns",
  "Toowoomba",
  "Mackay",
  "Rockhampton",
  "Bundaberg",
  "Gladstone",
  "Hervey Bay",
  "Ipswich",
  "Logan",
  "Redcliffe",
  "Caboolture",
  "Ballarat",
  "Bendigo",
  "Shepparton",
  "Mildura",
  "Traralgon",
  "Warrnambool",
  "Frankston",
  "Dandenong",
  "Wagga Wagga",
  "Albury",
  "Tamworth",
  "Orange",
  "Dubbo",
  "Bathurst",
  "Coffs Harbour",
  "Port Macquarie",
  "Lismore",
  "Byron Bay",
  "Tweed Heads",
  "Nowra",
  "Goulburn",
  "Griffith",
  "Broken Hill",
  "Penrith",
  "Parramatta",
  "Liverpool",
  "Campbelltown",
  "Blacktown",
  "Bankstown",
  "Wetherill Park",
  "Mandurah",
  "Bunbury",
  "Geraldton",
  "Kalgoorlie",
  "Albany",
  "Rockingham",
  "Joondalup",
  "Fremantle",
  "Mount Gambier",
  "Whyalla",
  "Port Augusta",
  "Murray Bridge",
  "Devonport",
  "Burnie",
];


const RELATIONSHIP_STAGES = ["separated_not_started", "underway", "planning", "researching"];
const ASSET_BANDS = ["under_1m", "1m_2m", "2m_5m", "over_5m"];
const TIMELINES = ["asap", "1_3_months", "3_6_months", "no_rush"];
const FUNDING = ["savings", "family", "litigation_funding", "not_sure"];



function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value)
    .replace(/\u00a0/g, " ")
    .trim()
    .replace(/[,;]+$/g, "")
    .trim();
  return s.length ? s : null;
}

/** Slugify an answer: lowercase, drop $ / punctuation, collapse to underscores. */
function slugAnswer(value: unknown): string | null {
  const s = clean(value);
  if (!s) return null;
  const slug = s
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/\+/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length ? slug : null;
}

function enumOrNull(value: unknown, allowed: string[]): string | null {
  const slug = slugAnswer(value);
  if (!slug) return null;
  if (allowed.includes(slug)) return slug;
  const aliased = ANSWER_ALIASES[slug];
  if (aliased && allowed.includes(aliased)) return aliased;
  // Last resort: a label that contains one of the allowed slugs' digits/words.
  const loose = allowed.find((a) => slug.includes(a));
  return loose ?? null;
}


function boolOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
}

export function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(-9);
}

/**
 * Meta lead forms → city. Used when the Zap sends no campaign/ad names (Meta
 * only supplies them when the connected Facebook user has ads-read permission
 * on the ad account). One form per city campaign.
 */
const FORM_CITIES: Record<string, string> = {
  "1053683210898639": "Townsville",
  "1495071169330553": "Sydney",
};

/** Established intake markets remain research locations regardless of partner availability. */
export const CLIENT_INTAKE_CITIES = [...new Set(Object.values(FORM_CITIES))];

export function cityForForm(formId: string | null | undefined): string | null {
  return (formId && FORM_CITIES[formId]) || null;
}

export function deriveCity(...sources: (string | null | undefined)[]): string | null {
  const haystack = sources.filter(Boolean).join(" | ").toLowerCase();
  if (!haystack) return null;
  const match = [...LAUNCH_CITIES]
    .sort((a, b) => b.length - a.length)
    .find((city) => haystack.includes(city.toLowerCase()));
  return match ?? null;
}


export type MappedClientLead = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  campaign_name: string | null;
  ad_set_name: string | null;
  ad_name: string | null;
  fb_lead_id: string | null;
  relationship_stage: string | null;
  has_kids_under_18: boolean | null;
  asset_band: string | null;
  settlement_timeline: string | null;
  funding_preference: string | null;
};

export function mapClientLead(body: AnyRecord): MappedClientLead {
  const campaign = clean(body['campaign_name']);
  return {
    first_name: clean(body['first_name']),
    last_name: clean(body['last_name']),
    email: clean(body['email'])?.toLowerCase() ?? null,
    phone: clean(body['phone']),
    city:
      deriveCity(campaign, clean(body['ad_set_name']), clean(body['ad_name']), clean(body['city'])) ??
      cityForForm(clean(body['form_id'])),
    campaign_name: campaign,
    ad_set_name: clean(body['ad_set_name']),
    ad_name: clean(body['ad_name']),
    fb_lead_id: clean(body['lead_id']),
    relationship_stage: enumOrNull(body['relationship_stage'], RELATIONSHIP_STAGES),
    has_kids_under_18: boolOrNull(body['has_kids_under_18']),
    asset_band: enumOrNull(body['asset_band'], ASSET_BANDS),
    settlement_timeline: enumOrNull(body['settlement_timeline'], TIMELINES),
    funding_preference: enumOrNull(body['funding_preference'], FUNDING),
  };
}

async function logError(source: string, message: string, detail: unknown): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    await supabaseAdmin.from("error_logs").insert({
      source,
      message,
      detail: (detail ?? null) as never,
    });
  } catch (error) {
    console.error("[client-leads] could not write error_logs", error);
  }
}

export async function ingestClientLead(
  body: AnyRecord,
): Promise<{ ok: true; duplicate?: boolean; id?: string }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const mapped = mapClientLead(body);
  const tail = normalizePhone(mapped.phone);

  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: lookupError } = await supabaseAdmin
    .from("client_leads")
    .select("id, phone, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (lookupError) await logError("legal-client-leads", "lookup failed", lookupError);

  const matches = (candidates ?? []).filter((row) => {
    if (mapped.email && row.email && row.email.toLowerCase() === mapped.email) return true;
    if (tail.length === 9 && normalizePhone(row.phone) === tail) return true;
    return false;
  });

  if (matches.some((row) => row.created_at >= cutoff)) {
    return { ok: true, duplicate: true };
  }

  const previous = matches[0]?.id ?? null;

  // New enquiries enter the shared pool. Sales Call assigns one atomically
  // when an active caller requests their next client.
  const { data: inserted, error } = await supabaseAdmin
    .from("client_leads")
    .insert({
      ...mapped,
      raw_payload: body as never,
      previous_lead_id: previous,
      rep_id: null,
    })
    .select("id")
    .single();

  if (error) {
    await logError("legal-client-leads", "insert failed", { message: error.message, body });
    return { ok: true };
  }

  return { ok: true, id: inserted.id };
}

export async function handleClientLeadRequest(request: Request): Promise<Response> {
  let body: AnyRecord = {};
  try {
    const text = await request.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        body = parsed && typeof parsed === "object" ? (parsed as AnyRecord) : { body: parsed };
      } catch {
        try {
          body = Object.fromEntries(new URLSearchParams(text));
        } catch {
          body = { body: text };
        }
      }
    }
  } catch (error) {
    await logError("legal-client-leads", "body read failed", String(error));
  }

  let result: { ok: true; duplicate?: boolean; id?: string } = { ok: true };
  try {
    if (Object.keys(body).length > 0) result = await ingestClientLead(body);
  } catch (error) {
    await logError("legal-client-leads", "ingest threw", String(error));
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
