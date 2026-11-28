// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/square-deposit.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Square deposit webhook. Signature-verified. Acts only on completed payments
 * and writes only the deposit/payment-reference columns — never
 * client_leads.status. Retries transient lookup and database failures instead of acknowledging lost payments.
 */
export const Route = createFileRoute("/api/public/hooks/square-deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const payload = await request.text();
        const signature = request.headers.get("x-square-hmacsha256-signature");

        const { verifySquareSignature, leadIdForPayment, recordPaidDeposit, isCompletedDeposit } =
          await import("@/legal/lib/square-deposit.server");

        if (!verifySquareSignature(payload, signature)) {
          console.error("[square-deposit] invalid signature");
          return new Response("Invalid signature", { status: 400 });
        }

        let event: {
          type?: string;
          data?: { object?: { payment?: Record<string, unknown> } };
        } = {};
        try {
          event = JSON.parse(payload) as typeof event;
        } catch {
          return Response.json({ received: true, ignored: "unparseable" });
        }

        if (event.type !== "payment.created" && event.type !== "payment.updated") {
          return Response.json({ received: true, ignored: event.type ?? "unknown" });
        }

        const payment = (event.data?.object?.payment ?? {}) as {
          id?: string;
          status?: string;
          note?: string | null;
          order_id?: string | null;
          location_id?: string;
          amount_money?: { amount?: number; currency?: string };
          refunded_money?: { amount?: number };
        };

        console.info("[square-deposit] received", {
          type: event.type,
          paymentId: payment.id,
          status: payment.status,
        });
        if (payment.status !== "COMPLETED" || !payment.id) {
          return Response.json({ received: true, ignored: "not_completed" });
        }

        try {
          if (!isCompletedDeposit(payment))
            return Response.json({ received: true, ignored: "not_booking_deposit" });
          const leadId = await leadIdForPayment(payment);
          if (!leadId) {
            console.warn("[square-deposit] unmatched payment", {
              paymentId: payment.id,
              orderId: payment.order_id,
            });
            return Response.json({ received: true, ignored: "no_lead" });
          }
          const result = await recordPaidDeposit({
            leadId,
            paymentId: payment.id,
            amountCents: payment.amount_money?.amount ?? null,
            orderId: payment.order_id ?? null,
          });
          return Response.json({ received: true, matched: result.matched });
        } catch (error) {
          console.error("[square-deposit] apply failed", error);
          return Response.json({ received: false, retry: true }, { status: 503 });
        }
      },
    },
  },
});
