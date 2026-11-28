// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/ad-briefing-voice.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/ad-briefing-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        try {
          const { handleBriefingWebhook } = await import("@/legal/lib/ad-briefing.server");
          return await handleBriefingWebhook(request);
        } catch {
          // Never log the private report, transcripts, auth values or caller number.
          console.error("[ad-briefing] voice request failed");
          return new Response(
            "<Response><Say>The briefing is unavailable. Please check your written report.</Say><Hangup/></Response>",
            { status: 200, headers: { "content-type": "text/xml", "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
