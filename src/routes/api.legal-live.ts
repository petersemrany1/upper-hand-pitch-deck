import { createFileRoute } from "@tanstack/react-router";

// Tells the portal's pages whether the Legal move is switched over
// (LEGAL_LIVE=true): then every Legal screen runs here for everyone.
export const Route = createFileRoute("/api/legal-live")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ live: /^\s*(true|1|yes|on)\s*$/i.test(process.env.LEGAL_LIVE ?? "") }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
    },
  },
});
