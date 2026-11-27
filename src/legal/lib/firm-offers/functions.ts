// Ported from the Legal app (family-law-floater/src/lib/firm-offers/functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { offerDraftSchema, type OfferDraft } from "./model";
type Context = { supabase: { rpc: (name: string) => Promise<{ data: unknown }> }; userId: string };
async function admin(ctx: unknown) {
  const c = ctx as Context;
  if (!c.userId || (await c.supabase.rpc("is_admin_user")).data !== true)
    throw new Error("Admins only");
  return c.userId;
}
export const offerWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) =>
    z.object({ applicationId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await admin(context);
    const { listOffers, db } = await import("./store.server");
    const { signingConfigurationBlockers, configurationBlockers } =
      await import("./providers.server");
    const firms = await db.from("firms").select("id,firm_name").order("firm_name");
    if (firms.error) throw new Error(firms.error.message);
    const offers = await listOffers(data.applicationId);
    const delivery = offers.length
      ? await db
          .from("firm_offer_outbox")
          .select("offer_id,step,channel,state,updated_at")
          .in(
            "offer_id",
            offers.map((o) => o.id),
          )
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [], error: null };
    if (delivery.error) throw new Error(delivery.error.message);
    return {
      delivery: delivery.data as {
        offer_id: string;
        step: string;
        channel: string;
        state: string;
        updated_at: string;
      }[],
      offers,
      blockers: signingConfigurationBlockers(),
      legacyBlockers: configurationBlockers(),
      firms: firms.data as { id: string; firm_name: string }[],
    };
  });
export const saveOfferDraftFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OfferDraft) => offerDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    await admin(context);
    const offer = await (await import("./store.server")).createDraft(data);
    return { offer, ...(await (await import("./service.server")).preview(offer)) };
  });
export const offerActionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { offerId: string; action: string; note?: string; firmId?: string; digest?: string }) =>
      z
        .object({
          offerId: z.string().uuid(),
          action: z.enum([
            "preview",
            "signing_link",
            "signed",
            "certificate",
            "send",
            "link",
            "pause",
            "resume",
            "revision",
            "withdraw",
            "countersign",
            "onboarding",
            "activate",
            "reconcile",
          ]),
          digest: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .optional(),
          note: z.string().max(2000).optional(),
          firmId: z.string().uuid().optional(),
        })
        .parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = await admin(context);
    const { loadOffer } = await import("./store.server");
    const o = await loadOffer(data.offerId);
    const service = await import("./service.server");
    if (data.action === "activate") {
      if (!data.firmId)
        throw new Error("Select the verified firm record before activating its pack");
      return { packId: await service.activatePack(o, data.firmId) };
    }
    if (data.action === "reconcile") {
      const { reconcileOffer } = await import("./worker.server");
      return { offer: await reconcileOffer(o.id) };
    }
    return service.adminAction(o, data.action, userId, data.note, data.digest);
  });
