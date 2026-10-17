import { recoverEarlyNorwoodEvidence } from "@/lib/norwood-evidence-recovery";
import { analysisNeedsReview, analysisFailure } from "@/lib/norwood-analysis-state";
import { NorwoodAbstentionError } from "@/lib/norwood-evidence";
import { NorwoodServiceError } from "./norwood-json.server";
import { requestNorwoodBurstCheck } from "./norwood-burst-check.server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bookingActor } from "./booking-access.server";
import { PATIENT_SMS_FROM } from "../../supabase/functions/_shared/patient-sms";
import {
  NORWOOD_MAX_PHOTO_BYTES, NORWOOD_PROMPT_VERSION,
  NORWOOD_VIEWS, hasAllNorwoodViews, parseNorwoodResult,
  type NorwoodView, type NorwoodResult, type NorwoodAssessmentStatus,
  type PatientNorwoodSession, type RepNorwoodSession,
} from "@/lib/norwood-assessment";

import { assertNorwoodSandboxLead } from "@/lib/norwood-sandbox-access";
import { configuredNorwoodModel, requestNorwoodEstimate } from "./norwood-inference.server";
import { requestNorwoodPhotoCheck } from "./norwood-photo-check.server";
import { requestNorwoodScanSelection } from "./norwood-video-scan.server";
import { pendingScanViews, type NorwoodScan } from "@/lib/norwood-video-scan";
import { norwoodSms } from "@/lib/norwood-photo-check";
export { requestNorwoodEstimate } from "./norwood-inference.server";

// New tables are migration-owned; do not hand-edit the generated Supabase types.
const db = () => supabaseAdmin as any;
const BUCKET = "norwood-preview-photos";
export function patientPreviewUrl(token: string) {
  const configured = process.env.NORWOOD_PREVIEW_GUEST_URL;
  if (!configured) throw new Error("Phone testing needs a shared guest preview link enabled first.");
  const url = new URL(configured);
  if (url.origin !== "https://lovable.dev" || !/^\/preview\/[A-Za-z0-9_-]+$/.test(url.pathname) || url.username || url.password || url.search || url.hash) throw new Error("Use the approved shared preview link for this test project.");
  const expires = Date.parse(process.env.NORWOOD_PREVIEW_GUEST_EXPIRES_AT ?? "");
  if (!Number.isFinite(expires) || expires <= Date.now() + 2 * 60 * 60 * 1000) throw new Error("The temporary phone test access has expired or is ending soon. Renew the guest preview link first.");
  // Lovable's official short URL establishes guest access. HTTP redirects carry
  // the fragment to our preview, whose small entry handler opens the photo page.
  url.hash = `norwood-test=${token}`;
  return url.toString();
}
export type AssessmentRow = {
  id: string; ai_observations?: unknown; prompt_version?: string | null; created_by?: string; lead_id: string; clinic_id: string; clinic_name: string; token_hash: string;
  status: NorwoodAssessmentStatus; expires_at: string; revoked_at: string | null;
  opened_at: string | null; consented_at: string | null; framing_consented_at?: string | null;
  photos: Partial<Record<NorwoodView, { path: string; sha256: string }>>;
  analysis_run: string | null; analysis_started_at: string | null; analysis_attempts: number;
  ai_norwood: number | null; ai_confidence: NorwoodResult["confidence"] | null;
  ai_reason: string | null; photo_problems: string[]; final_norwood: number | null; reviewed_at: string | null;
};
export const hashNorwoodToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function retryAvailable(row: AssessmentRow, now = Date.now()) {
  if (recoverEarlyNorwoodEvidence(row, now)) return true;
  return (!analysisNeedsReview(row.status, row.photo_problems) || row.prompt_version !== NORWOOD_PROMPT_VERSION) && row.analysis_attempts < 3 && (row.status === "failed" ||
    (row.status === "analysing" && now - Date.parse(row.analysis_started_at ?? "") >= 90_000));
}
export function patientSession(row: AssessmentRow): PatientNorwoodSession {
  // Explicit allowlist: no lead/clinic ID, name, phone, photo paths, signed URLs or raw model text.
  return {
    clinicName: row.clinic_name, expiresAt: row.expires_at, status: row.status,
    views: NORWOOD_VIEWS.filter(v => Boolean(row.photos[v])), consented: Boolean(row.consented_at && row.framing_consented_at),
    estimate: row.status === "ready" ? row.ai_norwood : null,
    needsReview: analysisNeedsReview(row.status, row.photo_problems) || (row.status === "ready" && (row.ai_confidence === "low" || row.photo_problems.length > 0)), canRetry: retryAvailable(row),
  };
}
export function repSession(row: AssessmentRow): RepNorwoodSession {
  return {
    id: row.id, clinicId: row.clinic_id, clinicName: row.clinic_name, status: row.status,
    expiresAt: row.expires_at, expired: Date.parse(row.expires_at) <= Date.now(), revoked: Boolean(row.revoked_at),
    openedAt: row.opened_at, photoCount: Object.keys(row.photos).length,
    views: NORWOOD_VIEWS.filter(view => Boolean(row.photos[view])),
    result: row.status === "ready" ? parseNorwoodResult(JSON.stringify({ norwood: row.ai_norwood, confidence: row.ai_confidence, reason: row.ai_reason, photo_problems: row.photo_problems })) : null,
    analysisFailure: analysisFailure(row.status, row.photo_problems),
    finalNorwood: row.final_norwood, reviewedAt: row.reviewed_at, canRetry: retryAvailable(row),
  };
}
export async function assertNorwoodStaff(userDb: any, leadId: string) {
  assertNorwoodSandboxLead(leadId);
  const actor = await bookingActor(userDb);
  const { data, error } = await userDb.from("meta_leads").select("id").eq("id", leadId).maybeSingle();
  if (error || !data) throw new Error("Lead access required");
  return actor;
}
export async function latestNorwood(userDb: any, leadId: string): Promise<AssessmentRow | null> {
  await assertNorwoodStaff(userDb, leadId);
  const { data, error } = await db().from("norwood_preview_assessments").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Photo assessments are unavailable. Check the database migration.");
  return data;
}
export async function patientAction(hash: string, action: string, view?: NorwoodView, photo?: object): Promise<AssessmentRow> {
  const { data, error } = await db().rpc("norwood_preview_patient_action", { p_hash: hash, p_action: action, p_view: view ?? null, p_photo: photo ?? null });
  if (error) {
    const safe = ["This link has expired", "Photos cannot be changed", "Please ask your advisor", "Please take a different photo", "All five photos are required"];
    throw new Error(safe.some(s => error.message.startsWith(s)) ? error.message : "We could not save that. Please try again or speak to your advisor.");
  }
  return data;
}

export async function sendNorwoodLink(userDb: any, leadId: string, clinicId: string): Promise<RepNorwoodSession> {
  const actor = await assertNorwoodStaff(userDb, leadId);
  const sid = process.env.TWILIO_ACCOUNT_SID, secret = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !secret || !process.env.ANTHROPIC_API_KEY) throw new Error("Photo assessment messaging or AI is not configured.");
  const { data: lead, error: leadError } = await db().from("meta_leads").select("phone, first_name").eq("id", leadId).single();
  if (leadError || !lead?.phone) throw new Error("This lead needs a mobile number first.");
  const raw = lead.phone.replace(/[\s()\-]/g, "");
  const phone = raw.startsWith("+") ? raw : raw.startsWith("0") ? `+61${raw.slice(1)}` : raw.startsWith("61") ? `+${raw}` : `+61${raw}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Check this lead's mobile number first.");
  const token = randomBytes(32).toString("base64url");
  // Resolve guest access before creating a session or sending any text.
  const link = patientPreviewUrl(token);
  const { data: row, error } = await db().rpc("create_norwood_preview", { p_lead: leadId, p_clinic: clinicId, p_rep: actor.id, p_hash: hashNorwoodToken(token) });
  if (error) throw new Error(error.message.includes("wait a minute") ? "Please wait a minute before sending another link." : "Could not create a link. Check the selected clinic and database migration.");
  // Fragment is never sent to the page server or as an HTTP Referer.
  const body = norwoodSms(lead.first_name, link);
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, From: PATIENT_SMS_FROM, Body: body }),
    });
    const sent = await response.json();
    if (!response.ok || !sent.sid) throw new Error("The text could not be sent. Check the number and try again.");
    const { data: updated, error: saveError } = await db().from("norwood_preview_assessments").update({ status: "sent", sms_sid: sent.sid }).eq("id", row.id).select("*").single();
    if (saveError) throw new Error("The text was sent but the link could not be activated. Please send a new link.");
    // Keep the SMS in the inbox without storing the reusable bearer secret in general message history.
    const { data: thread } = await db().from("sms_threads").upsert({ phone }, { onConflict: "phone" }).select("id").single();
    if (thread) await db().from("sms_messages").insert({ thread_id: thread.id, lead_id: leadId, direction: "outbound", body: body.replace(link, "[private photo link — expires in 2 hours]"), to_number: phone, from_number: PATIENT_SMS_FROM, twilio_message_sid: sent.sid, status: sent.status || "queued" });
    return repSession(updated);
  } catch (error) {
    await db().from("norwood_preview_assessments").update({ status: "send_failed", revoked_at: new Date().toISOString() }).eq("id", row.id).eq("status", "sending");
    throw new Error(error instanceof Error && error.message.startsWith("The text") ? error.message : "The text could not be confirmed. Please wait a minute before trying again.");
  }
}

export function decodeNorwoodPhoto(base64: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > Math.ceil(NORWOOD_MAX_PHOTO_BYTES / 3) * 4) throw new Error("Photo is too large or invalid. Please retake it.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length < 512 || bytes.length > NORWOOD_MAX_PHOTO_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) throw new Error("Please use a JPEG photo from your camera.");
  return bytes;
}
export async function consentNorwoodCamera(token: string) {
  const { data, error } = await db().rpc("consent_norwood_preview_camera", { p_hash: hashNorwoodToken(token) });
  if (error) throw new Error("We couldn’t save your agreement. Refresh the link and try again.");
  return patientSession(data);
}

export async function checkNorwoodFrame(token: string, view: NorwoodView, photo: string) {
  const bytes = decodeNorwoodPhoto(photo);
  if (bytes.length > 300_000) throw new Error("Camera frame is too large.");
  const { data, error } = await db().rpc("reserve_norwood_preview_frame", { p_hash: hashNorwoodToken(token), p_view: view });
  if (error) throw new Error(error.message.startsWith("This link has expired") || error.message.startsWith("Please ask your advisor") ? error.message : "The camera check could not start. Please try again.");
  if (!data) return { ready: false, message: "Hold your position…" };
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("The photo check is unavailable. Please try again later.");
  return requestNorwoodPhotoCheck(view, photo, process.env.ANTHROPIC_API_KEY, fetch, configuredNorwoodModel());
}

export async function uploadNorwoodPhoto(token: string, view: NorwoodView, base64: string) {
  const bytes = decodeNorwoodPhoto(base64);
  const hash = hashNorwoodToken(token);
  const row = await patientAction(hash, "reserve_upload");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("The photo check is unavailable. Please try again later.");
  const check = await requestNorwoodPhotoCheck(view, base64, process.env.ANTHROPIC_API_KEY, fetch, configuredNorwoodModel());
  if (!check.ready) throw new Error(check.message);
  return storeCheckedNorwoodPhoto(hash, row, view, bytes);
}

async function storeCheckedNorwoodPhoto(hash: string, row: AssessmentRow, view: NorwoodView, bytes: Buffer) {
  const path = `${row.id}/${view}-${randomUUID()}.jpg`;
  const { error } = await db().storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false, cacheControl: "0" });
  if (error) throw new Error("Your photo could not be uploaded. Please try again.");
  try {
    const updated = await patientAction(hash, "photo", view, { path, sha256: createHash("sha256").update(bytes).digest("hex") });
    if (row.photos[view]) await db().storage.from(BUCKET).remove([row.photos[view]!.path]);
    return patientSession(updated);
  } catch (error) {
    await db().storage.from(BUCKET).remove([path]);
    throw error;
  }
}

/** Revalidate only the recorded early-stage mismatch after the rule repair.
 * No image download, model retry, lead status change or rep confirmation occurs.
 */
export async function recoverRecordedNorwood(row: AssessmentRow): Promise<boolean> {
  const result = recoverEarlyNorwoodEvidence(row);
  if (!result) return false;
  const { data, error } = await db().from("norwood_preview_assessments").update({
    status:"ready", ai_norwood:result.norwood, ai_confidence:"low", ai_reason:result.reason,
    photo_problems:result.photo_problems, ai_observations:result.observations,
    prompt_version:NORWOOD_PROMPT_VERSION, result_at:new Date().toISOString(),
  }).eq("id",row.id).eq("status","failed").eq("analysis_run",row.analysis_run)
    .is("revoked_at",null).gt("expires_at",new Date().toISOString()).select("id").maybeSingle();
  if(error || !data)throw new Error("The assessment changed. Refresh before checking again.");
  return true;
}

export async function analyseNorwood(hash: string): Promise<PatientNorwoodSession> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("The estimate is temporarily unavailable. Your advisor can help.");
  const run = randomUUID();
  const row = await patientAction(hash, "analyse", undefined, { run });
  if (row.status === "ready" || row.analysis_run !== run) return patientSession(row);
  try {
    if (!hasAllNorwoodViews(Object.keys(row.photos))) throw new Error("Missing photos");
    const images: { view: NorwoodView; base64: string }[] = [];
    for (const view of NORWOOD_VIEWS) {
      const { data, error } = await db().storage.from(BUCKET).download(row.photos[view]!.path);
      if (error || !data || data.size > NORWOOD_MAX_PHOTO_BYTES) throw new Error("Photo unavailable");
      images.push({ view, base64: Buffer.from(await data.arrayBuffer()).toString("base64") });
    }
    const model = configuredNorwoodModel();
    const result = await requestNorwoodEstimate(images, apiKey, fetch, model);
    const { data: saved, error } = await db().from("norwood_preview_assessments").update({
      status: "ready", ai_norwood: result.norwood, ai_confidence: result.confidence, ai_reason: result.reason,
      photo_problems: result.photo_problems, ai_observations: result.observations, model, prompt_version: NORWOOD_PROMPT_VERSION, result_at: new Date().toISOString(),
    }).eq("id", row.id).eq("analysis_run", run).is("revoked_at", null).select("*").maybeSingle();
    if (error || !saved) throw new Error("Estimate could not be saved");
    return patientSession(saved);
  } catch (error) {
    const code = error instanceof NorwoodAbstentionError || error instanceof NorwoodServiceError ? error.code : "HP-ANALYSIS";
    console.warn("Norwood estimate outcome", { code, version: "structured-estimate-v2" });
    const { data: failed, error: saveError } = await db().from("norwood_preview_assessments").update({ status: "failed", photo_problems: [code], prompt_version: NORWOOD_PROMPT_VERSION, ai_observations: error instanceof NorwoodAbstentionError && error.evidence ? { proposed_norwood: error.evidence.norwood, observations: error.evidence.observations } : null }).eq("id", row.id).eq("analysis_run", run).is("revoked_at", null).select("*").maybeSingle();
    if (saveError || !failed) throw new Error("Your photos are saved. Your advisor can check the estimate status.");
    return patientSession(failed);
  }
}

export async function norwoodPhotoLinks(userDb: any, leadId: string, assessmentId: string) {
  await assertNorwoodStaff(userDb, leadId);
  const { data: row, error } = await db().from("norwood_preview_assessments").select("photos").eq("id", assessmentId).eq("lead_id", leadId).single();
  if (error || !row) throw new Error("Assessment not found");
  const links = await Promise.all(NORWOOD_VIEWS.filter(v => row.photos[v]).map(async view => {
    const { data, error } = await db().storage.from(BUCKET).createSignedUrl(row.photos[view].path, 60);
    if (error || !data?.signedUrl) throw new Error("Photo preview unavailable");
    return { view, url: data.signedUrl };
  }));
  return links;
}

export async function selectNorwoodFrames(token: string, scan: NorwoodScan, frames: string[]) {
  for (const frame of frames) if (decodeNorwoodPhoto(frame).length > 150_000) throw new Error("This scan is too large. Please try again.");
  const hash = hashNorwoodToken(token);
  const row = await patientAction(hash, "open");
  const requested = pendingScanViews(scan, NORWOOD_VIEWS.filter(view => Boolean(row.photos[view])));
  if (!requested.length) return [];
  const { data, error } = await db().rpc("reserve_norwood_preview_frame", { p_hash: hash, p_view: requested[0] });
  if (error || !data) throw new Error(error?.message.startsWith("Please ask your advisor") ? error.message : "The scan could not be checked. Wait a moment and try again.");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("The photo check is unavailable. Please try again later.");
  return requestNorwoodScanSelection(frames, requested, process.env.ANTHROPIC_API_KEY, fetch, configuredNorwoodModel());
}

// Check and save the SAME full-resolution still. A later camera frame must never
// replace the one that passed. This avoids a second, contradictory AI gate.
export async function captureNorwoodFrame(token: string, view: NorwoodView, photo: string, alternatives: string[] = []) {
  if (alternatives.length > 7) throw new Error("Too many photos");
  const photos = [photo, ...alternatives], bytes = photos.map(decodeNorwoodPhoto), hash = hashNorwoodToken(token);
  const existing = await patientAction(hash, "open");
  if (existing.photos[view]) return { check: { ready: true, message: "Photo saved" }, session: patientSession(existing) };
  const { data, error } = await db().rpc("reserve_norwood_preview_frame", { p_hash: hash, p_view: view });
  if (error) throw new Error(error.message.startsWith("This link has expired") || error.message.startsWith("Please ask your advisor") ? error.message : "The camera check could not start. Tap Retry.");
  if (!data) throw new Error("Please wait a moment, then tap Retry.");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("The photo check is unavailable. Please ask your advisor.");
  const checked = await requestNorwoodBurstCheck(view, photos, process.env.ANTHROPIC_API_KEY, fetch, configuredNorwoodModel());
  // Enum-only diagnostics. No photo, token, lead, storage path or model prose.
  console.info("Norwood capture check", { view, frames: photos.length, accepted: checked.ready, problem: checked.problem });
  const reviewIndex = checked.selectedIndex ?? checked.reviewIndex;
  const check = { ready: checked.ready, message: checked.message, ...(reviewIndex != null ? { reviewIndex } : {}) };
  if (!checked.ready || checked.selectedIndex === null) return { check, session: null };
  const row = await patientAction(hash, "reserve_upload");
  // reserve_upload rechecks expiry, consent and session state after inference.
  return { check, session: await storeCheckedNorwoodPhoto(hash, row, view, bytes[checked.selectedIndex]) };
}
