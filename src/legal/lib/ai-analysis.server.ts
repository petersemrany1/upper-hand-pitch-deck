// Ported from the Legal app (family-law-floater/src/lib/ai-analysis.server.ts). Re-run the port script to refresh.
import { legalEnv } from "@/legal/runtime/env";
import { withIntelTimeoutMessage } from "./intel-timeout.server";
// Server-only call intelligence: Twilio recording -> speaker-labelled transcript -> two
// Anthropic passes -> whitelist filtering -> condensed client-intel bullets.
// Client-facing intelligence is checked against original source evidence.
import { transcribeRecording } from "./recording-transcription.server";
import { NoSpeechRecordingError } from "./recording-audio";
import { independentIntelReview } from "./intel-review.server";
import { cachedIntel, intelFingerprint } from "./intel-cache.server";
import { cachedIntelProgress, intelReviewKey, type IntelProgress } from "./intel-progress.server";
import {
  HandoverContinuation,
  retryableIntelError,
  type HandoverWork,
} from "./handover-work.server";
export { transcribeRecording } from "./recording-transcription.server";
import {
  ATTRIBUTION_RULES,
  INTEL_REVIEW_PROMPT,
  indexedIntelSources,
  resolveIndexedReview,
  assessReviewedIntel,
  type IntelReviewDecision,
  type IntelSource,
} from "./client-intel-evidence";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export const ALLOWED_NO_SALE_REASONS = [
  "worried about cost",
  "can't afford fees right now",
  "wants fixed fee certainty",
  "waiting to see what ex does",
  "hoping to sort it between themselves",
  "mediation already booked",
  "already has a lawyer",
  "had a bad lawyer experience",
  "doesn't trust lawyers",
  "not ready emotionally",
  "scared of making it worse",
  "worried about the kids' reaction",
  "needs to talk to family first",
  "wants to wait for divorce to finalise",
  "house sale in progress",
  "just researching for now",
  "thinks it's too early",
  "thinks assets are too small",
  "ex controls the money",
  "new job or moving house",
  "comparing firms",
  "wants a specific gender lawyer",
  "firm location too far",
  "already in court elsewhere",
  "doesn't believe funding is real",
  "too busy with work",
  "wasn't expecting a call",
  "needs more time to think",
] as const;

export const ALLOWED_PAIN_POINTS = [
  "still living under the same roof",
  "ex controlling the finances",
  "locked out of accounts",
  "paying the mortgage alone",
  "house sale blocked",
  "ex hiding money",
  "ex has a lawyer and they don't",
  "ex delaying everything",
  "hostile communication",
  "kids caught in the middle",
  "can't see the kids enough",
  "business tangled together",
  "worried about losing the house",
  "no formal agreement in place",
  "super uncertainty",
  "new partner complicating things",
  "family pressuring them",
  "sleepless and anxious",
  "dragging on for years",
  "already burnt money on a lawyer",
] as const;

export const ALLOWED_DREAM_OUTCOMES = [
  "keep the house",
  "fair split",
  "clean break",
  "sort it without court",
  "protect the business",
  "secure the kids' arrangements",
  "get name off the mortgage",
  "financial certainty",
  "move on with life",
  "done before a specific event",
  "keep it amicable",
  "protect an inheritance",
  "get the super split done",
  "stop paying for everything",
  "buy their own place",
] as const;

export const ALLOWED_ENGAGEMENT_HOOKS = [
  "litigation funding explained",
  "no court consent orders explained",
  "four step test explained",
  "no automatic 50/50 myth busted",
  "stamp duty exemption",
  "super splitting explained",
  "duty of disclosure explained",
  "time limits urgency",
  "free consult vs normal cost",
  "accredited specialist credential",
  "firm settlement volume",
  "rep validated their situation",
  "asked detailed questions",
  "mentioned a specific deadline",
  "reacted to why now question",
  "willing to pay deposit immediately",
  "asked who the lawyer is",
] as const;

export const ALLOWED_CALL_OUTCOMES = [
  "Booked",
  "Not Interested",
  "No Answer",
  "Needs Follow Up",
  "Callback Scheduled",
] as const;

/** Shared writing contract for transcript summaries and manually recorded discovery notes. */
export const HANDOVER_BRIEF_RULES = `Write a concise, lawyer-facing consultation brief, not a transcript digest. Return ONLY labelled bullets, each beginning '- Category: '. The renderer supplies the section headings. Use plain third-person summaries; NEVER output verbatim quotations, 'Client’s words', repeated remarks or fragments of speech. Aim for about 350–500 words for a complex matter; simpler matters should be shorter. This is a guide, not a truncation limit: preserve material facts, financial figures, contributions, deadlines, funding constraints and actual client questions.

Use these categories in order, omitting categories with no supported information:
Situation: Summarise relationship/separation timeline, current living arrangements, children and relevant conflict or proceedings in 1–2 compact bullets. Attribute allegations. Preserve material uncertainty without narrating every correction in the conversation.
Assets: ONE coherent bullet PER PROPERTY containing its location/description, current estimated VALUE or range, ownership/title and associated CURRENT LOAN balance and borrowers, wherever stated. Keep a linked offset with that property; distinguish it from independent savings and from loan principal. Put acquisition history/source of funds with the relevant property when material. Group the remaining assets and debts compactly with ownership and figures. Use a separate contributions bullet for material payments and acquisition contributions; do not treat repayments as extra debts. Do not add balances that describe the same facility, treat an old balance as an additional loan, or reconcile an ambiguous figure by assumption. Flag the specific uncertainty briefly. Never calculate a legal entitlement or an unconfirmed net pool.
Income / work: Include relevant work/business facts and reliably stated income, distinguishing aspirations from established earnings. If the amount or annual/monthly period is garbled, omit the number and briefly flag clarification if material.
Other side: Summarise current or former representation and documents signed/filed where supported. Name the other party's firm only if the client named it. Do not repeat background already covered.
Goal: In 1–2 sentences, summarise what the client actually wants to achieve, their preferred outcome and any explicitly stated fallback (e.g. sale if a buyout fails), including timing/conditions. Do not quote them or substitute a predicted legal outcome for a goal.
Funding: Clearly distinguish PREFERRED funding method, any ALTERNATIVE actually discussed, and what remains UNCONFIRMED. Include available funds/access constraints and concerns about repaying funding where property is retained instead of cash received. A question about litigation funding is not a refusal or agreement; discussing refinancing does not establish borrowing capacity or approval. If no fallback was agreed, say so briefly rather than inventing one. Do not repeat an intake funding selection as a confirmed preference when the call says otherwise.
Pricing: ONLY when legal pricing was actually discussed. State the lawyer's hourly rate or other legal fees explained and GST treatment if stated. Identify whether pricing was explained or the client expressly agreed; do not infer agreement from silence. Omit this category ENTIRELY if pricing was not discussed, unclear or absent: never write 'not discussed', 'not confirmed' or a missing-rate placeholder. Do not infer pricing from a firm's configured rate or include booking deposits/payment administration.
Why now: Briefly state actual urgency and deadlines, without repeating the background. Preserve the strength of the client's words: wanting to make progress before a lease ends is NOT a deadline to resolve, finalise or settle the matter by then. Do not invent a completion deadline or infer urgency from a separate cost concern.
Question for the lawyer: One plainly summarised client question per bullet. Only questions or requests for advice actually raised by the client; no quotations, suggested legal strategy or invented questions.
Objections / risks: Include only material concerns raised by the client that are not already covered elsewhere.

FINAL COMPLETENESS CHECK: Recheck ALL original calls/notes for EACH property's current value, ownership, loan and source of contributions; ensure a property value does not disappear merely because its loan is mentioned elsewhere. Preserve all distinct material assets and liabilities, clearly attributed estimates and unresolved contradictions. Check preferred/fallback funding, repayment constraints, goals/fallbacks, deadlines and any hourly rates actually explained. Combine related facts and remove duplication; never omit a material figure merely to meet the length guide. CRM spelling of the client's name must be retained. Unknown is not zero or absent. Do not infer no children/assets/debts from silence. Never include appointment logistics (shown separately), our salesperson's name, sales tactics, marketing, booking deposits, payment links or internal administration. Evidence quotations belong ONLY in the internal verification, never in this brief.`;

export const PASS_1_SYSTEM_PROMPT = `${ATTRIBUTION_RULES}
You are a client intake analyst preparing a family lawyer for their first consultation. Read the original call transcript, ignoring voicemail/no-answer calls. ${HANDOVER_BRIEF_RULES}`;

export const PASS_2_SYSTEM_PROMPT = `${ATTRIBUTION_RULES}

You are analysing a sales call between a rep and a person enquiring about a family-law property settlement. Return a JSON object with exactly these fields, using ONLY items copied exactly from the fixed lists — no paraphrasing, no new items. Return only valid JSON.

Fields:
- call_outcome: one of ${JSON.stringify(ALLOWED_CALL_OUTCOMES)}
- no_sale_reasons: array, items copied exactly from ALLOWED_NO_SALE_REASONS
- pain_points: array, items copied exactly from ALLOWED_PAIN_POINTS
- dream_outcomes: array, items copied exactly from ALLOWED_DREAM_OUTCOMES
- engagement_hooks: array, items copied exactly from ALLOWED_ENGAGEMENT_HOOKS
- next_action: one short sentence including day/date/time if a callback was agreed
- follow_up_date: ISO date string or null
- follow_up_time: plain English or null

ALLOWED_NO_SALE_REASONS = ${JSON.stringify(ALLOWED_NO_SALE_REASONS)}

ALLOWED_PAIN_POINTS = ${JSON.stringify(ALLOWED_PAIN_POINTS)}

ALLOWED_DREAM_OUTCOMES = ${JSON.stringify(ALLOWED_DREAM_OUTCOMES)}

ALLOWED_ENGAGEMENT_HOOKS = ${JSON.stringify(ALLOWED_ENGAGEMENT_HOOKS)}`;

export const CONDENSE_SYSTEM_PROMPT = `${ATTRIBUTION_RULES}
Prepare one coherent consultation brief from ALL supplied original calls, not separate summaries of each call. Prefer clearly corrected/current figures while preserving unresolved differences. ${HANDOVER_BRIEF_RULES}`;

/** Anything a firm must never see. Enforced in code, not just in the prompt. */
export const BANNED_FIRM_STRINGS = [
  "$75",
  "deposit",
  "stripe",
  "refundable",
  "payment link",
  "holding fee",
  "sales rep",
  "salesperson",
  "marketing campaign",
  "lead generation",
  "facebook ad",
  "sales script",
  "conversion rate",
  "booking fee",
] as const;

export function containsBannedContent(text: string): string[] {
  const haystack = text.toLowerCase();
  return BANNED_FIRM_STRINGS.filter((needle) => {
    // "$75" must not match real pool values like $750,000 or $7,500.
    if (needle === "$75") return /\$75(?![\d,.])/.test(haystack);
    return haystack.includes(needle.toLowerCase());
  });
}

/**
 * True when a single intel line must be dropped. The Assets bullet is an
 * exception for the generic word "deposit"/"deposited" (term deposits and rental
 * income deposited into an offset account are real pool facts) — our own $75
 * holding deposit is still caught by the "$75", "refundable" and payment strings.
 */
export function lineLeaksBannedContent(line: string): boolean {
  const hits = containsBannedContent(line);
  if (!hits.length) return false;
  const isAssets = /^\s*[-•]?\s*assets\s*:/i.test(line);
  return !(isAssets && hits.every((h) => h === "deposit"));
}

/** Drop any bullet that leaks internal/payment content. */
export function sanitiseBullets(text: string): string {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => !lineLeaksBannedContent(line))
    .map((line) =>
      /^- Income \/ work:/i.test(line) &&
      /\b(income|salary|earn)/i.test(line) &&
      /\b(garbled|contradictory|likely annual|period.{0,25}clarif)/i.test(line)
        ? "- Income / work: The client's income amount and pay period need clarification."
        : line,
    )
    .join("\n")
    .trim();
}

function whitelistFilter(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set(allowed);
  return values
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => set.has(v))
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

export type StructuredAnalysis = {
  call_outcome: string | null;
  no_sale_reasons: string[];
  pain_points: string[];
  dream_outcomes: string[];
  engagement_hooks: string[];
  next_action: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
};

export function filterStructured(raw: Record<string, unknown>): StructuredAnalysis {
  const outcome = typeof raw["call_outcome"] === "string" ? raw["call_outcome"].trim() : "";
  return {
    call_outcome: (ALLOWED_CALL_OUTCOMES as readonly string[]).includes(outcome) ? outcome : null,
    no_sale_reasons: whitelistFilter(raw["no_sale_reasons"], ALLOWED_NO_SALE_REASONS),
    pain_points: whitelistFilter(raw["pain_points"], ALLOWED_PAIN_POINTS),
    dream_outcomes: whitelistFilter(raw["dream_outcomes"], ALLOWED_DREAM_OUTCOMES),
    engagement_hooks: whitelistFilter(raw["engagement_hooks"], ALLOWED_ENGAGEMENT_HOOKS),
    next_action: typeof raw["next_action"] === "string" ? raw["next_action"] : null,
    follow_up_date: typeof raw["follow_up_date"] === "string" ? raw["follow_up_date"] : null,
    follow_up_time: typeof raw["follow_up_time"] === "string" ? raw["follow_up_time"] : null,
  };
}

export async function anthropic(
  system: string,
  user: string,
  maxTokens = 3200,
  schema?: Record<string, unknown>,
  timeoutMs = 90_000,
): Promise<string> {
  const key = legalEnv["ANTHROPIC_API_KEY"];
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return withIntelTimeoutMessage(
    "Writing the call summary took too long. Please retry the summary.",
    async () => {
      const response = await fetch(ANTHROPIC_URL, {
        signal: AbortSignal.timeout(timeoutMs),
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          temperature: 0,
          system,
          messages: [{ role: "user", content: user }],
          ...(schema ? { output_config: { format: { type: "json_schema", schema } } } : {}),
        }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`Anthropic request failed [${response.status}]: ${text}`);
      const json = JSON.parse(text) as { content?: Array<{ text?: string }>; stop_reason?: string };
      if (json.stop_reason === "max_tokens")
        throw new Error("The evidence response was incomplete. Please retry the summary.");
      if (json.stop_reason === "refusal")
        throw new Error("The summary could not be verified. Review the call notes.");
      return (json.content ?? [])
        .map((c) => c.text ?? "")
        .join("")
        .trim();
    },
  );
}

export function extractJson(raw: string): Record<string, unknown> {
  const fenced = raw.replace(/```json/gi, "```").split("```");
  const candidates = [raw, ...fenced];
  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  throw new Error("Pass 2 did not return valid JSON");
}

export type CallAnalysis = {
  summary: string;
  structured: StructuredAnalysis;
  analysed_at: string;
};

/** Both Anthropic passes over one transcript. */
export async function analyseTranscript(transcript: string): Promise<CallAnalysis> {
  const summaryRaw = await anthropic(PASS_1_SYSTEM_PROMPT, `TRANSCRIPT:\n\n${transcript}`);
  const structuredRaw = await anthropic(PASS_2_SYSTEM_PROMPT, `TRANSCRIPT:\n\n${transcript}`, 900);
  return {
    summary: await reviewIntel(summaryRaw, [
      { id: "call-1", kind: "transcript", text: transcript },
    ]),
    structured: filterStructured(extractJson(structuredRaw)),
    analysed_at: new Date().toISOString(),
  };
}

const IGNORED_STATUSES = ["no-answer", "no_answer", "busy", "failed", "canceled", "cancelled"];

/** Rebuild client_leads.call_notes from every analysed call on the lead. */
/**
 * A call that has only just ended is still travelling through Twilio →
 * recording → Whisper. Wait (bounded) for the newest real call on this lead to
 * have a transcript, transcribing it ourselves the moment the recording lands,
 * so the handover intel is never built from voicemail-only history.
 */
export async function ensureRecentCallTranscribed(
  leadId: string,
  maxWaitMs = 120_000,
  work?: HandoverWork,
): Promise<void> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const deadline = Date.now() + maxWaitMs;
  const attempted = new Set<string>();

  while (true) {
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("call_records")
      .select("id, created_at, call_status, direction, transcript, recording_url, duration_seconds")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50)
      .abortSignal(AbortSignal.timeout(10_000));
    if (callsError)
      throw new Error("Call records could not be loaded. Please retry.", { cause: callsError });

    // Process every completed recording that is still missing a transcript.
    // Stale duplicate "ringing" rows must never hide a later completed call.
    // Missed inbound attempts may contain silent voicemail recordings. Leave
    // those to background transcription; existing voicemail transcripts still
    // contribute to the summary without blocking a completed conversation.
    const pendingRecordings = (calls ?? []).filter((call) => {
      const status = String(call.call_status ?? "").toLowerCase();
      return (
        Boolean(call.recording_url) &&
        !(call.direction === "inbound" && status === "missed") &&
        !IGNORED_STATUSES.includes(status) &&
        String(call.transcript ?? "").trim().length <= 40 &&
        !attempted.has(call.id)
      );
    });

    for (const call of pendingRecordings) {
      attempted.add(call.id);
      try {
        // Handover needs the transcript, not the two sales-analysis passes.
        // Persist it first so a summary retry never transcribes the call again.
        const transcript = work
          ? await (
              await import("./handover-transcription.server")
            ).transcribeHandoverRecording(call.id, call.recording_url!, work)
          : await transcribeRecording(call.recording_url!);
        if (!transcript) throw new Error("The call transcription was empty. Please retry.");
        const { error } = await supabaseAdmin
          .from("call_records")
          .update({ transcript })
          .eq("id", call.id)
          .abortSignal(AbortSignal.timeout(10_000));
        if (error) throw new Error(error.message);
      } catch (err) {
        if (err instanceof HandoverContinuation) throw err;
        // A successfully processed silent dial is not a failed conversation.
        // Its empty audio parts are fingerprint-cached, so retries do not send
        // it to the transcription provider again. Preserve the source record
        // without inventing a transcript, and keep checking the other calls.
        if (err instanceof NoSpeechRecordingError) continue;
        console.error("[handover] transcribe-on-demand failed", err);
        throw new Error(
          "The call recording could not be transcribed yet. Please retry; your booking is saved.",
          { cause: err },
        );
      }
    }

    // Once all recordings have been inspected, only wait if a call from the
    // last 30 minutes may still be awaiting its recording callback.
    const hasInFlightCall = (calls ?? []).some((call) => {
      const ageMs = Date.now() - new Date(call.created_at).getTime();
      const status = String(call.call_status ?? "").toLowerCase();
      return (
        ageMs <= 30 * 60_000 &&
        !(call.direction === "inbound" && status === "missed") &&
        !call.recording_url &&
        !IGNORED_STATUSES.includes(status) &&
        String(call.transcript ?? "").trim().length <= 40
      );
    });
    if (!hasInFlightCall) {
      const latest = (calls ?? []).find(
        (call) =>
          !IGNORED_STATUSES.includes(String(call.call_status ?? "").toLowerCase()) &&
          !(call.direction === "inbound" && String(call.call_status).toLowerCase() === "missed"),
      );
      if (
        latest &&
        !latest.recording_url &&
        String(latest.transcript ?? "").trim().length <= 40 &&
        latest.duration_seconds !== 0
      ) {
        throw new Error(
          "The latest call recording has not reached the portal. Please check the recording before retrying; a complete summary cannot be built from intake alone.",
        );
      }
      return;
    }

    if (work) throw new HandoverContinuation("Waiting for the call recording to arrive…", 5_000);
    if (Date.now() >= deadline)
      throw new Error(
        "The latest call recording is still unavailable. Please retry after it arrives; your booking is saved.",
      );
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

export async function condenseNotes(leadId: string, work?: HandoverWork): Promise<string | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("client_leads")
    .select("id, first_name, last_name")
    .eq("id", leadId)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");

  const { data: calls, error: callsError } = await supabaseAdmin
    .from("call_records")
    .select("id, created_at, call_status, transcript")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .abortSignal(AbortSignal.timeout(10_000));

  if (callsError) throw new Error(callsError.message);
  const usable = (calls ?? []).filter(
    (c) =>
      !IGNORED_STATUSES.includes(String(c.call_status ?? "").toLowerCase()) &&
      String(c.transcript ?? "").trim().length > 40,
  );
  if (!usable.length) return null;

  const crmName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "the client";
  const sources: IntelSource[] = usable.map((call, index) => ({
    id: `call-${index + 1}`,
    kind: "transcript",
    text: String(call.transcript),
  }));
  const bullets = await verifiedNotesForSources(
    leadId,
    sources,
    crmName,
    CONDENSE_SYSTEM_PROMPT,
    work,
  );
  if (!bullets)
    throw new Error(
      "No client statements could be verified from the call. Review the transcript before preparing the handover.",
    );

  const { error } = await supabaseAdmin
    .from("client_leads")
    .update({
      call_notes: bullets,
      pipeline_summary: bullets,
      pipeline_summary_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error(error.message);
  return bullets;
}

async function verifiedNotesForSources(
  leadId: string,
  sources: IntelSource[],
  crmName: string,
  system: string,
  work?: HandoverWork,
): Promise<string> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const fingerprint = intelFingerprint(crmName, sources, [system, INTEL_REVIEW_PROMPT]);
  const cacheKey = `verified_handover_intel:${leadId}`;
  const { data: cache, error: cacheReadError } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", cacheKey)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle();
  if (cacheReadError) throw new Error(cacheReadError.message);
  // Never feed earlier AI summaries back in as evidence: that amplifies mistakes.
  // Only reuse verified output when every source byte, name and prompt still matches.
  const hit = cachedIntel(cache?.value, fingerprint);
  let bullets = hit;
  if (bullets === null) {
    const progressKey = `handover_intel_progress:${leadId}`;
    const { data: savedProgress, error: progressReadError } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", progressKey)
      .abortSignal(AbortSignal.timeout(10_000))
      .maybeSingle();
    if (progressReadError) throw new Error(progressReadError.message);
    const progress = cachedIntelProgress(savedProgress?.value, fingerprint);
    // Serialize snapshots: a slower earlier write must not erase a later completed check.
    let saving = Promise.resolve();
    const saveProgress = () => {
      const value = { ...progress, reviews: { ...progress.reviews }, fingerprint, version: 1 };
      saving = saving.then(async () => {
        const { error } = await supabaseAdmin
          .from("app_settings")
          .upsert({ key: progressKey, value }, { onConflict: "key" })
          .abortSignal(AbortSignal.timeout(10_000));
        if (error) throw new Error(error.message);
      });
      return saving;
    };
    bullets = await generateVerifiedIntel(sources, crmName, progress, saveProgress, work, system);
  }
  if (!hit && bullets) {
    const { error: cacheError } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          key: cacheKey,
          value: { fingerprint, notes: bullets },
        },
        { onConflict: "key" },
      )
      .abortSignal(AbortSignal.timeout(10_000));
    if (cacheError) throw new Error(cacheError.message);
  }
  return bullets;
}

/** Shared by handover generation and source-grounding evaluations; has no database side effects. */
export async function generateVerifiedIntel(
  sources: IntelSource[],
  crmName: string,
  progress: IntelProgress = { reviews: {} },
  saveProgress: () => Promise<void> = async () => {},
  work?: HandoverWork,
  system = CONDENSE_SYSTEM_PROMPT,
): Promise<string> {
  if (progress.draft === undefined) {
    work?.before("Writing the client summary…");
    progress.draft = await anthropic(
      system,
      `CRM SPELLING OF CLIENT NAME: ${crmName}\n\nORIGINAL SOURCES:\n${JSON.stringify(sources)}`,
      3200,
    );
    await saveProgress();
  }
  const verified = await reviewIntel(
    progress.draft,
    sources,
    progress,
    saveProgress,
    "draft",
    work,
  );
  if (verified) return verified;
  if (progress.factualDraft === undefined) {
    work?.before("Checking the factual background…");
    progress.factualDraft = await anthropic(
      system +
        "\nThe first draft had no verified bullets. Extract only a minimal set of explicit factual background or asset values from the sources. Do not force a goal or question, infer roles, or fill missing categories.",
      `CRM SPELLING OF CLIENT NAME: ${crmName}\n\nORIGINAL SOURCES:\n${JSON.stringify(sources)}`,
      2400,
    );
    await saveProgress();
  }
  return reviewIntel(progress.factualDraft, sources, progress, saveProgress, "factual", work);
}

export const INTEL_REVIEW_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["bullets"],
  properties: {
    bullets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["bullet_index", "supported", "verified_text", "evidence"],
        properties: {
          bullet_index: { type: "integer" },
          supported: { type: "boolean" },
          verified_text: { type: ["string", "null"] },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["source_id", "segment_ids", "speaker", "speaker_role", "kind", "explicit"],
              properties: {
                source_id: { type: "string" },
                segment_ids: { type: "array", items: { type: "string" } },
                speaker: { type: ["string", "null"] },
                speaker_role: { type: "string", enum: ["client", "rep", "unknown"] },
                kind: {
                  type: "string",
                  enum: [
                    "statement",
                    "question",
                    "explicit_confirmation",
                    "hypothetical",
                    "inference",
                  ],
                },
                explicit: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
};

async function reviewIntel(
  proposed: string,
  sources: IntelSource[],
  progress: IntelProgress = { reviews: {} },
  saveProgress: () => Promise<void> = async () => {},
  stage = "draft",
  work?: HandoverWork,
): Promise<string> {
  const candidate = sanitiseBullets(proposed);
  if (!candidate) return "";
  const lines = candidate.split("\n");
  const batches: string[] = [];
  for (let index = 0; index < lines.length; index += 3) {
    const batch = lines.slice(index, index + 3).join("\n");
    if (progress.splitReviews?.includes(intelReviewKey(`${stage}\n${batch}`))) {
      batches.push(...batch.split("\n"));
    } else batches.push(batch);
  }
  const results: IntelReviewDecision[] = [];
  // Keep each evidence check small enough to finish within the provider deadline.
  // Every batch still sees all original sources and uses the same strict reviewer.
  for (let index = 0; index < batches.length; index += 6) {
    if (
      batches
        .slice(index, index + 6)
        .some((batch) => progress.reviews[intelReviewKey(`${stage}\n${batch}`)] === undefined)
    )
      work?.before("Checking the summary against the call transcript…");
    const reviewed = await Promise.allSettled(
      batches.slice(index, index + 6).map(async (batch) => {
        const key = intelReviewKey(`${stage}\n${batch}`);
        const cachedReview = progress.reviews[key];
        const review =
          cachedReview ??
          (await independentIntelReview(
            INTEL_REVIEW_PROMPT,
            JSON.stringify({
              sources: indexedIntelSources(sources),
              proposed_bullets: batch
                .split("\n")
                .map((text, index) => ({ bullet_index: index + 1, text })),
            }),
            INTEL_REVIEW_SCHEMA,
          ));
        const parsed = extractJson(review);
        const resolved = resolveIndexedReview(parsed, batch, sources);
        const assessment = assessReviewedIntel(resolved, batch, sources);
        const verified = sanitiseBullets(
          assessment
            .map((item) => item.verified)
            .filter(Boolean)
            .join("\n"),
        );
        if (cachedReview === undefined) {
          // Store the evidence, not unchecked prose. Revalidate it against the sources on reuse.
          progress.reviews[key] = review;
          await saveProgress();
        }
        const decisions = Array.isArray(parsed["bullets"]) ? parsed["bullets"] : [];
        console.info("[handover] evidence review counts", {
          proposed: batch.split("\n").length,
          supported: decisions.filter((item: { supported?: boolean }) => item.supported === true)
            .length,
          verified: verified ? verified.split("\n").length : 0,
          referenceChecks: (Array.isArray(resolved["bullets"]) ? resolved["bullets"] : []).map(
            (value: unknown) => {
              const item = value as Record<string, unknown>;
              return {
                index: item["bullet_index"],
                mapped: typeof item["text"] === "string",
                supported: item["supported"],
                evidence: (Array.isArray(item["evidence"]) ? item["evidence"] : []).map(
                  (value: unknown) => {
                    const evidence = value as Record<string, unknown>;
                    return {
                      source: evidence["source_id"],
                      speaker: evidence["speaker"],
                      role: evidence["speaker_role"],
                      kind: evidence["kind"],
                      explicit: evidence["explicit"],
                      resolved:
                        typeof evidence["quote"] === "string" && Boolean(evidence["quote"].trim()),
                    };
                  },
                ),
              };
            },
          ),
        });
        return assessment;
      }),
    );
    // A consistently slow multi-bullet check needs less work, not endless retries
    // of the identical request. Persist the split before yielding to the next step.
    let split = false;
    reviewed.forEach((result, offset) => {
      const batch = batches[index + offset]!;
      if (
        work &&
        result.status === "rejected" &&
        retryableIntelError(result.reason) &&
        batch.includes("\n")
      ) {
        progress.splitReviews = [
          ...new Set([...(progress.splitReviews ?? []), intelReviewKey(`${stage}\n${batch}`)]),
        ];
        split = true;
      }
    });
    if (split) {
      await saveProgress();
      throw new HandoverContinuation("Checking smaller sections of the summary…");
    }
    const failed = reviewed.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
    for (const result of reviewed) {
      if (result.status === "fulfilled") results.push(...result.value);
    }
  }
  // Recheck only broken/missing decisions, preserving completed checks and the
  // original order. Explicitly unsupported claims remain excluded. A second
  // validation failure blocks completion instead of caching a partial brief.
  const pending = results.filter((item) => item.needsRetry);
  for (let repairAttempt = 0; repairAttempt < 2; repairAttempt++) {
    for (let index = 0; index < pending.length; index += 6) {
      const wave = pending.slice(index, index + 6).filter((item) => item.needsRetry);
      const repairKey = (text: string) =>
        intelReviewKey(`${stage}\nvalidation-retry-v2-${repairAttempt}\n${text}`);
      if (wave.some((item) => progress.reviews[repairKey(item.text)] === undefined))
        work?.before("Rechecking missing client details against the call transcript…");
      const repaired = await Promise.allSettled(
        wave.map(async (item) => {
          const key = repairKey(item.text);
          const cachedReview = progress.reviews[key];
          const review =
            cachedReview ??
            (await independentIntelReview(
              INTEL_REVIEW_PROMPT,
              JSON.stringify({
                sources: indexedIntelSources(sources),
                proposed_bullets: [{ bullet_index: 1, text: item.text }],
                validation_errors: item.feedback ?? [],
                review_feedback:
                  "The previous decision was missing or failed application validation. Recheck this bullet against the original sources. Return exactly one decision. For supported=true, verified_text must keep the same category and contain only facts and numbers already in this proposed bullet; do not import dates, ages, amounts or other facts from another bullet or source. Use null if unchanged. Cite valid segment_ids and copy each segment's exact speaker ID; put different speakers in separate evidence entries. Include substantive client evidence (rep evidence alone is allowed only for Pricing). Goal and Question for the lawyer require explicit client evidence. If a claim is unsupported, remove that clause; if no substantive claim is supported, return supported=false. Do not invent evidence or approve unsupported text to make validation pass.",
              }),
              INTEL_REVIEW_SCHEMA,
            ));
          const resolved = resolveIndexedReview(extractJson(review), item.text, sources);
          const decision = assessReviewedIntel(resolved, item.text, sources)[0];
          // Empty responses are not a decision on a targeted retry.
          if (
            !Array.isArray(resolved["bullets"]) ||
            resolved["bullets"].length !== 1 ||
            !decision ||
            decision.needsRetry
          ) {
            item.feedback = decision?.feedback ?? [
              "Return exactly one decision for the proposed bullet.",
            ];
            if (repairAttempt === 0) {
              // Persist the failed evidence so the next bounded request can explain
              // the exact citation failure without re-running completed work.
              progress.reviews[key] = review;
              await saveProgress();
              return;
            }
            if (cachedReview !== undefined) {
              delete progress.reviews[key];
              await saveProgress();
            }
            throw new Error(
              "Some client details could not be verified, so the automatic handover is incomplete. Retry the summary or review the transcript and prepare the notes manually.",
            );
          }
          if (cachedReview === undefined) {
            progress.reviews[key] = review;
            await saveProgress();
          }
          item.verified = decision.verified;
          item.needsRetry = false;
        }),
      );
      const failed = repaired.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }
  }
  return sanitiseBullets(
    results
      .map((item) => item.verified)
      .filter(Boolean)
      .join("\n"),
  );
}

export const EXPAND_NOTES_SYSTEM_PROMPT = `${ATTRIBUTION_RULES}
Prepare a consultation brief from the human representative's raw discovery notes and CRM intake fields. Clean up shorthand and spelling without inventing details or treating old intake estimates as confirmed call facts. ${HANDOVER_BRIEF_RULES}`;

/**
 * Turn a rep's raw shorthand call notes + CRM intake fields into full client-intel
 * bullets. Used when there is no call recording/transcript to condense.
 */
export async function expandRepNotes(leadId: string, work?: HandoverWork): Promise<string | null> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("client_leads")
    .select(
      "id, first_name, last_name, city, relationship_stage, has_kids_under_18, asset_band, settlement_timeline, funding_preference, ex_partner_full_name, rep_notes",
    )
    .eq("id", leadId)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) return null;

  // The legacy call_notes field contains both generated and handover text.
  // Only the separate rep notepad is a human-written source.
  const raw = String(lead.rep_notes ?? "").trim();
  if (raw.length < 20) return null;

  const crmName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "the client";
  const intake = [
    `City: ${lead.city ?? "unknown"}`,
    `Relationship stage: ${lead.relationship_stage ?? "unknown"}`,
    `Kids under 18: ${lead.has_kids_under_18 == null ? "unknown" : lead.has_kids_under_18 ? "yes" : "no"}`,
    `Asset band: ${lead.asset_band ?? "unknown"}`,
    `Settlement timeline: ${lead.settlement_timeline ?? "unknown"}`,
    `Funding preference: ${lead.funding_preference ?? "unknown"}`,
    `Ex-partner: ${lead.ex_partner_full_name ?? "unknown"}`,
  ].join("\n");

  const bullets = await verifiedNotesForSources(
    leadId,
    [
      { id: "rep-notes", kind: "rep_notes", text: raw },
      { id: "crm-intake", kind: "intake", text: intake },
    ],
    crmName,
    EXPAND_NOTES_SYSTEM_PROMPT,
    work,
  );
  if (!bullets) return null;

  const { error: saveError } = await supabaseAdmin
    .from("client_leads")
    .update({
      pipeline_summary: bullets,
      pipeline_summary_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .abortSignal(AbortSignal.timeout(10_000));
  if (saveError) throw new Error(saveError.message);

  return bullets;
}

/** Full pipeline for one call record. `transcript` skips the Whisper step (tests). */
export async function analyseCallRecord(
  callRecordId: string,
  overrideTranscript?: string,
): Promise<{ transcript: string; analysis: CallAnalysis; notes: string | null }> {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  const { data: record, error } = await supabaseAdmin
    .from("call_records")
    .select("id, lead_id, recording_url, transcript, call_status")
    .eq("id", callRecordId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!record) throw new Error("Call record not found");

  let transcript = overrideTranscript ?? record.transcript ?? "";
  if (!transcript.trim()) {
    if (!record.recording_url) throw new Error("This call has no recording to transcribe");
    transcript = await transcribeRecording(record.recording_url);
  }
  if (!transcript.trim()) throw new Error("Transcription came back empty");

  // Persist the expensive transcript before AI analysis. If an analysis call
  // times out or fails, handover can still include the complete conversation
  // on its next attempt instead of transcribing the recording again.
  if (!String(record.transcript ?? "").trim()) {
    const { error: transcriptSaveError } = await supabaseAdmin
      .from("call_records")
      .update({ transcript })
      .eq("id", callRecordId);
    if (transcriptSaveError) throw new Error(transcriptSaveError.message);
  }

  // Prepare the handover as soon as the transcript is saved. Sales scoring is
  // independent: a slow or failed scoring pass must not prevent a ready brief.
  const [analysisResult, notesResult] = await Promise.allSettled([
    analyseTranscript(transcript).then(async (analysis) => {
      const { error: saveError } = await supabaseAdmin
        .from("call_records")
        .update({
          transcript,
          call_analysis: analysis as never,
          pending_review: true,
          needs_review: true,
        })
        .eq("id", callRecordId);
      if (saveError) throw new Error(saveError.message);
      return analysis;
    }),
    record.lead_id ? condenseNotes(record.lead_id) : Promise.resolve(null),
  ]);
  if (analysisResult.status === "rejected") throw analysisResult.reason;
  const analysis = analysisResult.value;

  if (notesResult.status === "rejected") throw notesResult.reason;
  return { transcript, analysis, notes: notesResult.value };
}
