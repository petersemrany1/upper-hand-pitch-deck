// Ported from the Legal app (family-law-floater/src/lib/firm-contact.functions.ts). Re-run the port script to refresh.
import { assertFirmPipelineAccess } from "./firm-pipeline-access";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import type { FirmApplication } from "./firm-applications";
const text = z
  .string()
  .trim()
  .max(160)
  .transform((v) => v || null);
const phone = z
  .string()
  .trim()
  .max(40)
  .transform((value, ctx) => {
    if (!value) return null;
    const digits = value.replace(/[\s()+.-]/g, "");
    const normalized = digits.startsWith("61")
      ? "+" + digits
      : digits.startsWith("0")
        ? "+61" + digits.slice(1)
        : "+61" + digits;
    if (!/^\+61[23478]\d{8}$/.test(normalized)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid Australian phone number.",
      });
      return z.NEVER;
    }
    return normalized;
  });
export const updateFirmContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string; patch: Record<string, string> }) =>
    z
      .object({
        applicationId: z.string().uuid(),
        patch: z
          .object({
            first_name: text.optional(),
            last_name: text.optional(),
            firm_name: text.optional(),
            phone: phone.optional(),
            email: z
              .union([z.literal(""), z.string().trim().email().max(254)])
              .transform((v) => v || null)
              .optional(),
          })
          .strict()
          .refine((v) => Object.keys(v).length > 0, "Choose a contact field to update."),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertFirmPipelineAccess(context.supabase);
    const patch = Object.fromEntries(
      Object.entries(data.patch).filter(([, value]) => value !== undefined),
    ) as Partial<
      Pick<FirmApplication, "first_name" | "last_name" | "firm_name" | "phone" | "email">
    >;
    const { data: app, error } = await context.supabase
      .from("firm_applications")
      .update(patch)
      .eq("id", data.applicationId)
      .select(
        "id, first_name, last_name, email, phone, firm_name, city, stage, ad_name, adset_name, campaign_name, lead_id, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return app as FirmApplication;
  });
