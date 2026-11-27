// Ported from the Legal app (family-law-floater/src/lib/firm-contracts.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";

/**
 * Bold Marketing Agreement — admin-only server functions.
 * INTERNAL: pricing and payment data never reaches firm portal users.
 */

type Ctx = {
  supabase: { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

async function requireAdmin(context: Ctx): Promise<string> {
  const { data: isAdmin } = await context.supabase.rpc("is_admin_user");
  if (isAdmin !== true) throw new Error("Admins only");
  if (!context.userId) throw new Error("Not signed in");
  return context.userId;
}

const draftSchema = z.object({
  firmId: z.string().uuid(),
  firm: z.object({
    name: z.string().trim().min(1, "Firm name is required"),
    abn: z.string().trim().default(""),
    address: z.string().trim().default(""),
    email: z.string().trim().email("Firm email must be valid").or(z.literal("")),
    signatoryName: z.string().trim().min(1, "Signatory name is required"),
    signatoryEmail: z.string().trim().email("Signatory email must be valid"),
    mobile: z.string().trim().optional(),
  }),
  packName: z.string().trim().min(1),
  shows: z.number().int().positive(),
  feeExCents: z.number().int().positive(),
  split: z.object({ block1Shows: z.number().int().positive() }).nullable(),
});
export type ContractDraftInput = z.infer<typeof draftSchema>;

/** Filled PDF as base64 for the wizard preview. No side effects. */
export const previewContractPdfFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ContractDraftInput) => draftSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { buildContract } = await import("./firm-contracts.server");
    const built = await buildContract(data);
    return {
      pdfBase64: Buffer.from(built.pdf).toString("base64"),
      template: built.template,
      amountDueCents: built.amountDueCents,
      pricing: built.pricing,
      blocks: built.blocks,
    };
  });

export const sendFirmContractFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ContractDraftInput) => draftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const uid = await requireAdmin(context as unknown as Ctx);
    const { sendFirmContract } = await import("./firm-contracts.server");
    const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
    // Keep the firm record in step with what went on the contract.
    await supabaseAdmin
      .from("firms")
      .update({
        firm_name: data.firm.name,
        abn: data.firm.abn || null,
        address: data.firm.address || null,
        email: data.firm.email || null,
        signatory_name: data.firm.signatoryName,
        signatory_email: data.firm.signatoryEmail,
        ...(data.firm.mobile ? { phone: data.firm.mobile } : {}),
      })
      .eq("id", data.firmId);
    return sendFirmContract(data, uid);
  });

export const listFirmContractsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { firmId: string }) => z.object({ firmId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { listContracts } = await import("./firm-contracts.server");
    return listContracts(data.firmId);
  });

const idSchema = z.object({ contractId: z.string().uuid() });

export const resendContractEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string }) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { resendContractEmail } = await import("./firm-contracts.server");
    await resendContractEmail(data.contractId);
    return { ok: true };
  });

export const resendPaymentEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string }) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { resendPaymentEmail } = await import("./firm-contracts.server");
    await resendPaymentEmail(data.contractId);
    return { ok: true };
  });

export const voidContractFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string; reason?: string }) =>
    idSchema.extend({ reason: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { voidContract } = await import("./firm-contracts.server");
    await voidContract(data.contractId, data.reason ?? null);
    return { ok: true };
  });

export const markContractPaidFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string; block: "1" | "2"; note?: string }) =>
    idSchema.extend({ block: z.enum(["1", "2"]), note: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { markPaidManually } = await import("./firm-contracts.server");
    await markPaidManually(data.contractId, data.block, data.note ?? null);
    return { ok: true };
  });

export const requestBlock2Fn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string }) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { requestBlock2 } = await import("./firm-contracts.server");
    return requestBlock2(data.contractId);
  });

export const chargeBlock2CardFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string; authorisation: string }) =>
    idSchema.extend({ authorisation: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { chargeBlock2Card } = await import("./firm-contracts.server");
    return chargeBlock2Card(data.contractId, data.authorisation);
  });

export const signedContractUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { contractId: string }) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const { signedPdfUrl } = await import("./firm-contracts.server");
    return { url: await signedPdfUrl(data.contractId) };
  });
