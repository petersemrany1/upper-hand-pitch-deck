// Ported from the Legal app (family-law-floater/src/lib/ad-briefing.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import {
  reportSchema,
  parseBriefingSettings,
  type AdReport,
  type BriefingSettingsInput,
} from "./ad-briefing";

export const getAdBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin_user");
    if (data !== true) throw new Error("Admins only");
    const { briefingState } = await import("./ad-briefing.server");
    return briefingState(context.userId);
  });

export const saveAdBriefingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BriefingSettingsInput) => parseBriefingSettings(input))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc("is_admin_user");
    if (admin !== true) throw new Error("Admins only");
    const { saveBriefingSettings } = await import("./ad-briefing.server");
    await saveBriefingSettings(context.userId, data);
    return { ok: true };
  });

export const saveAdBriefingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdReport) => reportSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc("is_admin_user");
    if (admin !== true) throw new Error("Admins only");
    const { saveBriefingReport } = await import("./ad-briefing.server");
    await saveBriefingReport(context.userId, data);
    return { ok: true };
  });

export const testAdBriefing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin_user");
    if (data !== true) throw new Error("Admins only");
    const { testBriefingCall } = await import("./ad-briefing.server");
    return testBriefingCall(context.userId);
  });

export const connectAdBriefingVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin_user");
    if (data !== true) throw new Error("Admins only");
    const { connectHaboobVoice } = await import("./ad-briefing-elevenlabs.server");
    return connectHaboobVoice(context.userId);
  });
