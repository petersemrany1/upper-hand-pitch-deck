// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/bold-stripe.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Bold Marketing Stripe webhook (separate account and secret from any legacy
 * Stripe use). Handles checkout.session.completed for contract payment links;
 * idempotent on the Stripe event id. Register in the Bold Stripe dashboard:
 * <APP_URL>/api/public/hooks/bold-stripe with BOLD_STRIPE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/hooks/bold-stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const payload = await request.text();
        const secret = legalEnv["BOLD_STRIPE_WEBHOOK_SECRET"];
        if (!secret) {
          console.error("[bold-stripe] BOLD_STRIPE_WEBHOOK_SECRET not configured");
          return new Response("Not configured", { status: 500 });
        }
        const { verifyStripeSignature } = await import("@/legal/lib/contracts/stripe-bold.server");
        const ok = await verifyStripeSignature(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!ok) {
          console.error("[bold-stripe] invalid signature");
          return new Response("Invalid signature", { status: 400 });
        }
        let event: { id: string; type: string; data: { object: Record<string, unknown> } };
        try {
          event = JSON.parse(payload) as typeof event;
        } catch {
          return Response.json({ received: true, ignored: "unparseable" });
        }
        const { handleStripeEvent } = await import("@/legal/lib/firm-contracts.server");
        try {
          const r = await handleStripeEvent(event);
          return Response.json({ received: true, ...r });
        } catch (error) {
          console.error("[bold-stripe] apply failed", error);
          return Response.json({ received: true, handled: false, error: (error as Error).message });
        }
      },
    },
  },
});
