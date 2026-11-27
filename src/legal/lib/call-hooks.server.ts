// Ported from the Legal app (family-law-floater/src/lib/call-hooks.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { createHash } from "node:crypto";
import { ZodError } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/legal/integrations/supabase/client.server";
import { collectPages } from "./collect-pages";
import { createSnapshotCache } from "./snapshot-cache";
import { TEST_FIRM_ID } from "./firm-portal-credits";
import { CLIENT_INTAKE_CITIES } from "./client-leads.server";
import { anthropic } from "./ai-analysis.server";
import { transcribeRecording, transcribeRecordingStep } from "./recording-transcription.server";
import {
  HOOK_MODEL,
  HOOK_PROMPT_VERSION,
  HOOK_REVIEW_VERSION,
  HOOK_ANALYSIS_VERSION,
  HOOK_SYSTEM_PROMPT,
  materializeHookEvidence,
  fundingVerdict,
  qualifyHook,
  transcriptLines,
  validateHookSafety,
  type HookAssessment,
  type HookCall,
  type HookCoverage,
  type HookListItem,
  type HookStatus,
} from "./call-hooks";

const CALL_COLUMNS =
  "id,lead_id,created_at,call_status,direction,twilio_call_sid,transcript,recording_url,duration_seconds,lead:client_leads(id,status,city,first_name,last_name,ex_partner_full_name,email,phone,firm_id,funding_preference,eligibility_verdict,eligibility_data)";
type FirmCallLink = {
  call_record_id?: string | null;
  twilio_call_sid: string | null;
  twilio_child_call_sid?: string | null;
};
export function firmCallSources(links: FirmCallLink[]) {
  return {
    ids: new Set(links.flatMap((r) => (r.call_record_id ? [r.call_record_id] : []))),
    sids: new Set(
      links.flatMap((r) =>
        [r.twilio_call_sid, r.twilio_child_call_sid].filter((s): s is string => Boolean(s)),
      ),
    ),
  };
}
function isFirmCall(call: HookCall, sources: ReturnType<typeof firmCallSources>) {
  return (
    /^(prospect|firm)_/.test(call.direction ?? "") ||
    sources.ids.has(call.id) ||
    Boolean(call.twilio_call_sid && sources.sids.has(call.twilio_call_sid))
  );
}
async function loadFirmCallSources(db: SupabaseClient) {
  // Fail closed if either source cannot be checked. Never infer client identity
  // from direction alone: genuine client follow-ups are also outbound.
  const [prospects, applications] = await Promise.all([
    collectPages((from, to) =>
      db
        .from("prospect_call_attempts")
        .select("call_record_id,twilio_call_sid,twilio_child_call_sid")
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) =>
      db.from("firm_application_calls").select("twilio_call_sid").order("id").range(from, to),
    ),
  ]);
  return firmCallSources([...prospects, ...applications] as FirmCallLink[]);
}
type Saved = {
  call_id: string;
  source_hash: string;
  status: HookStatus;
  reason: string;
  hook: string | null;
  assessment: HookAssessment | null;
  generated_at: string | null;
  attempts: number;
  lease_until: string | null;
  updated_at?: string;
};
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export function callHookFingerprint(call: HookCall, version = HOOK_PROMPT_VERSION) {
  return hash(
    JSON.stringify([
      version,
      HOOK_MODEL,
      call.transcript,
      call.lead,
      ...(version === HOOK_PROMPT_VERSION ? [call.duration_seconds, call.serviceCities ?? []] : []),
      ...(version !== "call-hooks-v1" && !call.transcript?.trim()
        ? [call.recording_url ?? null]
        : []),
    ]),
  );
}
export function hookInventory(
  calls: HookCall[],
  saved: Saved[],
  now = Date.now(),
  firmSources = firmCallSources([]),
) {
  const records = new Map(saved.map((s) => [s.call_id, s]));
  const seenSids = new Set<string>(),
    seenText = new Set<string>();
  // Prefer the row with the transcript when Twilio has duplicate partial records.
  const ordered = [...calls].sort(
    (a, b) =>
      Number(Boolean(b.transcript?.trim())) - Number(Boolean(a.transcript?.trim())) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
  const items = ordered.map((call) => {
    const previous = records.get(call.id);
    // Preserve already-checked short calls with no extracted client facts. The
    // new writer cannot add a research finding to a greeting/empty assessment.
    const legacyEmpty =
      previous?.source_hash === callHookFingerprint(call, "call-hooks-v1") &&
      previous.status === "unknown" &&
      (call.duration_seconds ?? Infinity) < 120 &&
      previous.assessment?.matterType === "unknown" &&
      previous.assessment.serious === null &&
      previous.assessment.affordable === null &&
      previous.assessment.evidence.length === 0;
    const sourceHash = legacyEmpty ? previous!.source_hash : callHookFingerprint(call);
    let status: HookStatus = "pending",
      reason = "Ready for transcript assessment";
    const transcript = call.transcript?.trim();
    const textKey = transcript ? hash(`${call.lead_id}:${transcript.replace(/\s+/g, " ")}`) : null;
    const firmCall = isFirmCall(call, firmSources);
    const clientSource = Boolean(
      !firmCall &&
      call.lead_id &&
      call.lead &&
      call.lead.firm_id !== TEST_FIRM_ID &&
      !/\b(test|demo)\b/i.test(`${call.lead.first_name ?? ""} ${call.lead.last_name ?? ""}`),
    );
    const excludedSource =
      firmCall ||
      !call.lead_id ||
      !call.lead ||
      (call.duration_seconds ?? 0) <= 120 ||
      call.lead.firm_id === TEST_FIRM_ID ||
      /\b(test|demo)\b/i.test(`${call.lead.first_name ?? ""} ${call.lead.last_name ?? ""}`);
    if (firmCall) {
      status = "excluded";
      reason = "Firm outreach, application or callback; not a client-lead conversation";
    } else if (!call.lead_id || !call.lead) {
      status = "excluded";
      reason = "No linked client prospect";
    } else if (
      call.lead.firm_id === TEST_FIRM_ID ||
      /\b(test|demo)\b/i.test(`${call.lead.first_name ?? ""} ${call.lead.last_name ?? ""}`)
    ) {
      status = "excluded";
      reason = "Test or demo prospect";
    } else if (call.duration_seconds === null) {
      status = "unknown";
      reason = "Call length is not available yet";
    } else if (call.duration_seconds <= 120) {
      status = "excluded";
      reason = "Conversation was not longer than two minutes";
    } else if (!transcript) {
      status = "no_transcript";
      reason = call.recording_url
        ? "Recording available; queued for transcript recovery"
        : "No transcript or recording saved for this attempt";
      if (
        previous?.source_hash === sourceHash &&
        ["failed", "processing", "excluded"].includes(previous.status)
      ) {
        status = previous.status;
        reason = previous.reason;
        if (
          status === "processing" &&
          (!previous.lease_until || Date.parse(previous.lease_until) <= now)
        )
          status = "no_transcript";
      }
    } else if (
      (call.twilio_call_sid && seenSids.has(call.twilio_call_sid)) ||
      (textKey && seenText.has(textKey))
    ) {
      status = "duplicate";
      reason = "Duplicate recording or identical transcript for the same prospect; analysed once";
    } else if (transcript.length > 120000) {
      status = "unknown";
      reason = "Transcript exceeds the analysis limit; review manually. It has not been truncated.";
    } else if (previous?.source_hash === sourceHash) {
      status = previous.status;
      reason = previous.reason;
      if (
        status === "processing" &&
        (!previous.lease_until || Date.parse(previous.lease_until) <= now)
      ) {
        status = "pending";
        reason = "Interrupted generation; safe to resume";
      }
    }
    const refreshReview =
      !excludedSource &&
      (call.duration_seconds ?? 0) > 120 &&
      ((status === "ready" && previous?.assessment?.reviewVersion !== HOOK_REVIEW_VERSION) ||
        (Boolean(transcript) &&
          !legacyEmpty &&
          previous?.source_hash === sourceHash &&
          Boolean(previous.assessment) &&
          ["ready", "unknown", "excluded"].includes(status) &&
          previous.assessment?.analysisVersion !== HOOK_ANALYSIS_VERSION));
    if (refreshReview) {
      status = "pending";
      reason = "Queued for refreshed client evidence and tailored opening-hook review";
    }
    if (transcript && call.lead && !excludedSource) {
      if (call.twilio_call_sid) seenSids.add(call.twilio_call_sid);
      if (textKey) seenText.add(textKey);
    }
    const item: HookListItem = {
      callId: call.id,
      clientSource,
      clientName: clientSource
        ? [call.lead?.first_name, call.lead?.last_name].filter(Boolean).join(" ") ||
          "Unnamed client"
        : null,
      leadId: call.lead_id,
      createdAt: call.created_at,
      duration: call.duration_seconds,
      status,
      reason,
      hook: status === "ready" ? (previous?.hook ?? null) : null,
      generatedAt: previous?.source_hash === sourceHash ? previous.generated_at : null,
      attempts: previous?.attempts ?? 0,
      insight:
        !excludedSource &&
        previous?.source_hash === sourceHash &&
        (["ready", "unknown", "excluded"].includes(status) || refreshReview)
          ? (previous.assessment?.insight ?? null)
          : null,
      theme:
        !excludedSource && previous?.source_hash === sourceHash
          ? (previous.assessment?.theme ?? null)
          : null,
      recoverable: !transcript && Boolean(call.recording_url) && status === "no_transcript",
      bookingOutcome: call.bookingOutcome,
      outcome:
        call.hasBooking ||
        ["booked_deposit_paid", "booked_no_deposit"].includes(call.lead?.status ?? "")
          ? "booked"
          : ["had_convo_no_sale", "did_not_qualify", "not_interested", "lost"].includes(
                call.lead?.status ?? "",
              )
            ? "did_not_proceed"
            : "follow_up",
      barrier:
        !excludedSource && previous?.source_hash === sourceHash
          ? (previous.assessment?.barrier ?? null)
          : null,
      successful:
        call.hasBooking ||
        call.lead?.status === "booked_deposit_paid" ||
        call.lead?.status === "booked_no_deposit",
    };
    const recovery =
      previous?.source_hash === sourceHash
        ? (previous.assessment as unknown as { recordingRecovery?: unknown } | null)
            ?.recordingRecovery
        : undefined;
    return {
      call,
      item,
      sourceHash,
      recovery,
      refreshReview,
      retryDue:
        status === "failed" &&
        (previous?.attempts ?? 0) < 4 &&
        now >=
          Date.parse(previous?.updated_at ?? "") +
            60_000 * 2 ** Math.min(previous?.attempts ?? 0, 5),
    };
  });
  return items.sort(
    (a, b) =>
      b.call.created_at.localeCompare(a.call.created_at) || b.call.id.localeCompare(a.call.id),
  );
}
async function readInventory(db: SupabaseClient) {
  const [calls, saved, firmSources, firms, appointments] = await Promise.all([
    collectPages((from, to) =>
      db.from("call_records").select(CALL_COLUMNS).order("id").range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("call_hook_insights")
        .select(
          "call_id,source_hash,status,reason,hook,assessment,generated_at,attempts,lease_until,updated_at",
        )
        .order("call_id")
        .range(from, to),
    ),
    loadFirmCallSources(db),
    collectPages((from, to) =>
      db.from("firms").select("id,city,is_active").order("id").range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("firm_appointments")
        .select("id,lead_id,status,outcome,disqualified_at,created_at")
        .order("created_at")
        .order("id")
        .range(from, to),
    ),
  ]);
  // Intake markets exist independently of partner availability (Sydney currently
  // has only a test firm). This defines coverage, never a client's own location.
  const serviceCities = [
    ...new Set([
      ...CLIENT_INTAKE_CITIES,
      ...firms.filter((f) => f.id !== TEST_FIRM_ID && f.city).map((f) => f.city as string),
    ]),
  ].sort();
  const bookings = new Map(
    appointments
      .filter((a) => a.lead_id && !a.disqualified_at && a.outcome !== "disqualified")
      .map((a) => [a.lead_id, a]),
  );
  return hookInventory(
    (calls as unknown as HookCall[]).map((call) => {
      const booking = bookings.get(call.lead_id);
      return {
        ...call,
        serviceCities,
        hasBooking: Boolean(booking),
        bookingOutcome: booking
          ? booking.status === "cancelled"
            ? "Cancelled"
            : booking.status === "no_show" || booking.outcome === "noshow"
              ? "No-show"
              : booking.status === "showed" || ["show", "signed"].includes(booking.outcome ?? "")
                ? "Attended"
                : "Booked"
          : undefined,
      };
    }),
    saved as unknown as Saved[],
    Date.now(),
    firmSources,
  );
}
type Inventory = Awaited<ReturnType<typeof readInventory>>;
const inventoryCaches = new WeakMap<
  SupabaseClient,
  ReturnType<typeof createSnapshotCache<Inventory>>
>();
function inventoryCache(db: SupabaseClient) {
  let cache = inventoryCaches.get(db);
  if (!cache) {
    cache = createSnapshotCache<Inventory>(30_000);
    inventoryCaches.set(db, cache);
  }
  return cache;
}
function inventory(db: SupabaseClient) {
  return inventoryCache(db).read(() => readInventory(db));
}

export async function loadCallHooks(
  input: {
    page: number;
    search?: string;
    outcome?: "all" | "booked" | "did_not_proceed" | "follow_up";
    filter: "insights" | "ready" | "all" | "pending" | "unknown" | "excluded" | "failed";
  },
  db: SupabaseClient = supabaseAdmin,
) {
  const [all, worker] = await Promise.all([
    inventory(db),
    db.from("app_settings").select("value").eq("key", "call_hook_worker").maybeSingle(),
  ]);
  const workerState = worker.data?.value as { lastRunAt?: string; status?: string } | null;
  const automationActive =
    !worker.error &&
    Boolean(workerState?.lastRunAt && Date.now() - Date.parse(workerState.lastRunAt) < 5 * 60_000);
  const coverage: HookCoverage = {
    total: all.length,
    transcribed: 0,
    ready: 0,
    pending: 0,
    processing: 0,
    unknown: 0,
    excluded: 0,
    failed: 0,
    no_transcript: 0,
    duplicate: 0,
  };
  for (const { call, item } of all) {
    coverage[item.status]++;
    if (call.transcript?.trim()) coverage.transcribed++;
  }
  const search = (input.search ?? "").trim().toLowerCase();
  const selected = all
    .map((r) => r.item)
    .filter(
      (r) =>
        r.clientSource !== false &&
        (!input.outcome || input.outcome === "all" || r.outcome === input.outcome) &&
        (!search ||
          [r.hook, r.insight, r.barrier, r.clientName].some((text) =>
            text?.toLowerCase().includes(search),
          )) &&
        (input.filter === "all" ||
          (input.filter === "insights" && Boolean(r.insight || r.hook)) ||
          r.status === input.filter ||
          (input.filter === "excluded" && ["duplicate", "no_transcript"].includes(r.status)) ||
          (input.filter === "pending" && (r.status === "processing" || r.recoverable))),
    );
  const size = 48;
  return {
    coverage,
    automationActive,
    clientTotal: all.filter((r) => r.item.clientSource).length,
    clientTranscribed: all.filter((r) => r.item.clientSource && r.call.transcript?.trim()).length,
    sourceExcluded: all.filter((r) => !r.item.clientSource).length,
    insightCount: all.filter((r) => r.item.insight || r.item.hook).length,
    retrying: all.filter((r) => r.retryDue).length,
    recoverable: all.filter((r) => r.item.recoverable).length,
    themes: ["funding", "property", "parenting", "process", "timing", "other"].map((theme) => ({
      theme,
      count: new Set(
        all.filter((r) => r.item.insight && r.item.theme === theme).map((r) => r.call.lead_id),
      ).size,
    })),
    items: selected.slice(input.page * size, (input.page + 1) * size),
    total: selected.length,
    hasMore: (input.page + 1) * size < selected.length,
    providerReady: Boolean(legalEnv["ANTHROPIC_API_KEY"]),
    transcriptionReady: Boolean(
      legalEnv["OPENAI_API_KEY"] &&
      legalEnv["TWILIO_ACCOUNT_SID"] &&
      legalEnv["TWILIO_AUTH_TOKEN"],
    ),
    promptVersion: HOOK_PROMPT_VERSION,
    model: HOOK_MODEL,
    scannedAt: new Date().toISOString(),
  };
}

const EVIDENCE_JSON = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: { type: "string", enum: ["eligibility", "affordability", "seriousness", "hook"] },
    line: { type: "integer" },
  },
  required: ["claim", "line"],
};
const ASSESSMENT_JSON = {
  type: "object",
  additionalProperties: false,
  properties: {
    genuineConversation: { type: ["boolean", "null"] },
    familyLawNeed: { type: ["boolean", "null"] },
    serviceCity: { type: ["string", "null"] },
    serviceArea: { type: "string", enum: ["inside", "outside", "unknown"] },
    barrier: { type: ["string", "null"] },
    matterType: {
      type: "string",
      enum: ["property", "property_parenting", "parenting_only", "unknown"],
    },
    netAssetPoolAud: { type: ["number", "null"] },
    ownSavingsAud: { type: ["number", "null"] },
    affordable: { type: ["boolean", "null"] },
    serious: { type: ["boolean", "null"] },
    fundingRoute: { type: "string", enum: ["savings", "family", "litigation", "unknown"] },
    hook: { type: ["string", "null"] },
    evidence: { type: "array", items: EVIDENCE_JSON },
    insight: { type: ["string", "null"] },
    theme: {
      type: "string",
      enum: ["funding", "property", "parenting", "process", "timing", "other", "none"],
    },
  },
  required: [
    "genuineConversation",
    "familyLawNeed",
    "serviceArea",
    "serviceCity",
    "barrier",
    "matterType",
    "netAssetPoolAud",
    "ownSavingsAud",
    "affordable",
    "serious",
    "fundingRoute",
    "hook",
    "evidence",
    "insight",
    "theme",
  ],
};
type Generate = typeof anthropic;
class HookAssessmentFailure extends Error {
  constructor(stage: string) {
    super(
      `Call assessment failed during ${stage}. Retry this call; no substitute hook was created.`,
    );
  }
}
export async function assessCallHook(call: HookCall, generate: Generate = anthropic) {
  if (!call.lead || !call.transcript)
    throw new Error("A linked prospect and transcript are required.");
  const lines = transcriptLines(call.transcript);
  const evidenceLines = lines.flatMap((line, index) =>
    line.trim().length >= 8 ? [index + 1] : [],
  );
  // Restrict source references to actual substantive segments. Only ordinal
  // numbers enter the schema; source text stays in the approved request body.
  // Keep very large schemas bounded; the same deterministic validator applies.
  const assessmentSchema =
    evidenceLines.length > 0 && evidenceLines.length <= 4096
      ? {
          ...ASSESSMENT_JSON,
          properties: {
            ...ASSESSMENT_JSON.properties,
            evidence: {
              type: "array",
              items: {
                ...EVIDENCE_JSON,
                properties: {
                  ...EVIDENCE_JSON.properties,
                  line: { type: "integer", enum: evidenceLines },
                },
              },
            },
          },
        }
      : ASSESSMENT_JSON;
  const source = JSON.stringify({
    crm: {
      status: call.lead.status,
      fundingPreference: call.lead.funding_preference,
      fundingVerdict: fundingVerdict(call.lead),
      city: call.lead.city ?? null,
      serviceCities: call.serviceCities ?? [],
      durationSeconds: call.duration_seconds,
    },
    transcript: lines
      .map((line, i) =>
        line.trim().length < 8 ? `[Context only, not evidence] ${line}` : `[L${i + 1}] ${line}`,
      )
      .join("\n"),
  });
  let stage = "the provider assessment request";
  let validationHint = "";
  try {
    let assessment: HookAssessment | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      stage = "the provider assessment request";
      const formatting =
        "\nEvidence format: return at most 12 {claim,line} references to the supplied [L#] source segments. Do not write quote strings: the server retrieves the original words. Use separate references for facts spread over several segments. Insight must be one concise, anonymised sentence of 6–40 words, max 260 characters. Return null for unsupported facts. The transport schema uses theme=none when insight=null; the server stores it as null. Advertising hooks must invite exploration neutrally: no allegation-based scare copy, fight language, personal circumstances asserted about the viewer, or unlimited-funding promises. A concern must come from the client, not the representative's pitch. Financial proof is not required for this research.";
      const correction =
        attempt === 0
          ? ""
          : `\nThe previous response failed validation: ${validationHint}. Reassess the original source. Evidence must contain at most 12 {claim,line} references to substantive numbered source segments, without quote strings. All qualification requirements still apply.`;
      const response = await generate(
        HOOK_SYSTEM_PROMPT + formatting + correction,
        source,
        2800,
        assessmentSchema,
      );
      try {
        stage = "structured response validation";
        const parsed = JSON.parse(response);
        if (parsed?.theme === "none") parsed.theme = null;
        stage = "exact transcript evidence validation";
        assessment = materializeHookEvidence(parsed, call.transcript);
        stage = "hook privacy and wording validation";
        if (
          qualifyHook(assessment, call.lead, call.duration_seconds, call.serviceCities).status ===
          "ready"
        )
          validateHookSafety(assessment.hook!, call.lead);
        if (assessment.insight) validateHookSafety(assessment.insight, call.lead, "finding");
        if (assessment.barrier) validateHookSafety(assessment.barrier, call.lead, "finding");
        break;
      } catch (error) {
        const allowedFields = new Set(Object.keys(ASSESSMENT_JSON.properties));
        const invalidFields =
          error instanceof ZodError
            ? [
                ...new Set(
                  error.issues
                    .map((issue) => String(issue.path[0]))
                    .filter((field) => allowedFields.has(field)),
                ),
              ]
            : [];
        // Only fixed schema field names enter diagnostics; never source text,
        // provider output, input values or private identifiers.
        const referenceHint =
          error instanceof Error &&
          /^Invalid evidence reference L\d+: (outside the transcript|context-only segment too short to establish a claim)$/.test(
            error.message,
          )
            ? error.message
            : null;
        validationHint = invalidFields.length
          ? `invalid schema fields (${invalidFields.join(", ")}); observe their type, length and item limits`
          : (referenceHint ??
            (stage === "exact transcript evidence validation"
              ? "an evidence reference did not identify a valid, nonempty source segment"
              : "the proposed wording did not pass the privacy, single-sentence or length checks"));
        if (invalidFields.length)
          stage = `structured field validation (${invalidFields.join(", ")})`;
        else if (referenceHint)
          stage = `exact transcript evidence validation (${referenceHint.includes("outside") ? "reference outside source" : "context-only reference"})`;
        if (attempt === 1) throw error;
      }
    }
    if (!assessment) throw new Error("No validated assessment");
    assessment.analysisVersion = HOOK_ANALYSIS_VERSION;
    const decision = qualifyHook(assessment, call.lead, call.duration_seconds, call.serviceCities);
    if (decision.status === "ready" || assessment.insight) {
      stage = "hook privacy and wording validation";
      if (decision.status === "ready") validateHookSafety(assessment.hook!, call.lead);
      if (assessment.insight) validateHookSafety(assessment.insight, call.lead, "finding");
      if (assessment.barrier) validateHookSafety(assessment.barrier, call.lead, "finding");
      // Independent request re-reads the source, including speaker attribution,
      // qualification, and privacy. A failed review never returns a fallback hook.
      stage = "the provider evidence review request";
      const reviewed = JSON.parse(
        await generate(
          `${HOOK_SYSTEM_PROMPT}\nYou are the final independent reviewer, not the original writer. supported=true only if this is a genuine two-way family-law conversation, the service location is supported by the supplied service cities and CRM city or explicit client evidence, and the hook addresses a specific CLIENT concern. Check all source segments for contradictions and speaker attribution. Do NOT require financial evidence or a booking. Return concernEvidenceLine and concernEvidenceQuote as an exact short quote (12–300 characters) establishing the CLIENT concern underlying the hook; a rep pitch is insufficient. Independently set insightSupported and barrierSupported only for accurate, anonymised client findings. A missing concern, outside/unknown area, unsafe wording or invented fact means supported=false.`,
          JSON.stringify({ source: JSON.parse(source), proposal: assessment }),
          1200,
          {
            type: "object",
            additionalProperties: false,
            properties: {
              supported: { type: "boolean" },
              insightSupported: { type: "boolean" },
              barrierSupported: { type: "boolean" },
              concernEvidenceLine: { type: ["integer", "null"] },
              concernEvidenceQuote: { type: ["string", "null"] },
            },
            required: [
              "supported",
              "insightSupported",
              "barrierSupported",
              "concernEvidenceLine",
              "concernEvidenceQuote",
            ],
          },
        ),
      );
      if (
        reviewed.insightSupported !== true ||
        !assessment.evidence.some((e) => e.claim === "hook")
      ) {
        assessment.insight = null;
        assessment.theme = null;
      }
      if (reviewed.barrierSupported !== true) assessment.barrier = null;
      let concernEvidence: HookAssessment["evidence"][number] | undefined;
      if (
        decision.status === "ready" &&
        reviewed.supported === true &&
        typeof reviewed.concernEvidenceQuote === "string" &&
        reviewed.concernEvidenceQuote.trim().length >= 12 &&
        reviewed.concernEvidenceQuote.length <= 300
      ) {
        try {
          concernEvidence = materializeHookEvidence(
            {
              ...assessment,
              evidence: [
                {
                  claim: "hook",
                  line: reviewed.concernEvidenceLine,
                  quote: reviewed.concernEvidenceQuote,
                },
              ],
            },
            call.transcript,
          ).evidence[0];
        } catch {
          /* Unmatched evidence cannot publish a hook. */
        }
      }
      if (decision.status === "ready" && (reviewed.supported !== true || !concernEvidence))
        return {
          status: "unknown" as const,
          reason: "The client's concern, service area or final wording could not be verified.",
          assessment,
          hook: null,
        };
      if (decision.status === "ready" && concernEvidence) {
        assessment.evidence = [
          ...assessment.evidence.filter((e) => e.claim !== "hook"),
          concernEvidence,
        ];
        assessment.reviewVersion = HOOK_REVIEW_VERSION;
      }
    }
    return { ...decision, assessment, hook: decision.status === "ready" ? assessment.hook : null };
  } catch (error) {
    // Stage names are fixed text; never retain provider output or source excerpts in errors.
    if (stage.includes("provider") && error instanceof Error) {
      const http = error.message.match(/^Anthropic request failed \[(\d{3})\]:/);
      if (http) {
        const detail = /credit balance|insufficient.*credit/i.test(error.message)
          ? "; provider credit balance"
          : /schema.*complex|compilation/i.test(error.message)
            ? "; schema compilation"
            : /json_schema|output_config|unsupported.*schema|schema.*unsupported/i.test(
                  error.message,
                )
              ? "; structured-output schema"
              : "";
        stage += ` (HTTP ${http[1]}${detail})`;
      } else if (/took too long|timed out|timeout/i.test(error.message)) {
        stage += " (request timed out)";
      } else if (
        error.message === "The evidence response was incomplete. Please retry the summary."
      ) {
        stage += " (response token limit)";
      }
    }
    throw new HookAssessmentFailure(stage);
  }
}

export async function processNextCallHook(
  input: { callId?: string | undefined; regenerate: boolean },
  userId: string | null,
  db: SupabaseClient = supabaseAdmin,
  generate: Generate = anthropic,
  transcribe: typeof transcribeRecording = transcribeRecording,
  recoverStep: typeof transcribeRecordingStep = transcribeRecordingStep,
  preparedInventory?: Inventory,
) {
  if (generate === anthropic && !legalEnv["ANTHROPIC_API_KEY"])
    throw new Error(
      "The existing Anthropic connection is not configured on this server (ANTHROPIC_API_KEY).",
    );
  const all = preparedInventory ?? (await inventory(db));
  const candidates = input.callId
    ? all.filter((r) => r.call.id === input.callId)
    : all
        .filter((r) => r.item.status === "pending" || r.item.recoverable || r.retryDue)
        .sort((a, b) => (b.call.duration_seconds ?? 0) - (a.call.duration_seconds ?? 0));
  const remaining = () =>
    all.filter((r) => r.item.status === "pending" || r.item.recoverable).length;
  if (!candidates.length)
    return {
      processed: false,
      remaining: 0,
      message: "No pending calls in the accessible history.",
    };
  // Another session can claim the first pending call after our inventory read.
  // Try other candidates under the same atomic lease instead of stopping the batch.
  let candidate: (typeof all)[number] | undefined;
  let token: string | null = null;
  for (const next of candidates.slice(0, 8)) {
    if (
      ["excluded", "duplicate", "processing"].includes(next.item.status) ||
      (next.item.status === "no_transcript" && !next.item.recoverable) ||
      (next.item.status === "unknown" &&
        (!next.call.transcript ||
          next.call.transcript.length > 120000 ||
          (next.call.duration_seconds ?? 0) <= 120))
    )
      return {
        processed: false,
        remaining: all.filter((r) => r.item.status === "pending").length,
        message: next.item.reason,
      };
    const { data, error } = await db.rpc("claim_call_hook", {
      p_call: next.call.id,
      p_hash: next.sourceHash,
      p_version: HOOK_PROMPT_VERSION,
      p_model: HOOK_MODEL,
      p_user: userId,
      p_regenerate: input.regenerate || next.refreshReview,
    });
    if (error)
      throw new Error("Could not reserve this call. Check the Call Insights migration and retry.");
    if (data) {
      candidate = next;
      token = data;
      break;
    }
  }
  if (!candidate || !token)
    return {
      processed: false,
      remaining: all.filter((r) => r.item.status === "pending").length,
      message: "Already processed or being processed in another session.",
    };
  const { call, sourceHash } = candidate;
  try {
    if (!call.transcript?.trim() && call.recording_url) {
      const media = new URL(call.recording_url);
      if (
        media.protocol !== "https:" ||
        media.hostname !== "api.twilio.com" ||
        !/^\/2010-04-01\/Accounts\/AC[a-fA-F0-9]+\/Recordings\/RE[a-fA-F0-9]+(?:\.(wav|mp3|json))?$/.test(
          media.pathname,
        )
      )
        throw new HookAssessmentFailure("recording source validation");
      let transcript: string;
      try {
        if (transcribe === transcribeRecording) {
          const step = await recoverStep(call.recording_url, candidate.recovery);
          if (!step.complete) {
            const checkpoint = await db
              .from("call_hook_insights")
              .update({
                status: "processing",
                assessment: { recordingRecovery: step.progress },
                hook: null,
                reason: `Recovered ${step.progress.nextWindow} of ${step.progress.totalWindows} audio sections; ready to continue`,
                lease_until: new Date(0).toISOString(),
                generation_token: null,
                generated_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq("call_id", call.id)
              .eq("source_hash", sourceHash)
              .eq("generation_token", token)
              .select("call_id");
            if (checkpoint.error || !checkpoint.data?.length) throw new Error("save_failed");
            return {
              processed: true,
              partial: true,
              remaining: remaining(),
              message: `Recovered audio section ${step.progress.nextWindow} of ${step.progress.totalWindows}; continuing safely from this checkpoint.`,
            };
          }
          transcript = step.transcript;
        } else transcript = await transcribe(call.recording_url);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const tooShort =
          /^Speaker transcription failed \[400\]:/.test(message) &&
          /audio.{0,80}too short|minimum (audio )?(length|duration)|duration.{0,30}at least/i.test(
            message,
          );
        const emptyAudio = message === "Recording contains no audio frames";
        if (message === "No speech could be verified in the recording" || tooShort || emptyAudio) {
          const saved = await db
            .from("call_hook_insights")
            .update({
              status: "excluded",
              reason: tooShort
                ? "Audio checked: the recording is below the provider's minimum duration for verifying speech. No transcript was invented."
                : emptyAudio
                  ? "Audio checked: the saved recording contains no audio frames. No transcript was invented."
                  : "Audio checked: no verifiable speech was returned. No transcript was invented.",
              assessment: null,
              hook: null,
              lease_until: null,
              generation_token: null,
              generated_at: new Date().toISOString(),
            })
            .eq("call_id", call.id)
            .eq("generation_token", token);
          if (saved.error) throw new Error("save_failed");
          return {
            processed: true,
            remaining: Math.max(0, remaining() - 1),
            message: "Audio checked; no verifiable speech returned.",
          };
        }
        const download = message.match(/^Could not download recording \[(\d{3})\]$/);
        const provider = message.match(/^Speaker transcription failed \[(\d{3})\]/);
        const audioStages: Record<string, string> = {
          "Recording is not a valid WAV file": "recording WAV format validation",
          "Recording WAV data is truncated": "recording download completeness validation",
          "Recording must use 16-bit PCM audio": "recording PCM format validation",
          "Recording has unsupported or empty PCM data": "recording PCM structure validation",
          "Transcription returned no timed segments":
            "transcription response missing timed segments",
          "Transcription returned invalid timed segments": "transcription timestamp validation",
          "Transcription returned no speaker labels": "transcription speaker-label validation",
        };
        const audioStage =
          audioStages[message] ??
          (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)
            ? "recording or transcription request timeout"
            : "audio decoding or transcription response validation");
        throw new HookAssessmentFailure(
          download
            ? `recording download (HTTP ${download[1]})`
            : provider
              ? `transcription provider (HTTP ${provider[1]})`
              : audioStage,
        );
      }
      if (!transcript.trim())
        throw new HookAssessmentFailure("recording recovery (empty transcript)");
      // Never overwrite a transcript saved by another process while recovering.
      let save = db
        .from("call_records")
        .update({ transcript })
        .eq("id", call.id)
        .eq("recording_url", call.recording_url);
      save =
        call.transcript === null
          ? save.is("transcript", null)
          : save.eq("transcript", call.transcript);
      const recovered = await save.select("id");
      if (recovered.error) throw new Error("save_failed");
      const released = await db
        .from("call_hook_insights")
        .update({
          status: "unknown",
          reason: "Recording recovered; transcript awaiting assessment",
          lease_until: null,
          generation_token: null,
        })
        .eq("call_id", call.id)
        .eq("generation_token", token);
      if (released.error) throw new Error("save_failed");
      return {
        processed: true,
        remaining: Math.max(1, remaining()),
        message: "Transcript recovered and saved. It is now queued for evidence assessment.",
      };
    }
    const result = await assessCallHook(call, generate);
    const current = await db.from("call_records").select(CALL_COLUMNS).eq("id", call.id).single();
    if (
      current.error ||
      isFirmCall(current.data as unknown as HookCall, await loadFirmCallSources(db)) ||
      callHookFingerprint({
        ...(current.data as unknown as HookCall),
        serviceCities: call.serviceCities,
      }) !== sourceHash
    )
      throw new Error("source_changed");
    const { data: updated, error } = await db
      .from("call_hook_insights")
      .update({
        status: result.status,
        reason: result.reason,
        hook: result.hook,
        assessment: result.assessment,
        generated_at: new Date().toISOString(),
        lease_until: null,
        generation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("call_id", call.id)
      .eq("generation_token", token)
      .eq("source_hash", sourceHash)
      .select("call_id");
    if (error || !updated?.length) throw new Error("save_failed");
    return {
      processed: true,
      remaining: Math.max(0, remaining() - 1),
      message: result.status === "ready" ? "Hook generated and evidence checked." : result.reason,
    };
  } catch (failure) {
    // Never return/log provider responses: they can contain sensitive source text.
    const reason =
      failure instanceof HookAssessmentFailure
        ? failure.message
        : failure instanceof Error && failure.message === "source_changed"
          ? "The source changed during assessment. Retry against the latest call; no hook was saved."
          : "Saving the assessment failed. Retry this call; no substitute hook was created.";
    const { error } = await db
      .from("call_hook_insights")
      .update({
        status: "failed",
        reason,
        lease_until: null,
        generation_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("call_id", call.id)
      .eq("generation_token", token);
    if (error)
      throw new Error(
        "Could not save generation status. The interrupted call can be resumed after its lease expires.",
      );
    throw new Error(
      "This call could not be verified or saved. It is marked for an explicit retry.",
    );
  } finally {
    inventoryCache(db).clear();
  }
}
export async function loadHookEvidence(callId: string, db: SupabaseClient = supabaseAdmin) {
  const [call, record] = await Promise.all([
    db.from("call_records").select(CALL_COLUMNS).eq("id", callId).single(),
    db
      .from("call_hook_insights")
      .select("source_hash,assessment,model,prompt_version,generated_at,status")
      .eq("call_id", callId)
      .maybeSingle(),
  ]);
  if (call.error || record.error || !call.data)
    throw new Error("This call is no longer available.");
  const firms = await collectPages((from, to) =>
    db.from("firms").select("id,city,is_active").order("id").range(from, to),
  );
  // Keep this evidence fingerprint consistent with the worker's intake-market coverage.
  const serviceCities = [
    ...new Set([
      ...CLIENT_INTAKE_CITIES,
      ...firms.filter((f) => f.id !== TEST_FIRM_ID && f.city).map((f) => f.city as string),
    ]),
  ].sort();
  const source = { ...(call.data as unknown as HookCall), serviceCities };
  if (!source.lead_id || !source.lead || isFirmCall(source, await loadFirmCallSources(db)))
    throw new Error(
      "Call Insights only includes client-lead conversations. Firm calls are excluded.",
    );
  const current = record.data?.source_hash === callHookFingerprint(source);
  return {
    transcript: source.transcript,
    evidence: current ? ((record.data?.assessment as HookAssessment | null)?.evidence ?? []) : [],
    current,
    model: record.data?.model as string | null,
    promptVersion: record.data?.prompt_version as string | null,
  };
}

/** Runs independently of the browser. The existing per-call leases tolerate overlap. */
export async function runCallHookWorker(
  db: SupabaseClient = supabaseAdmin,
  generate: Generate = anthropic,
) {
  const startedAt = new Date().toISOString();
  if (generate === anthropic && !legalEnv["ANTHROPIC_API_KEY"])
    return { status: "unavailable", processed: 0, failed: 0 };
  const boundedGenerate: Generate =
    generate === anthropic
      ? (system, user, tokens, schema) => anthropic(system, user, tokens, schema, 30_000)
      : generate;
  const all = await inventory(db);
  const candidates = all.filter(
    (r) => r.item.status === "pending" || r.item.recoverable || r.retryDue,
  );
  // Recent calls are first; each minute also drains the existing historical backlog.
  const results = await Promise.allSettled(
    candidates
      .slice(0, 3)
      .map((r) =>
        processNextCallHook(
          { callId: r.call.id, regenerate: r.refreshReview },
          null,
          db,
          boundedGenerate,
          transcribeRecording,
          transcribeRecordingStep,
          all,
        ),
      ),
  );
  const processed = results.filter((r) => r.status === "fulfilled" && r.value.processed).length;
  const failed = results.filter((r) => r.status === "rejected").length;
  const state = {
    status: failed ? "retrying" : "ok",
    processed,
    failed,
    remaining: Math.max(0, candidates.length - processed),
    lastRunAt: startedAt,
  };
  const saved = await db.from("app_settings").upsert(
    { key: "call_hook_worker", value: state },
    { onConflict: "key" },
  );
  if (saved.error) throw new Error("Could not save call review worker status.");
  return state;
}
