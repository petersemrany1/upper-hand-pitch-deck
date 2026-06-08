import { createLazyFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";
import { supabase } from "@/integrations/supabase/client";

function SalesCallRoute() {
  return (
    <ConversationProvider>
      <SalesCallPortal />
    </ConversationProvider>
  );
}

function SalesCallErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    try {
      void supabase.from("error_logs").insert({
        function_name: "sales-call-error-boundary",
        error_message: `${error?.name ?? "Error"}: ${error?.message ?? "(no message)"}`,
        context: {
          source: "frontend",
          stack: error?.stack ?? null,
          url: typeof window !== "undefined" ? window.location.href : null,
          loggedAt: new Date().toISOString(),
        },
      });
    } catch { /* noop */ }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-xl font-semibold text-foreground">Sales Call page crashed</h2>
      <pre className="mt-3 max-h-40 max-w-xl overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
        {error?.message || "Unknown error"}
      </pre>
      <button
        onClick={() => { router.invalidate(); reset(); }}
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

export const Route = createLazyFileRoute("/_dashboard/sales-call")({
  component: SalesCallRoute,
  errorComponent: SalesCallErrorComponent,
});
