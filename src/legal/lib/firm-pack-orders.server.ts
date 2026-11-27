// Ported from the Legal app (family-law-floater/src/lib/firm-pack-orders.server.ts). Re-run the port script to refresh.
import { INTERNAL_ALERT_TO, sendEmail } from "./email.server";
import type { PackOrderRpc } from "./firm-pack-orders";

type Notification = {
  id: string;
  firm_name: string;
  quantity: number;
  created_at: string;
  claim_token: string;
};

export async function sendFirmPackOrderNotifications(orderId?: string) {
  const { supabaseAdmin } = await import("@/legal/integrations/supabase/client.server");
  return deliverPackNotifications(supabaseAdmin as unknown as PackOrderRpc, sendEmail, orderId);
}

export async function deliverPackNotifications(
  db: PackOrderRpc,
  send: typeof sendEmail,
  orderId?: string,
) {
  const { data, error } = await db.rpc("claim_firm_pack_notifications", {
    p_order: orderId ?? null,
  });
  if (error) throw new Error("Could not load pack notifications");
  let sent = 0;
  await Promise.all(
    ((data ?? []) as Notification[]).map(async (order) => {
      let ok = false;
      try {
        const result = await send({
          to: [INTERNAL_ALERT_TO],
          subject: `Add Pack: ${order.firm_name.replace(/[\r\n]/g, " ")} — ${order.quantity} credits`,
          text: `${order.firm_name} confirmed ${order.quantity} additional consultation credits.\n\nThe credits have been added to their portal. Payment is pending manual arrangement; no payment has been taken.\n\nOrder: ${order.id}\nConfirmed: ${order.created_at}\n\nPlease arrange payment at the firm's agreed rate.`,
          idempotencyKey: `firm-pack-order/${order.id}`,
          redactErrors: true,
        });
        ok = result.ok;
      } catch {
        // Lease expires/retries even if the provider times out.
      }
      const done = await db.rpc("finish_firm_pack_notification", {
        p_order: order.id,
        p_claim: order.claim_token,
        p_sent: ok,
      });
      if (done.error) throw new Error("Could not record notification result");
      if (ok) sent++;
    }),
  );
  return { sent };
}
