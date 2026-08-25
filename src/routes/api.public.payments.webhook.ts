// Managed payments webhook (Lovable-hosted Stripe). Credits the $75 refundable
// booking fee onto the lead. Security = Stripe signature verification only;
// never add Supabase auth here (Stripe sends no session token).

import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { fulfilDepositPayment } from "@/utils/deposit-fulfilment.server";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("payments webhook: invalid env param", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;

        let event: { type: string; data: { object: Record<string, unknown> } };
        try {
          event = await verifyWebhook(request, env);
        } catch (e) {
          console.error("payments webhook: verification failed", e);
          return new Response("Webhook error", { status: 400 });
        }

        try {
          const origin = new URL(request.url).origin;
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as {
                id: string;
                payment_status?: string | null;
              };
              // Delayed-notification methods settle later via
              // async_payment_succeeded — only fulfil when not "unpaid".
              if (session.payment_status === "unpaid") {
                return Response.json({ received: true, pending: true });
              }
              const result = await fulfilDepositPayment(event.data.object as never, origin);
              return Response.json({ received: true, ...result });
            }
            case "checkout.session.async_payment_succeeded": {
              const result = await fulfilDepositPayment(event.data.object as never, origin);
              return Response.json({ received: true, ...result });
            }
            case "checkout.session.async_payment_failed":
              console.warn("payments webhook: async payment failed", event.data.object);
              return Response.json({ received: true });
            default:
              return Response.json({ received: true, ignored: event.type });
          }
        } catch (e) {
          console.error("payments webhook: handler error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
