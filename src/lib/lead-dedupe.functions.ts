import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * Compatibility endpoint for older open tabs. Duplicate enquiries are now
 * retained and linked by the database, never deleted as a side effect of a read.
 */
export const deleteBookedDuplicateLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input ?? {}))
  .handler(async () => ({ deleted: 0 }));
