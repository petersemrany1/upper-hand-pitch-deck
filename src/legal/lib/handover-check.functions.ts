// Ported from the Legal app (family-law-floater/src/lib/handover-check.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

const input = z.object({
  long: z.boolean(),
  progress: z.object({
    draft: z.string().max(30000).optional(),
    factualDraft: z.string().max(30000).optional(),
    reviews: z
      .record(z.string().regex(/^[a-f0-9]{64}$/), z.string().max(100000))
      .refine((v) => Object.keys(v).length <= 100),
    splitReviews: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .max(100)
      .optional(),
  }),
});
export const runHandoverCheckFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await context.supabase.rpc("is_admin_user");
    if (admin.error || admin.data !== true) throw new Error("Admins only");
    const { runHandoverCheck } = await import("./handover-check.server");
    const { handoverIntelResponse } = await import("./handover-stream");
    return handoverIntelResponse(() =>
      runHandoverCheck(data.long, {
        reviews: data.progress.reviews,
        ...(data.progress.draft !== undefined ? { draft: data.progress.draft } : {}),
        ...(data.progress.factualDraft !== undefined
          ? { factualDraft: data.progress.factualDraft }
          : {}),
        ...(data.progress.splitReviews !== undefined
          ? { splitReviews: data.progress.splitReviews }
          : {}),
      }),
    );
  });
