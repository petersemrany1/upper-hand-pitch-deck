import { createFileRoute } from "@tanstack/react-router";
import {
  getSquarePayment,
  verifySquareWebhook,
  type SquarePayment,
} from "@/lib/square.server";
import { applySquareRefundUpdate, fulfilSquareDeposit } from "@/utils/square-fulfilment.server";

// Must match the subscription URL in the Square dashboard character for
// character — the signature is computed over this exact string plus the body.
const NOTIFICATION_URL = "https://hairtransplantgroup.lovable.app/api/public/square/webhook";

export const Route = createFileRoute("/api/public/square/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-square-hmacsha256-signature");

        const valid = await verifySquareWebhook(rawBody, signature, NOTIFICATION_URL);
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let event: {
          type?: string;
          data?: { object?: Record<string, unknown> };
        };
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const origin = new URL(request.url).origin;

        if (event.type === "payment.updated") {
          const payment = event.data?.object?.["payment"] as SquarePayment | undefined;
          if (!payment?.id) {
            return Response.json({ received: true, ignored: "no payment" });
          }
          if (payment.status !== "COMPLETED") {
            return Response.json({ received: true, ignored: payment.status });
          }
          const full = (await getSquarePayment(payment.id)) ?? payment;
          const result = await fulfilSquareDeposit(full, origin);
          return Response.json({ received: true, ...result });
        }

        if (event.type === "refund.updated") {
          const refund = event.data?.object?.["refund"] as
            | { id?: string; status?: string; payment_id?: string }
            | undefined;
          if (!refund?.id || !refund.status) {
            return Response.json({ received: true, ignored: "no refund" });
          }
          const result = await applySquareRefundUpdate({
            id: refund.id,
            status: refund.status,
            payment_id: refund.payment_id ?? null,
          });
          return Response.json({ received: true, ...result });
        }

        return Response.json({ received: true, ignored: event.type ?? "unknown" });
      },
    },
  },
});
