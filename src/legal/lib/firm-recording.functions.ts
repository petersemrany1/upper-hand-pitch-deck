// Ported from the Legal app (family-law-floater/src/lib/firm-recording.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

export const getFirmRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { applicationId: string; callId: string }) =>
    z.object({ applicationId: z.string().uuid(), callId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadFirmRecording } = await import("./firm-recording.server");
    return loadFirmRecording(context.supabase, data.applicationId, data.callId);
  });
