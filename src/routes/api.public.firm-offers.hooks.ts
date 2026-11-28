// Ported from the Legal app (family-law-floater/src/routes/api/public/firm-offers/hooks.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/firm-offers/hooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const provider = new URL(request.url).searchParams.get("provider");
        if (provider !== "annature" && provider !== "square")
          return new Response("Unknown provider", { status: 400 });
        const body = await request.text();
        if (body.length > 1000000) return new Response("Too large", { status: 413 });
        const { verifyHook } = await import("@/legal/lib/firm-offers/providers.server");
        if (
          !verifyHook(
            provider,
            body,
            request.headers.get(
              provider === "square" ? "x-square-hmacsha256-signature" : "x-annature-signature",
            ),
          )
        )
          return new Response("Invalid signature", { status: 401 });
        try {
          const event = JSON.parse(body);
          const { db, hash } = await import("@/legal/lib/firm-offers/store.server");
          // Persist only reconciliation identifiers, never signatures, tokens or PII-heavy payloads.
          const resourceId =
            provider === "annature"
              ? event.envelope_id
              : (event.data?.object?.invoice?.id ??
                event.data?.object?.payment?.id ??
                event.data?.object?.dispute?.disputed_payment?.payment_id);
          if (typeof resourceId !== "string") return Response.json({ ignored: true });
          const result = await db.from("firm_offer_events").insert({
            key: `${provider}:${event.event_id ?? hash(body)}`,
            provider,
            resource_id: resourceId,
            event_type: event.type ?? event.event ?? "unknown",
          });
          if (result.error && result.error.code !== "23505") throw result.error;
          return Response.json({ received: true });
        } catch {
          return new Response("Event persistence failed", { status: 503 });
        }
      },
    },
  },
});
