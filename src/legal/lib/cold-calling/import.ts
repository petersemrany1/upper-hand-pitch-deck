// Ported from the Legal app (family-law-floater/src/lib/cold-calling/import.ts). Re-run the port script to refresh.
// Prospect import: column mapping, row normalisation and merge rules. Pure —
// the browser uses it for preview/dry-run and the server for the commit.
import { headerKey } from "./csv";
import {
  cleanText,
  normaliseAuPhone,
  normaliseDomain,
  parseNumber,
  parseTriState,
  splitPipes,
} from "./normalise";
import { timezoneForState } from "./calling-window";
import { normaliseState } from "@/legal/data/au-public-holidays";

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  synonyms: string[]; // headerKey() forms
};

/** Portal fields the admin can map source columns onto. Order = display order. */
export const IMPORT_FIELDS: FieldDef[] = [
  {
    key: "source_record_id",
    label: "Source record ID",
    synonyms: ["record_id", "id", "source_record_id"],
  },
  {
    key: "firm_name",
    label: "Firm name",
    required: true,
    synonyms: ["firm_name", "firm", "company", "name", "practice_name"],
  },
  { key: "root_domain", label: "Root domain", synonyms: ["root_domain", "domain"] },
  { key: "website", label: "Website", synonyms: ["website", "url", "web"] },
  {
    key: "phone",
    label: "Public firm phone",
    synonyms: ["public_firm_phone", "phone", "firm_phone", "telephone", "business_phone"],
  },
  {
    key: "phone_source_url",
    label: "Phone source URL",
    synonyms: ["phone_source_url", "phone_source"],
  },
  { key: "google_maps_url", label: "Google Maps URL", synonyms: ["google_maps_url", "maps_url"] },
  { key: "primary_city", label: "Primary city", synonyms: ["primary_city", "city", "suburb"] },
  { key: "state", label: "State", synonyms: ["state"] },
  { key: "postcode", label: "Postcode", synonyms: ["postcode", "post_code", "zip"] },
  {
    key: "office_locations",
    label: "All office locations",
    synonyms: ["all_office_locations", "office_locations", "offices"],
  },
  { key: "google_rating", label: "Google rating", synonyms: ["google_rating", "rating"] },
  {
    key: "google_review_count",
    label: "Google review count",
    synonyms: ["google_review_count", "review_count", "reviews"],
  },
  {
    key: "family_law_confirmed",
    label: "Family law confirmed",
    synonyms: ["family_law_confirmed"],
  },
  {
    key: "family_law_evidence_url",
    label: "Family law evidence URL",
    synonyms: ["family_law_evidence_url"],
  },
  {
    key: "property_settlements_confirmed",
    label: "Property settlements confirmed",
    synonyms: ["property_settlements_confirmed"],
  },
  {
    key: "property_evidence_url",
    label: "Property evidence URL",
    synonyms: ["property_evidence_url"],
  },
  {
    key: "complex_property",
    label: "Complex or high-value property confirmed",
    synonyms: ["complex_or_high_value_property_confirmed", "complex_property"],
  },
  {
    key: "complex_property_evidence_url",
    label: "Complex-property evidence URL",
    synonyms: ["complex_property_evidence_url"],
  },
  {
    key: "businesses_indicator",
    label: "Businesses or companies mentioned",
    synonyms: ["businesses_or_companies_mentioned", "businesses"],
  },
  { key: "trusts_indicator", label: "Trusts mentioned", synonyms: ["trusts_mentioned", "trusts"] },
  {
    key: "smsf_indicator",
    label: "SMSF or complex super mentioned",
    synonyms: ["smsf_or_complex_super_mentioned", "smsf"],
  },
  {
    key: "valuations_indicator",
    label: "Valuations or forensic accounting mentioned",
    synonyms: ["valuations_or_forensic_accounting_mentioned", "valuations"],
  },
  {
    key: "international_assets_indicator",
    label: "International assets mentioned",
    synonyms: ["international_assets_mentioned"],
  },
  {
    key: "dedicated_team",
    label: "Dedicated family-law firm or team",
    synonyms: ["dedicated_family_law_firm_or_team", "dedicated_team"],
  },
  {
    key: "family_law_team_size",
    label: "Family-law team size",
    synonyms: [
      "estimated_number_of_family_lawyers",
      "family_law_team_size",
      "team_size",
      "family_lawyers",
    ],
  },
  {
    key: "team_size_evidence_url",
    label: "Team-size evidence URL",
    synonyms: ["team_size_evidence_url"],
  },
  {
    key: "accredited_specialist_count",
    label: "Accredited specialist count",
    synonyms: ["accredited_specialist_count", "specialist_count"],
  },
  {
    key: "accredited_specialist_names",
    label: "Accredited specialist names",
    synonyms: ["accredited_specialist_names", "specialist_names"],
  },
  {
    key: "accreditation_evidence_url",
    label: "Accreditation evidence URL",
    synonyms: ["accreditation_evidence_url"],
  },
  {
    key: "primary_dm_name",
    label: "Primary decision-maker",
    synonyms: ["primary_decision_maker", "decision_maker", "primary_contact"],
  },
  {
    key: "primary_dm_title",
    label: "Decision-maker title",
    synonyms: ["decision_maker_title", "title", "position"],
  },
  {
    key: "primary_dm_profile_url",
    label: "Decision-maker profile URL",
    synonyms: ["decision_maker_profile_url", "profile_url"],
  },
  {
    key: "primary_dm_linkedin_url",
    label: "Decision-maker LinkedIn or Apollo URL",
    synonyms: ["decision_maker_linkedin_or_apollo_url", "linkedin_url", "linkedin"],
  },
  {
    key: "primary_dm_evidence_url",
    label: "Decision-maker evidence URL",
    synonyms: ["decision_maker_evidence_url"],
  },
  {
    key: "primary_dm_confidence",
    label: "Decision-maker confidence",
    synonyms: ["decision_maker_confidence", "confidence"],
  },
  {
    key: "secondary_dm_name",
    label: "Secondary decision-maker",
    synonyms: ["secondary_decision_maker"],
  },
  {
    key: "secondary_dm_title",
    label: "Secondary decision-maker title",
    synonyms: ["secondary_decision_maker_title"],
  },
  { key: "apollo_match_status", label: "Apollo match status", synonyms: ["apollo_match_status"] },
  { key: "reason_1", label: "Reason 1", synonyms: ["reason_1_case_fit", "reason_1"] },
  { key: "reason_1_url", label: "Reason 1 evidence URL", synonyms: ["reason_1_evidence_url"] },
  { key: "reason_2", label: "Reason 2", synonyms: ["reason_2_expertise", "reason_2"] },
  { key: "reason_2_url", label: "Reason 2 evidence URL", synonyms: ["reason_2_evidence_url"] },
  { key: "reason_3", label: "Reason 3", synonyms: ["reason_3_capacity", "reason_3"] },
  { key: "reason_3_url", label: "Reason 3 evidence URL", synonyms: ["reason_3_evidence_url"] },
  { key: "property_fit_score", label: "Property-fit score", synonyms: ["property_fit_score"] },
  { key: "quality_score", label: "Quality score", synonyms: ["quality_score"] },
  { key: "capacity_score", label: "Capacity score", synonyms: ["capacity_score"] },
  {
    key: "fit_score",
    label: "Total fit score",
    synonyms: ["total_fit_score", "fit_score", "score"],
  },
  { key: "priority_tier", label: "Priority tier", synonyms: ["priority_tier", "tier"] },
  {
    key: "personalised_opener",
    label: "Personalised opener",
    synonyms: ["personalised_cold_call_opener", "personalised_opener", "opener"],
  },
  {
    key: "qualification_status",
    label: "Qualification status",
    synonyms: ["qualification_status"],
  },
  { key: "exclusion_reason", label: "Exclusion reason", synonyms: ["exclusion_reason"] },
  { key: "possible_duplicate", label: "Possible duplicate", synonyms: ["possible_duplicate"] },
  { key: "research_notes", label: "Research notes", synonyms: ["research_notes", "notes"] },
  { key: "date_researched", label: "Date researched", synonyms: ["date_researched"] },
  {
    key: "dnc_status",
    label: "Do-not-contact status",
    synonyms: ["do_not_contact_status", "dnc_status", "do_not_contact"],
  },
];

export type ColumnMapping = Record<string, number | null>; // field key → column index

export function autoMapColumns(headers: string[]): ColumnMapping {
  const keys = headers.map(headerKey);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    let index: number | null = null;
    for (const syn of field.synonyms) {
      const found = keys.findIndex((k, i) => k === syn && !used.has(i));
      if (found >= 0) {
        index = found;
        break;
      }
    }
    mapping[field.key] = index;
    if (index !== null) used.add(index);
  }
  return mapping;
}

export type ImportFirmRecord = {
  source_record_id: string | null;
  firm_name: string;
  root_domain: string | null;
  website: string | null;
  phone_e164: string | null;
  phone_raw: string | null;
  phone_kind: string | null;
  phone_source_url: string | null;
  google_maps_url: string | null;
  primary_city: string | null;
  state: string | null;
  postcode: string | null;
  timezone: string | null;
  office_locations: string[];
  google_rating: number | null;
  google_review_count: number | null;
  family_law_confirmed: boolean | null;
  family_law_evidence_url: string | null;
  property_settlements_confirmed: boolean | null;
  property_evidence_url: string | null;
  complex_property: boolean | null;
  complex_property_evidence_url: string | null;
  businesses_indicator: boolean | null;
  trusts_indicator: boolean | null;
  smsf_indicator: boolean | null;
  valuations_indicator: boolean | null;
  international_assets_indicator: boolean | null;
  dedicated_team: boolean | null;
  family_law_team_size: number | null;
  team_size_evidence_url: string | null;
  accredited_specialist_count: number | null;
  accredited_specialist_names: string[];
  accreditation_evidence_url: string | null;
  reason_1: string | null;
  reason_1_url: string | null;
  reason_2: string | null;
  reason_2_url: string | null;
  reason_3: string | null;
  reason_3_url: string | null;
  property_fit_score: number | null;
  quality_score: number | null;
  capacity_score: number | null;
  fit_score: number | null;
  priority_tier: string | null;
  personalised_opener: string | null;
  qualification_status: string | null;
  exclusion_reason: string | null;
  possible_duplicate: string | null;
  research_notes: string | null;
  date_researched: string | null;
  apollo_match_status: string | null;
  import_dnc: boolean;
};

export type ImportContactRecord = {
  full_name: string;
  position: string | null;
  profile_url: string | null;
  linkedin_url: string | null;
  evidence_url: string | null;
  confidence: string | null;
  is_primary_decision_maker: boolean;
  is_secondary_decision_maker: boolean;
};

export type ImportRow =
  | {
      ok: true;
      rowNumber: number;
      firm: ImportFirmRecord;
      contacts: ImportContactRecord[];
      warnings: string[];
    }
  | { ok: false; rowNumber: number; errors: string[]; firmName: string | null };

function cell(row: string[], mapping: ColumnMapping, key: string): string | null {
  const idx = mapping[key];
  if (idx == null) return null;
  return row[idx] ?? null;
}

function tier(input: string | null): string | null {
  const v = cleanText(input)?.toUpperCase();
  return v && ["A", "B", "C"].includes(v) ? v : null;
}

function isoDate(input: string | null): string | null {
  const v = cleanText(input);
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dmy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  return null;
}

/** Turn one CSV row into a validated firm + contacts, or a list of errors. */
export function buildImportRow(
  row: string[],
  mapping: ColumnMapping,
  rowNumber: number,
): ImportRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (key: string) => cell(row, mapping, key);

  const firmName = cleanText(get("firm_name"));
  if (!firmName) errors.push("Firm name is missing.");

  const domain = normaliseDomain(get("root_domain")) ?? normaliseDomain(get("website"));
  const phoneRaw = cleanText(get("phone"));
  const phone = normaliseAuPhone(phoneRaw);
  if (phoneRaw && !phone)
    warnings.push(
      `Phone "${phoneRaw}" could not be normalised — firm imported without a callable number.`,
    );
  if (!phoneRaw) warnings.push("No public phone number — firm imported but cannot be called.");
  if (phone?.kind === "mobile")
    warnings.push(
      "Advertised number is a mobile — verify it is the firm's public business line before calling.",
    );
  if (!domain && !phone)
    errors.push(
      "Neither a root domain nor a usable phone number — cannot match or call this firm.",
    );

  const stateCode = normaliseState(get("state"));
  const stateRaw = cleanText(get("state"));
  if (stateRaw && !stateCode)
    warnings.push(
      `State "${stateRaw}" not recognised — calls stay blocked until the state is set.`,
    );
  if (!stateRaw) warnings.push("State missing — calls stay blocked until the state is set.");

  const fitScore = parseNumber(get("fit_score"));
  if (fitScore !== null && (fitScore < 0 || fitScore > 100))
    errors.push(`Fit score ${fitScore} is outside 0–100.`);

  if (errors.length > 0) return { ok: false, rowNumber, errors, firmName };

  const firm: ImportFirmRecord = {
    source_record_id: cleanText(get("source_record_id")),
    firm_name: firmName!,
    root_domain: domain,
    website: cleanText(get("website")),
    phone_e164: phone?.e164 ?? null,
    phone_raw: phoneRaw,
    phone_kind: phone?.kind ?? null,
    phone_source_url: cleanText(get("phone_source_url")),
    google_maps_url: cleanText(get("google_maps_url")),
    primary_city: cleanText(get("primary_city")),
    state: stateCode,
    postcode: cleanText(get("postcode")),
    timezone: timezoneForState(stateCode),
    office_locations: splitPipes(get("office_locations")),
    google_rating: parseNumber(get("google_rating")),
    google_review_count: parseNumber(get("google_review_count")),
    family_law_confirmed: parseTriState(get("family_law_confirmed")),
    family_law_evidence_url: cleanText(get("family_law_evidence_url")),
    property_settlements_confirmed: parseTriState(get("property_settlements_confirmed")),
    property_evidence_url: cleanText(get("property_evidence_url")),
    complex_property: parseTriState(get("complex_property")),
    complex_property_evidence_url: cleanText(get("complex_property_evidence_url")),
    businesses_indicator: parseTriState(get("businesses_indicator")),
    trusts_indicator: parseTriState(get("trusts_indicator")),
    smsf_indicator: parseTriState(get("smsf_indicator")),
    valuations_indicator: parseTriState(get("valuations_indicator")),
    international_assets_indicator: parseTriState(get("international_assets_indicator")),
    dedicated_team: parseTriState(get("dedicated_team")),
    family_law_team_size: parseNumber(get("family_law_team_size")),
    team_size_evidence_url: cleanText(get("team_size_evidence_url")),
    accredited_specialist_count: parseNumber(get("accredited_specialist_count")),
    accredited_specialist_names: splitPipes(get("accredited_specialist_names")),
    accreditation_evidence_url: cleanText(get("accreditation_evidence_url")),
    reason_1: cleanText(get("reason_1")),
    reason_1_url: cleanText(get("reason_1_url")),
    reason_2: cleanText(get("reason_2")),
    reason_2_url: cleanText(get("reason_2_url")),
    reason_3: cleanText(get("reason_3")),
    reason_3_url: cleanText(get("reason_3_url")),
    property_fit_score: parseNumber(get("property_fit_score")),
    quality_score: parseNumber(get("quality_score")),
    capacity_score: parseNumber(get("capacity_score")),
    fit_score: fitScore,
    priority_tier: tier(get("priority_tier")),
    personalised_opener: cleanText(get("personalised_opener")),
    qualification_status: cleanText(get("qualification_status")),
    exclusion_reason: cleanText(get("exclusion_reason")),
    possible_duplicate: cleanText(get("possible_duplicate")),
    research_notes: cleanText(get("research_notes")),
    date_researched: isoDate(get("date_researched")),
    apollo_match_status: cleanText(get("apollo_match_status")),
    import_dnc: parseTriState(get("dnc_status")) === true,
  };

  const contacts: ImportContactRecord[] = [];
  const primaryName = cleanText(get("primary_dm_name"));
  if (primaryName) {
    contacts.push({
      full_name: primaryName,
      position: cleanText(get("primary_dm_title")),
      profile_url: cleanText(get("primary_dm_profile_url")),
      linkedin_url: cleanText(get("primary_dm_linkedin_url")),
      evidence_url: cleanText(get("primary_dm_evidence_url")),
      confidence: cleanText(get("primary_dm_confidence")),
      is_primary_decision_maker: true,
      is_secondary_decision_maker: false,
    });
  }
  const secondaryName = cleanText(get("secondary_dm_name"));
  if (secondaryName && secondaryName.toLowerCase() !== primaryName?.toLowerCase()) {
    contacts.push({
      full_name: secondaryName,
      position: cleanText(get("secondary_dm_title")),
      profile_url: null,
      linkedin_url: null,
      evidence_url: null,
      confidence: null,
      is_primary_decision_maker: false,
      is_secondary_decision_maker: true,
    });
  }
  if (!primaryName)
    warnings.push("No named decision-maker — the caller will ask for the principal.");

  return { ok: true, rowNumber, firm, contacts, warnings };
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Fields the import may never touch on an existing firm. */
const PROTECTED_KEYS = new Set(["import_dnc"]);

/**
 * Patch for an existing firm: incoming non-blank values win (newer research),
 * blank incoming values never erase existing data, and office locations are
 * merged rather than replaced.
 */
export function mergeFirmPatch(
  existing: Record<string, unknown>,
  incoming: ImportFirmRecord,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (PROTECTED_KEYS.has(key)) continue;
    if (isBlank(value)) continue;
    if (key === "office_locations" || key === "accredited_specialist_names") {
      const current = Array.isArray(existing[key]) ? (existing[key] as string[]) : [];
      const merged = Array.from(new Set([...current, ...(value as string[])]));
      if (merged.length !== current.length) patch[key] = merged;
      continue;
    }
    if (existing[key] !== value) patch[key] = value;
  }
  // A DNC marker on the import can only add a suppression, never remove one.
  if (incoming.import_dnc && existing["do_not_contact"] !== true) {
    patch["do_not_contact"] = true;
    patch["do_not_contact_reason"] = "Marked do-not-contact in the imported data";
  }
  return patch;
}

/** Group rows that resolve to the same firm (by domain, else phone) so one import never double-inserts. */
export function firmMatchKey(
  firm: Pick<ImportFirmRecord, "root_domain" | "phone_e164" | "source_record_id">,
): string {
  if (firm.root_domain) return `domain:${firm.root_domain}`;
  if (firm.phone_e164) return `phone:${firm.phone_e164}`;
  return `record:${firm.source_record_id ?? Math.random().toString(36)}`;
}
