// Ported from the Legal app (family-law-floater/src/lib/firm-callbacks.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { firmCallbackIdentity } from "./firm-callbacks";
import { assertFirmPipelineAccess } from "./firm-pipeline-access";
const sessionSchema = z.object({ sessionId: z.string().uuid() });
const callSidSchema = z.string().regex(/^CA[0-9a-f]{32}$/i);
export const getFirmCallbackSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { callbackSettings } = await import("./firm-callbacks.server");
    const settings = await callbackSettings(context.userId);
    return { allowed: !!settings, enabled: settings?.enabled === true };
  });
export const saveFirmCallbackSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { setCallbacksEnabled } = await import("./firm-callbacks.server");
    if (data.enabled) {
      const { requireCallbackOwner } = await import("./firm-callbacks.server");
      await requireCallbackOwner(context.userId);
      const { verifyFirmSender } = await import("./firm-conversations.server");
      await verifyFirmSender();
    }
    await setCallbacksEnabled(context.userId, data.enabled);
    return { allowed: true, enabled: data.enabled };
  });
export const startFirmCallbackSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string; takeOver?: boolean; autoReconnect?: boolean }) =>
    sessionSchema
      .extend({ takeOver: z.boolean().optional(), autoReconnect: z.boolean().optional() })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { claimCallbackSession } = await import("./firm-callbacks.server");
    const status = await claimCallbackSession(context.userId, data.sessionId, data.takeOver);
    if (status !== "claimed") {
      // Previously loaded pages expect errors, not a successful null token.
      if (!data.autoReconnect)
        throw new Error("Reload this Firms tab to reconnect calls automatically.");
      return { status, token: null };
    }
    try {
      // A saved enabled preference does not prove the number still routes
      // callbacks here. Recheck after reload before advertising reception.
      const { verifyFirmSender } = await import("./firm-conversations.server");
      await verifyFirmSender();
      const { mintVoiceToken } = await import("./twilio-voice.server");
      return {
        status,
        ...(await mintVoiceToken(firmCallbackIdentity(context.userId, data.sessionId), 300, true)),
      };
    } catch (error) {
      const { releaseCallbackSession } = await import("./firm-callbacks.server");
      await releaseCallbackSession(context.userId, data.sessionId);
      throw error;
    }
  });
export const keepFirmCallbackSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      sessionId: string;
      available: boolean;
      renewToken?: boolean;
      autoReconnect?: boolean;
    }) =>
      sessionSchema
        .extend({
          available: z.boolean(),
          renewToken: z.boolean().optional(),
          autoReconnect: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { refreshCallbackSession } = await import("./firm-callbacks.server");
    const status = await refreshCallbackSession(context.userId, data.sessionId, data.available);
    if (status !== "renewed" && !data.autoReconnect)
      throw new Error("Reload this Firms tab to reconnect calls automatically.");
    if (status !== "renewed" || !data.renewToken) return { status, token: null };
    const { mintVoiceToken } = await import("./twilio-voice.server");
    return {
      status,
      ...(await mintVoiceToken(firmCallbackIdentity(context.userId, data.sessionId), 300, true)),
    };
  });
export const stopFirmCallbackSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => sessionSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { releaseCallbackSession } = await import("./firm-callbacks.server");
    await releaseCallbackSession(context.userId, data.sessionId);
    return { ok: true };
  });

export const declineIncomingFirmCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callSid: string }) => z.object({ callSid: callSidSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { declineFirmCallback } = await import("./firm-callbacks.server");
    await declineFirmCallback(context.userId, data.callSid);
    return { ok: true };
  });

export const sendIncomingFirmMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { callSid: string; id: string; body: string }) =>
    z
      .object({
        callSid: callSidSchema,
        id: z.string().uuid(),
        body: z.string().trim().min(1).max(1600),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { requireCallbackRecipient } = await import("./firm-callbacks.server");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const db = supabaseAdmin as SupabaseClient;
    const call = await requireCallbackRecipient(context.userId, data.callSid);
    const { data: app, error: appError } = await db
      .from("firm_applications")
      .select("phone")
      .eq("id", call.application_id)
      .single();
    const { toAuE164 } = await import("./twilio.server");
    if (appError || toAuE164(app?.phone) !== call.phone)
      throw new Error("The firm's number changed. Open its inbox to confirm the recipient.");
    const { sendFirmText } = await import("./firm-conversations.server");
    return sendFirmText({
      applicationId: call.application_id,
      id: data.id,
      body: data.body,
      userId: context.userId,
    });
  });
