import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
    // The generated types mark the p_expected_* params as non-nullable text, but the
    // database function declares them plain text and compares with IS DISTINCT FROM,
    // so a null last name or phone is genuinely valid and must pass through as null.
    const args = {
      p_lead_id: data.leadId, p_first_name: data.firstName,
      p_last_name: data.lastName, p_phone: data.phone,
      p_expected_first_name: data.expected.first_name,
      p_expected_last_name: data.expected.last_name, p_expected_phone: data.expected.phone,
    } as unknown as import("@/integrations/supabase/types").Database["public"]["Functions"]["save_lead_contact"]["Args"];
    const { data: contact, error } = await context.supabase.rpc("save_lead_contact", args);
    if (error) throw new Error(error.message);
    return contactSchema.parse(contact);
  });
