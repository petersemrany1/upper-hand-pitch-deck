// Ported from the Legal app (family-law-floater/src/routes/api/public/conflict.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";

function page(title: string, message: string, tone: "ok" | "warn" | "error"): Response {
  const colour = tone === "ok" ? "#15803d" : tone === "warn" ? "#b45309" : "#b91c1c";
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title}</title></head><body style="margin:0;background:#f1f5f9;font:400 16px/1.6 Arial,sans-serif;color:#0f172a">` +
      `<div style="max-width:520px;margin:12vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;text-align:center">` +
      `<h1 style="margin:0 0 12px;font-size:20px;color:${colour}">${title}</h1><p style="margin:0;color:#475569">${message}</p></div></body></html>`,
    { status: tone === "error" ? 400 : 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/legal/conflict")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const url = new URL(request.url);
        const appointmentId = url.searchParams.get("apt") ?? "";
        const action = url.searchParams.get("action") ?? "";
        const signature = url.searchParams.get("sig") ?? "";

        const { verifyConflictLink, applyConflictDecision } = await import("@/legal/lib/handover.server");
        if (!appointmentId || !verifyConflictLink(appointmentId, action, signature)) {
          return page("Link not valid", "This link has expired or was altered. Please contact us.", "error");
        }

        const result = await applyConflictDecision(appointmentId, action as "flag" | "clear");
        if (!result.ok) {
          return page("Something went wrong", result.error ?? "Please contact us.", "error");
        }
        return action === "flag"
          ? page("Conflict flagged", "Thanks — our team has been notified and will be in touch shortly.", "warn")
          : page("Conflict check cleared", "Thanks — the consultation stays as booked.", "ok");
      },
    },
  },
});
