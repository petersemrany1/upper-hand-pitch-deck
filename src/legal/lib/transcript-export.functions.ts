// Ported from the Legal app (family-law-floater/src/lib/transcript-export.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

/** Temporary one-off export: every call over 2 minutes, oldest to newest. Admin only. */
export const exportTranscriptsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; text: string; count: number } | { ok: false; error: string }> => {
    const admin = await context.supabase.rpc("is_admin_user");
    if (admin.error) return { ok: false, error: admin.error.message };
    if (admin.data !== true) return { ok: false, error: "Admins only" };

    const { buildTranscriptExport } = await import("./transcript-export.server");
    try {
      return await buildTranscriptExport(context.supabase as never);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

/** List of calls over 2 minutes that have a transcript. Admin only. */
export const listTranscriptCallsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; calls: { id: string; label: string }[] } | { ok: false; error: string }> => {
    const admin = await context.supabase.rpc("is_admin_user");
    if (admin.error) return { ok: false, error: admin.error.message };
    if (admin.data !== true) return { ok: false, error: "Admins only" };

    const { listTranscriptCalls } = await import("./transcript-export.server");
    try {
      return await listTranscriptCalls(context.supabase as never);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

/** Single call transcript export. Admin only. */
export const exportSingleTranscriptFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { callId: string }) => data)
  .handler(async ({ context, data }): Promise<{ ok: true; text: string; name: string } | { ok: false; error: string }> => {
    const admin = await context.supabase.rpc("is_admin_user");
    if (admin.error) return { ok: false, error: admin.error.message };
    if (admin.data !== true) return { ok: false, error: "Admins only" };

    const { buildSingleTranscript } = await import("./transcript-export.server");
    try {
      return await buildSingleTranscript(context.supabase as never, data.callId);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
