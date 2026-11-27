// Ported from the Legal app (family-law-floater/src/lib/firm-pack-orders.functions.ts). Re-run the port script to refresh.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/legal/integrations/supabase/auth-middleware";
import { packOrderSchema, placeFirmPackOrder, type PackOrderRpc } from "./firm-pack-orders";

export const orderFirmPackFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(packOrderSchema)
  .handler(async ({ data, context }) => {
    const result = await placeFirmPackOrder(context.supabase as unknown as PackOrderRpc, data);
    // The order and notification are committed together. A mail outage must
    // never turn a successful purchase into a retry that creates another pack.
    try {
      const { sendFirmPackOrderNotifications } = await import("./firm-pack-orders.server");
      await sendFirmPackOrderNotifications(result.id);
    } catch {
      console.error("[firm-pack-order] notification remains queued");
    }
    return result;
  });
