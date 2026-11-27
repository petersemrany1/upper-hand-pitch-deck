// Ported from the Legal app (family-law-floater/src/lib/training/training.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTrainingAccess } from "@/legal/lib/portal-access-middleware";

import { MODULE_SLUGS } from "./registry";

/** Mark a module complete. The server re-checks order and the module's own evidence. */
export const completeTrainingModuleFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { slug: string }) =>
    z.object({ slug: z.enum(MODULE_SLUGS) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { completeModule } = await import("./training.server");
    return completeModule(context.userId, data.slug);
  });

const stateUpdate = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("watch"),
    videoId: z.string().min(1).max(100),
    furthest_s: z.number().min(0).max(36_000),
    duration_s: z.number().min(0).max(36_000),
    ended: z.boolean().optional(),
  }),
  z.object({ kind: z.literal("section"), index: z.number().int().min(0).max(200) }),
  z.object({ kind: z.literal("beat"), id: z.string().min(1).max(100) }),
  z.object({ kind: z.literal("card"), id: z.string().min(1).max(100) }),
]);

/** Save progress inside a module: watch position, section reached, beat seen, card revealed. */
export const saveModuleStateFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { slug: string; update: z.input<typeof stateUpdate> }) =>
    z.object({ slug: z.enum(MODULE_SLUGS), update: stateUpdate }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { saveModuleState } = await import("./training.server");
    return saveModuleState(context.userId, data.slug, data.update);
  });

/** A freshly shuffled Knowledge Quiz without the answer key. */
export const getQuizFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .handler(async ({ context }) => {
    const { getQuiz } = await import("./quiz.server");
    return getQuiz(context.userId);
  });

/** Grade a quiz attempt on the server. */
export const submitQuizFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { answers: Record<string, string> }) =>
    z.object({ answers: z.record(z.string().max(100), z.string().max(100)) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitQuiz } = await import("./quiz.server");
    return submitQuiz(context.userId, data.answers);
  });

/** How many questions the quiz has (for "{total}/{total}" copy). */
export const getQuizTotalFn = createServerFn({ method: "GET" })
  .middleware([requireTrainingAccess])
  .handler(async () => {
    const { quizTotal } = await import("./quiz.server");
    return { total: quizTotal() };
  });

/** Save one AI practice call straight after it ends (checked with ElevenLabs on the server). */
export const savePracticeCallFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { conversationId: string }) =>
    z.object({ conversationId: z.string().min(5).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { savePracticeCall } = await import("./practice.server");
    return { saved: await savePracticeCall(context.userId, data.conversationId) };
  });

/** Pick up any of the rep's practice calls that didn't save at the time. */
export const syncPracticeCallsFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .handler(async ({ context }) => {
    const { syncPracticeCalls } = await import("./practice.server");
    return syncPracticeCalls(context.userId);
  });

/** The rep picks their best practice call for Peter to review. */
export const submitBestCallFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { conversationId: string }) =>
    z.object({ conversationId: z.string().min(5).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { submitBestCall } = await import("./practice.server");
    return submitBestCall(context.userId, data.conversationId);
  });

/** Admin: mark a submitted practice call "Cleared to call" or "Keep practising". */
export const reviewPracticeCallFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator(
    (input: { callId: string; status: "cleared" | "keep_practising"; note: string }) =>
      z
        .object({
          callId: z.string().uuid(),
          status: z.enum(["cleared", "keep_practising"]),
          note: z.string().max(2000),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("is_admin_user");
    if (error) throw new Error(error.message);
    if (isAdmin !== true) throw new Error("Admins only");
    const { reviewPracticeCall } = await import("./practice.server");
    return reviewPracticeCall(data.callId, data.status, data.note);
  });

async function assertAdminFn(supabase: {
  rpc: (fn: "is_admin_user") => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}) {
  const { data, error } = await supabase.rpc("is_admin_user");
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Admins only");
}

/**
 * Admin: one ~10-minute piece of a call's transcript with word timings, for writing a Sales
 * Call Example card and choosing what to silence — or of the published cleaned copy, to
 * check nothing private can still be heard. Read-only.
 */
export const exampleCallTranscriptPartFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator(
    (input: { part: number } & ({ callRecordId: string } | { exampleId: string })) => {
      const part = z.number().int().min(0).max(20);
      return z
        .union([
          z.object({ callRecordId: z.string().uuid(), part }),
          z.object({ exampleId: z.string().regex(/^[a-z0-9-]{1,40}$/), part }),
        ])
        .parse(input);
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdminFn(context.supabase as never);
    const { transcriptPart } = await import("./call-examples.server");
    const source =
      "callRecordId" in data ? { callRecordId: data.callRecordId } : { exampleId: data.exampleId };
    return transcriptPart(source, data.part);
  });

/** Admin: publish a cleaned copy of a call (sensitive moments silenced) to the training bucket. */
export const publishExampleCallAudioFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator(
    (input: {
      callRecordId: string;
      exampleId: string;
      silence: { start: number; end: number }[];
    }) =>
      z
        .object({
          callRecordId: z.string().uuid(),
          exampleId: z.string().regex(/^[a-z0-9-]{1,40}$/),
          silence: z.array(z.object({ start: z.number().min(0), end: z.number().min(0) })).max(500),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminFn(context.supabase as never);
    const { publishExampleAudio } = await import("./call-examples.server");
    return publishExampleAudio(data.callRecordId, data.exampleId, data.silence);
  });

/** Admin: a one-off link to upload or replace a training video in the private bucket. */
export const trainingVideoUploadLinkFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .inputValidator((input: { name: string }) =>
    z.object({ name: z.string().regex(/^[a-z0-9-]{1,60}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminFn(context.supabase as never);
    const { trainingVideoUploadLink } = await import("./media.server");
    return trainingVideoUploadLink(`videos/${data.name}.mp4`);
  });

/** A server-issued token to start an AI practice call (reps who've reached AI Training). */
export const practiceTokenFn = createServerFn({ method: "POST" })
  .middleware([requireTrainingAccess])
  .handler(async ({ context }) => {
    const { practiceToken } = await import("./practice.server");
    return practiceToken(context.userId);
  });
