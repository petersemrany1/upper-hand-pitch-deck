// Ported from the Legal app (family-law-floater/src/lib/call-review.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSalesAccess } from "@/legal/lib/portal-access-middleware";

export const getCallReviewFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; offset?: number }) =>
    z
      .object({ leadId: z.string().uuid(), offset: z.number().int().min(0).default(0) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadCallReview } = await import("./call-review.server");
    return loadCallReview(context.supabase, data.leadId, data.offset);
  });

export const getClientTranscriptsFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; offset: number }) =>
    z.object({ leadId: z.string().uuid(), offset: z.number().int().nonnegative() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadClientTranscripts } = await import("./call-review.server");
    return loadClientTranscripts(context.supabase, data.leadId, data.offset);
  });

export const getCallRecordingFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; callId: string }) =>
    z.object({ leadId: z.string().uuid(), callId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadCallRecording } = await import("./call-review.server");
    return loadCallRecording(context.supabase, data.leadId, data.callId);
  });

export const getSalesCallSummaryFn = createServerFn({ method: "POST" })
  .middleware([requireSalesAccess])
  .inputValidator((input: { leadId: string; callId: string }) =>
    z.object({ leadId: z.string().uuid(), callId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { loadSalesCallSummarySource } = await import("./call-review.server");
    const call = await loadSalesCallSummarySource(context.supabase, data.leadId, data.callId);
    if (!call) return null;
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    const { generateSalesCallSummary } = await import("./sales-call-summary.server");
    return generateSalesCallSummary(supabaseAdmin, call);
  });
