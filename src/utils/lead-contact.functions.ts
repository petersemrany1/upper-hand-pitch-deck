import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// PostgreSQL accepts null expected values for its IS DISTINCT FROM check;
// generated RPC argument types do not capture that nullability.
type ContactDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Omit<Database["public"]["Functions"], "save_lead_contact"> & {
      save_lead_contact: {
        Args: Omit<Database["public"]["Functions"]["save_lead_contact"]["Args"],
          "p_expected_first_name" | "p_expected_last_name" | "p_expected_phone"> & {
          p_expected_first_name: string | null;
          p_expected_last_name: string | null;
          p_expected_phone: string | null;
        };
        Returns: Database["public"]["Functions"]["save_lead_contact"]["Returns"];
      };
    };
  };
};

const contactSchema = z.object({
  id: z.string().uuid(), first_name: z.string().nullable(),
  last_name: z.string().nullable(), phone: z.string().nullable(),
});
export type LeadContact = z.infer<typeof contactSchema>;

export const saveLeadContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    leadId: z.string().uuid(), firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100), phone: z.string().trim().max(40),
    expected: contactSchema,
  }))
  .handler(async ({ data, context }) => {
    const client = context.supabase as SupabaseClient<ContactDatabase>;
    const { data: contact, error } = await client.rpc("save_lead_contact", {
      p_lead_id: data.leadId, p_first_name: data.firstName,
      p_last_name: data.lastName, p_phone: data.phone,
      p_expected_first_name: data.expected.first_name,
      p_expected_last_name: data.expected.last_name, p_expected_phone: data.expected.phone,
    });
    if (error) throw new Error(error.message);
    return contactSchema.parse(contact);
  });
