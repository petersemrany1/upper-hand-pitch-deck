// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/annature.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Annature e-signature webhook. Signature-verified (constant-time). Maps
 * recipient_viewed / envelope_completed / recipient_declined / envelope_voided
 * onto firm_contracts. Always 200 on unknown envelopes so Annature stops retrying.
 * Register in Annature → Developers → Webhooks: <APP_URL>/api/public/legal/hooks/annature
 */
export const Route = createFileRoute("/api/public/legal/hooks/annature")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const payload = await request.text();
        const secret = legalEnv["ANNATURE_WEBHOOK_SECRET"];
        if (!secret) {
          console.error("[annature-hook] ANNATURE_WEBHOOK_SECRET not configured");
          return new Response("Not configured", { status: 500 });
        }
        const { verifyAnnatureSignature, handleAnnatureEvent } =
          await import("@/legal/lib/firm-contracts.server");
        const ok = await verifyAnnatureSignature(
          payload,
          request.headers.get("x-annature-signature"),
          secret,
        );
        if (!ok) {
          console.error("[annature-hook] invalid signature");
          return new Response("Invalid signature", { status: 400 });
        }
        let event: Parameters<typeof handleAnnatureEvent>[0];
        try {
          event = JSON.parse(payload) as typeof event;
        } catch {
          return Response.json({ received: true, ignored: "unparseable" });
        }
        try {
          const r = await handleAnnatureEvent(event);
          return Response.json({ received: true, ...r });
        } catch (error) {
          console.error("[annature-hook] apply failed", error);
          return Response.json({ received: true, handled: false, error: (error as Error).message });
        }
      },
    },
  },
});
