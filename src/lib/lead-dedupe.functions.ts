import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * Deletes duplicate Meta enquiries for patients who already have an active
 * booking (lead_class = 'booked_active'). Only the un-booked duplicate rows are
 * removed — the booked lead row is never touched.
 */
export const deleteBookedDuplicateLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    const { data: me } = await supabaseAdmin
      .from("sales_reps")
      .select("role, is_active")
      .ilike("email", email ?? "")
      .maybeSingle();
    if (!me || me.is_active === false) throw new Error("Not authorised");

    // Only rows that are genuinely duplicates of an already-booked patient.
    const { data: candidates } = await supabaseAdmin
      .from("meta_leads")
      .select("id, lead_class")
      .in("id", data.ids);

    const deletable = (candidates ?? [])
      .filter((r) => r.lead_class === "booked_active")
      .map((r) => r.id);
    if (deletable.length === 0) return { deleted: 0 };

    const { error } = await supabaseAdmin.from("meta_leads").delete().in("id", deletable);
    if (error) throw new Error(error.message);

    return { deleted: deletable.length };
  });
