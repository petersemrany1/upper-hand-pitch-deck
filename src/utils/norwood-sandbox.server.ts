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

import { assertNorwoodSandboxLead, NORWOOD_PATIENT_PREVIEW_ORIGIN } from "@/lib/norwood-sandbox-access";
import { configuredNorwoodModel, requestNorwoodEstimate } from "./norwood-inference.server";
export { requestNorwoodEstimate } from "./norwood-inference.server";

// New tables are migration-owned; do not hand-edit the generated Supabase types.
const db = () => supabaseAdmin as any;
const BUCKET = "norwood-preview-photos";
export type AssessmentRow = {
  id: string; lead_id: string; clinic_id: string; clinic_name: string; token_hash: string;
  status: NorwoodAssessmentStatus; expires_at: string; revoked_at: string | null;
  opened_at: string | null; consented_at: string | null;
  photos: Partial<Record<NorwoodView, { path: string; sha256: string }>>;
  analysis_run: string | null; analysis_started_at: string | null; analysis_attempts: number;
  ai_norwood: number | null; ai_confidence: NorwoodResult["confidence"] | null;
  ai_reason: string | null; photo_problems: string[]; final_norwood: number | null; reviewed_at: string | null;
};
export const hashNorwoodToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function retryAvailable(row: AssessmentRow, now = Date.now()) {
  return row.analysis_attempts < 3 && (row.status === "failed" ||
    (row.status === "analysing" && now - Date.parse(row.analysis_started_at ?? "") >= 90_000));
}
export function patientSession(row: AssessmentRow): PatientNorwoodSession {
  // Explicit allowlist: no lead/clinic ID, name, phone, photo paths, signed URLs or raw model text.
  return {
    clinicName: row.clinic_name, expiresAt: row.expires_at, status: row.status,
    views: NORWOOD_VIEWS.filter(v => Boolean(row.photos[v])), consented: Boolean(row.consented_at),
    estimate: row.status === "ready" ? row.ai_norwood : null,
    needsReview: row.status === "ready" && (row.ai_confidence === "low" || row.photo_problems.length > 0), canRetry: retryAvailable(row),
  };
}
export function repSession(row: AssessmentRow): RepNorwoodSession {
  return {
    id: row.id, clinicId: row.clinic_id, clinicName: row.clinic_name, status: row.status,
    expiresAt: row.expires_at, expired: Date.parse(row.expires_at) <= Date.now(), revoked: Boolean(row.revoked_at),
    openedAt: row.opened_at, photoCount: Object.keys(row.photos).length,
    result: row.status === "ready" ? parseNorwoodResult(JSON.stringify({ norwood: row.ai_norwood, confidence: row.ai_confidence, reason: row.ai_reason, photo_problems: row.photo_problems })) : null,
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
  const { data: lead, error: leadError } = await db().from("meta_leads").select("phone").eq("id", leadId).single();
  if (leadError || !lead?.phone) throw new Error("This lead needs a mobile number first.");
  const raw = lead.phone.replace(/[\s()\-]/g, "");
  const phone = raw.startsWith("+") ? raw : raw.startsWith("0") ? `+61${raw.slice(1)}` : raw.startsWith("61") ? `+${raw}` : `+61${raw}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Check this lead's mobile number first.");
  const origin = new URL(NORWOOD_PATIENT_PREVIEW_ORIGIN);
  if (origin.protocol !== "https:" || origin.username || origin.password) throw new Error("A secure patient page address is required.");
  const token = randomBytes(32).toString("base64url");
  const { data: row, error } = await db().rpc("create_norwood_preview", { p_lead: leadId, p_clinic: clinicId, p_rep: actor.id, p_hash: hashNorwoodToken(token) });
  if (error) throw new Error(error.message.includes("wait a minute") ? "Please wait a minute before sending another link." : "Could not create a link. Check the selected clinic and database migration.");
  // Fragment is never sent to the page server or as an HTTP Referer.
  const link = `${origin.origin}/norwood-photo-test#${token}`;
  const body = `[TEST] ${row.clinic_name}: while we chat, take 5 guided hair photos for a Norwood estimate: ${link} This private link expires in 2 hours. Your doctor will confirm at your consult.`;
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
export async function uploadNorwoodPhoto(token: string, view: NorwoodView, base64: string) {
  const bytes = decodeNorwoodPhoto(base64);
  const hash = hashNorwoodToken(token);
  const row = await patientAction(hash, "reserve_upload");
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
  } catch {
    await db().from("norwood_preview_assessments").update({ status: "failed" }).eq("id", row.id).eq("analysis_run", run).is("revoked_at", null);
    throw new Error("We couldn't finish the estimate. Please try again or ask your advisor to review the photos.");
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
