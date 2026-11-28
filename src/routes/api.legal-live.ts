import { createFileRoute } from "@tanstack/react-router";

// Tells the portal's pages whether the Legal move is switched over
// (LEGAL_LIVE=true): then every Legal screen runs here for everyone.
export const Route = createFileRoute("/api/legal-live")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ live: process.env.LEGAL_LIVE === "true" }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
    },
  },
});
