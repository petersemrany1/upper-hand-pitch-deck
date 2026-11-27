// Ported from the Legal app (family-law-floater/src/lib/firm-calling.functions.ts). Re-run the port script to refresh.
import { assertFirmPipelineAccess } from "./firm-pipeline-access";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FirmCall } from "./firm-calling";

const applicationSchema = z.object({ applicationId: z.string().uuid() });
export const getFirmCallWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) => applicationSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const db = context.supabase as SupabaseClient;
    const [sheet, calls] = await Promise.all([
      db
        .from("firm_application_call_sheets")
        .select("answers")
        .eq("application_id", data.applicationId)
        .maybeSingle(),
      db
        .from("firm_application_calls")
        .select(
          "id, application_id, status, direction, local_number, reviewed_at, duration_seconds, transcript, summary, analysis_status, recording_sid, created_at",
        )
        .eq("application_id", data.applicationId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (sheet.error || calls.error) throw new Error(sheet.error?.message ?? calls.error?.message);
    return {
      answers: (sheet.data?.answers ?? {}) as Record<string, string>,
      calls: (calls.data ?? []).map(({ recording_sid, ...call }) => ({
        ...call,
        has_recording: !!recording_sid,
      })) as FirmCall[],
    };
  });
export const saveFirmCallSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; patch: Record<string, string> }) =>
    applicationSchema
      .extend({ patch: z.record(z.string().max(80), z.string().max(12000)) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { error } = await (context.supabase as SupabaseClient).rpc("save_firm_call_sheet", {
      p_application_id: data.applicationId,
      p_patch: data.patch,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
export const prepareFirmCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) => applicationSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { toAuE164 } = await import("./twilio.server");
    const db = supabaseAdmin as SupabaseClient;
    const { data: rep } = await context.supabase
      .from("sales_reps")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!rep) throw new Error("You need an active advisor profile to make calls");
    const { data: app, error } = await context.supabase
      .from("firm_applications")
      .select("phone")
      .eq("id", data.applicationId)
      .single();
    if (error) throw new Error(error.message);
    const phone = toAuE164(app.phone);
    if (!phone) throw new Error("Add a valid Australian phone number before calling");
    const { firmSender } = await import("./firm-conversations.server");
    // Keep outbound calling available while inbound webhook setup is completed.
    const localNumber = firmSender();
    const { data: call, error: insertError } = await db
      .from("firm_application_calls")
      .insert({
        application_id: data.applicationId,
        rep_id: rep.id,
        phone,
        local_number: localNumber,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);
    return { callId: call.id as string, repId: rep.id, phone };
  });
export const retryFirmCallNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => z.object({ callId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { analyseFirmCall } = await import("./firm-calling.server");
    await analyseFirmCall(data.callId);
    return { ok: true };
  });

/** A browser/microphone failure must not leave a prepared attempt looking live. */
export const failPreparedFirmCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => z.object({ callId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const { data: rep, error: repError } = await context.supabase
      .from("sales_reps")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_active", true)
      .single();
    if (repError || !rep) throw new Error("You need an active advisor profile");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as SupabaseClient)
      .from("firm_application_calls")
      .update({ status: "failed" })
      .eq("id", data.callId)
      .eq("rep_id", rep.id)
      .in("status", ["pending", "initiated"]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
