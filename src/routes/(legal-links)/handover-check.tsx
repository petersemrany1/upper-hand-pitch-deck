import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's /handover-check address opens the same Legal screen inside the portal.
export const Route = createFileRoute("/(legal-links)/handover-check")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$" as never, params: { _splat: "handover-check" } as never });
  },
});
