// Ported from the Legal app (family-law-floater/src/routes/api/public/legal-firm-leads.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/legal-firm-leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { handleFirmLeadRequest } = await import("@/legal/lib/firm-leads.server");
        return handleFirmLeadRequest(request);
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
  },
});
