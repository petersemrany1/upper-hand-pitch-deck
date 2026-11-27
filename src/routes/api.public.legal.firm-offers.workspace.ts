// Ported from the Legal app (family-law-floater/src/routes/api/public/firm-offers/workspace.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
const schema = z
  .object({
    token: z.string().max(100),
    action: z.enum([
      "exchange",
      "read",
      "details",
      "preview",
      "sign",
      "change",
      "unsubscribe",
      "signed",
      "certificate",
    ]),
    details: z.unknown().optional(),
    digest: z.string().max(64).optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};
export const Route = createFileRoute("/api/public/legal/firm-offers/workspace")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        try {
          const origin = request.headers.get("origin");
          if (!origin || origin !== new URL(request.url).origin)
            return new Response("Invalid origin", { status: 403, headers });
          if (!request.headers.get("content-type")?.startsWith("application/json"))
            return new Response("JSON required", { status: 415, headers });
          const body = await request.text();
          if (body.length > 12000)
            return new Response("Request too large", { status: 413, headers });
          const input = schema.parse(JSON.parse(body));
          const store = await import("@/legal/lib/firm-offers/store.server");
          const service = await import("@/legal/lib/firm-offers/service.server");
          if (input.action === "exchange")
            return Response.json(await store.exchangeLink(input.token), { headers });
          let offer = await store.recipientSession(input.token);
          if (input.action === "details")
            offer = await service.confirmDetails(offer, input.details);
          if (input.action === "change")
            offer = await service.requestChange(offer, input.note ?? "");
          if (input.action === "unsubscribe")
            offer = await store.saveOffer({ ...offer, optedOut: true }, "Recipient opted out");
          if (input.action === "sign")
            return Response.json(await service.beginSigning(offer, input.digest ?? ""), {
              headers,
            });
          if (["preview", "signed", "certificate"].includes(input.action))
            return Response.json(
              await service.downloadDocument(
                offer,
                input.action as "preview" | "signed" | "certificate",
              ),
              { headers },
            );
          return Response.json({ offer: store.publicOffer(offer) }, { headers });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Request failed" },
            { status: 400, headers },
          );
        }
      },
    },
  },
});
