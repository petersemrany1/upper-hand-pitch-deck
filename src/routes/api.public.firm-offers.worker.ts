// Ported from the Legal app (family-law-floater/src/routes/api/public/firm-offers/worker.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { legalEnv } from "@/legal/runtime/env";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/firm-offers/worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { timingSafeEqual } = await import("node:crypto");
        const secret = legalEnv["BOLD_OFFER_WORKER_SECRET"];
        const a = Buffer.from(request.headers.get("authorization") ?? ""),
          b = Buffer.from(`Bearer ${secret}`);
        if (!secret || a.length !== b.length || !timingSafeEqual(a, b))
          return new Response("Unauthorized", { status: 401 });
        try {
          return Response.json(await (await import("@/legal/lib/firm-offers/worker.server")).runWorker());
        } catch {
          return new Response("Worker failed; inspect durable jobs", { status: 503 });
        }
      },
    },
  },
});
