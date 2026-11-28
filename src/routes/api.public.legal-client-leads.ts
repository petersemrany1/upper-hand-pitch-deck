// Ported from the Legal app (family-law-floater/src/routes/api/public/legal-client-leads.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/legal-client-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { handleClientLeadRequest } = await import("@/legal/lib/client-leads.server");
        return handleClientLeadRequest(request);
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
