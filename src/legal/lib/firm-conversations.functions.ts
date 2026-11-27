// Ported from the Legal app (family-law-floater/src/lib/firm-conversations.functions.ts). Re-run the port script to refresh.
import { assertFirmPipelineAccess } from "./firm-pipeline-access";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import type { FirmMessage, FirmConversationOverview, FirmSendResult } from "./firm-conversations";
import type { FirmMissedCall, FirmMissedCallCursor } from "./firm-callbacks";
async function admin(db: SupabaseClient) {
  const { data, error } = await db.rpc("is_admin_user");
  if (error || data !== true) throw new Error("Admins only");
}
export const getFirmConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; before?: string }) =>
    z
      .object({ applicationId: z.string().uuid(), before: z.string().datetime().optional() })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const db = context.supabase as SupabaseClient;
    let query = db
      .from("firm_application_messages")
      .select("*")
      .eq("application_id", data.applicationId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.before) query = query.lt("created_at", data.before);
    const { data: messages, error } = await query;
    if (error) throw new Error(error.message);
    const { firmSender, verifyFirmSender, firmTextBlocked, FirmSenderConnectionError } =
      await import("./firm-conversations.server");
    const { toAuE164 } = await import("./twilio.server");
    const { data: app, error: appError } = await db
      .from("firm_applications")
      .select("phone")
      .eq("id", data.applicationId)
      .single();
    if (appError) throw new Error(appError.message);
    let sender: string | null = null,
      configurationError: string | null = null;
    let canReconnect = false;
    try {
      sender = firmSender();
      await verifyFirmSender();
    } catch (error) {
      configurationError = error instanceof Error ? error.message : "Phone connection unavailable";
      canReconnect = error instanceof FirmSenderConnectionError;
    }
    const phone = toAuE164(app.phone);
    const optedOut = phone ? await firmTextBlocked(phone) : false;
    return {
      messages: messages as FirmMessage[],
      sender,
      configurationError,
      canReconnect: canReconnect && (await db.rpc("is_admin_user")).data === true,
      optedOut,
      hasMore: messages.length === 100,
    };
  });
export const getFirmConversationInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { data, error } = await (context.supabase as SupabaseClient)
      .from("firm_conversation_overview")
      .select("*")
      .order("last_activity_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as FirmConversationOverview[];
  });

/** Shared history includes missed calls even after later messages or outgoing calls. */
export const getMissedFirmCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { before?: FirmMissedCallCursor }) =>
    z
      .object({
        before: z
          .object({ createdAt: z.string().datetime({ offset: true }), id: z.string().uuid() })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    let query = (context.supabase as SupabaseClient)
      .from("firm_application_calls")
      .select("id,application_id,phone,status,created_at,reviewed_at")
      .eq("direction", "inbound")
      .in("status", ["missed", "no-answer", "declined", "voicemail"])
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(51);
    if (data.before)
      query = query.or(
        `created_at.lt.${data.before.createdAt},and(created_at.eq.${data.before.createdAt},id.lt.${data.before.id})`,
      );
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const calls = (rows ?? []).slice(0, 50) as FirmMissedCall[];
    const last = calls.at(-1);
    return {
      calls,
      nextCursor: (rows?.length > 50 && last
        ? { createdAt: last.created_at, id: last.id }
        : null) as FirmMissedCallCursor | null,
    };
  });
export const sendFirmMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; id: string; body: string }) =>
    z
      .object({
        applicationId: z.string().uuid(),
        id: z.string().uuid(),
        body: z.string().trim().min(1).max(1600),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { sendFirmText } = await import("./firm-conversations.server");
    return (await sendFirmText({ ...data, userId: context.userId })) as FirmSendResult;
  });
export const reviewFirmConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; messageIds: string[]; callIds: string[] }) =>
    z
      .object({
        applicationId: z.string().uuid(),
        messageIds: z.array(z.string().uuid()).max(100),
        callIds: z.array(z.string().uuid()).max(50),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const db = supabaseAdmin as SupabaseClient;
    for (const [table, ids] of [
      ["firm_application_messages", data.messageIds],
      ["firm_application_calls", data.callIds],
    ] as const) {
      if (!ids.length) continue;
      const { error } = await db
        .from(table)
        .update({ reviewed_at: new Date().toISOString() })
        .eq("application_id", data.applicationId)
        .eq("direction", "inbound")
        .in("id", ids)
        .is("reviewed_at", null);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const readFirmConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { applicationId: string; messageThrough: string | null; callThrough: string | null }) =>
      z
        .object({
          applicationId: z.string().uuid(),
          messageThrough: z.string().datetime({ offset: true }).nullable(),
          callThrough: z.string().datetime({ offset: true }).nullable(),
        })
        .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { markFirmConversationRead } = await import("./firm-conversations.server");
    return markFirmConversationRead(data);
  });

/** Only an authenticated admin can change the configured sender's inbound routing. */
export const reconnectFirmNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await admin(context.supabase);
    const { verifyFirmSender } = await import("./firm-conversations.server");
    await verifyFirmSender({ repair: true });
    return { ok: true };
  });
