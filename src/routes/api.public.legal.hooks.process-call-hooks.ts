// Ported from the Legal app (family-law-floater/src/routes/api/public/hooks/process-call-hooks.ts). Re-run the port script to refresh.
import { legalHookOff } from "@/legal/runtime/hooks";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/legal/hooks/process-call-hooks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const legalOff = legalHookOff();
        if (legalOff) return legalOff;
        const { callHookWorkerAuthorized } = await import("@/legal/lib/call-hook-worker-auth.server");
        if (!(await callHookWorkerAuthorized(request.headers.get("x-internal-secret"))))
          return new Response("Unauthorized", { status: 401 });
        try {
          const { runCallHookWorker } = await import("@/legal/lib/call-hooks.server");
          const result = await runCallHookWorker();
          return Response.json(result, { status: result.status === "unavailable" ? 503 : 200 });
        } catch {
          // Never put transcripts, provider output or client details in scheduler logs.
          return Response.json({ status: "failed" }, { status: 500 });
        }
      },
    },
  },
});
