import { checkLiveSetup } from './norwood-live.server';
import { checkNorwoodPhotoService } from "./norwood-photo-service.server";
import { configuredNorwoodModel } from "./norwood-inference.server";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NORWOOD_VIEWS, NORWOOD_MAX_PHOTO_BYTES } from "@/lib/norwood-assessment";
import { recoverRecordedNorwood, captureNorwoodFrame, selectNorwoodFrames, analyseNorwood, consentNorwoodCamera, checkNorwoodFrame, assertNorwoodStaff, hashNorwoodToken, latestNorwood, norwoodPhotoLinks, patientAction, patientPreviewUrl, patientSession, repSession, sendNorwoodLink, uploadNorwoodPhoto } from "./norwood-sandbox.server";

import { assertNorwoodPreviewRequest } from "@/lib/norwood-preview-access";
import { assertNorwoodSandboxLead } from "@/lib/norwood-sandbox-access";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const tokenInput = z.object({ token: tokenSchema });
const leadInput = z.object({ leadId: z.string().uuid() });
async function safely<T>(work: () => Promise<T>) {
  setResponseHeader("Cache-Control", "no-store, private");
  setResponseHeader("Referrer-Policy", "no-referrer");
  try {
    const request = getRequest();
    assertNorwoodPreviewRequest(request.url, request.headers.get("origin"));
    return { ok: true as const, data: await work() };
  }
  catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Please try again." }; }
}

export const sendAiNorwoodLink = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput.extend({ clinicId: z.string().uuid() }))
  .handler(({ data, context }) => safely(() => sendNorwoodLink(context.supabase, data.leadId, data.clinicId)));
export const getNorwoodSandboxReadiness = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput).handler(({ data, context }) => safely(async () => {
    await assertNorwoodStaff(context.supabase, data.leadId);
    patientPreviewUrl("readiness-check");
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.ANTHROPIC_API_KEY) throw new Error("The phone test needs its server-side SMS and AI connections.");
    await checkLiveSetup();
    await checkNorwoodPhotoService(process.env.ANTHROPIC_API_KEY, configuredNorwoodModel());
    return true;
  }));
export const getRepNorwoodAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput).handler(({ data, context }) => safely(async () => {
    const row = await latestNorwood(context.supabase, data.leadId);
    return row ? repSession(row) : null;
  }));
export const getNorwoodPhotoLinks = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput.extend({ assessmentId: z.string().uuid() }))
  .handler(({ data, context }) => safely(() => norwoodPhotoLinks(context.supabase, data.leadId, data.assessmentId)));
export const retryRepNorwoodAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput).handler(({ data, context }) => safely(async () => {
    const row = await latestNorwood(context.supabase, data.leadId);
    if (!row) throw new Error("Assessment not found");
    if (!await recoverRecordedNorwood(row)) await analyseNorwood(row.token_hash);
    return true;
  }));
export const openPatientNorwood = createServerFn({ method: "POST" }).inputValidator(tokenInput)
  .handler(({ data }) => safely(async () => patientSession(await patientAction(hashNorwoodToken(data.token), "open"))));
export const consentPatientNorwood = createServerFn({ method: "POST" }).inputValidator(tokenInput)
  .handler(({ data }) => safely(() => consentNorwoodCamera(data.token)));
export const uploadPatientNorwood = createServerFn({ method: "POST" }).inputValidator(tokenInput.extend({
  view: z.enum(NORWOOD_VIEWS), photo: z.string().min(1).max(Math.ceil(NORWOOD_MAX_PHOTO_BYTES / 3) * 4),
})).handler(({ data }) => safely(() => uploadNorwoodPhoto(data.token, data.view, data.photo)));
export const analysePatientNorwood = createServerFn({ method: "POST" }).inputValidator(tokenInput)
  .handler(({ data }) => safely(() => analyseNorwood(hashNorwoodToken(data.token))));

export const confirmSandboxNorwood = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(leadInput.extend({ assessmentId: z.string().uuid(), norwood: z.number().int().min(1).max(7) }))
  .handler(({ data, context }) => safely(async () => {
    assertNorwoodSandboxLead(data.leadId);
    const { error } = await (context.supabase as any).rpc("confirm_norwood_preview", { p_assessment: data.assessmentId, p_lead: data.leadId, p_norwood: data.norwood });
    if (error) throw new Error("The review could not be saved. Refresh the assessment and try again.");
    return true;
  }));

export const checkPatientNorwoodFrame = createServerFn({ method: "POST" }).inputValidator(tokenInput.extend({
  view: z.enum(NORWOOD_VIEWS), photo: z.string().min(1).max(400_000),
})).handler(({ data }) => safely(() => checkNorwoodFrame(data.token, data.view, data.photo)));

export const selectPatientNorwoodFrames = createServerFn({ method: "POST" }).inputValidator(tokenInput.extend({
  scan: z.enum(["upper", "sides"]), frames: z.array(z.string().min(1).max(200_000)).min(1).max(12),
})).handler(({ data }) => safely(() => selectNorwoodFrames(data.token, data.scan, data.frames)));

export const capturePatientNorwoodFrame = createServerFn({ method: "POST" }).inputValidator(tokenInput.extend({
  view: z.enum(NORWOOD_VIEWS), photo: z.string().min(1).max(Math.ceil(NORWOOD_MAX_PHOTO_BYTES / 3) * 4),
  alternatives: z.array(z.string().min(1).max(Math.ceil(NORWOOD_MAX_PHOTO_BYTES / 3) * 4)).max(7).optional(),
}).strict()).handler(({ data }) => safely(() => captureNorwoodFrame(data.token, data.view, data.photo, data.alternatives)));
