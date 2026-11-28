import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Legal move: Lovable's scheduler rings this every few minutes (Legal timed job
// "firm-booking-follow-ups"). It passes the call on to the Legal doorbell, signed with this app's
// internal secret.
export const Route = createFileRoute("/api/public/legal-cron/firm-booking-follow-ups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rejection = await authenticateCronRequest(request);
        if (rejection) return rejection;
        const secret = process.env.INTERNAL_FUNCTION_SECRET;
        if (!secret) return new Response("INTERNAL_FUNCTION_SECRET is not configured", { status: 500 });
        const target = new URL("/api/public/hooks/send-reminders", request.url);
        const res = await fetch(target, {
          method: "POST",
          headers: { "content-type": "application/json", "x-internal-secret": secret, "x-booking-follow-ups-only": "true" },
          body: "{}",
        });
        return new Response(await res.text(), { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "text/plain" } });
      },
    },
  },
});
