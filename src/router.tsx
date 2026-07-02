import { createRouter, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { routeTree } from "./routeTree.gen";
import { reportError } from "@/lib/error-reporting";
import { ErrorState } from "@/components/app/ErrorState";

if (typeof window !== "undefined" && window.location.pathname === "/_dashboard/sales-call") {
  window.history.replaceState(null, "", `/sales-call${window.location.search}${window.location.hash}`);
}

function DefaultErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void reportError(
      "router-error-boundary",
      `${error?.name ?? "Error"}: ${error?.message ?? "(no message)"}`,
      { stack: error?.stack ?? null }
    );
  }, [error]);



  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <ErrorState
          title="Something went wrong"
          description="An unexpected error occurred. It's been logged — try again, or head home."
          onRetry={() => {
            router.invalidate();
            reset();
          }}
        />
        {error.message && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <a
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
