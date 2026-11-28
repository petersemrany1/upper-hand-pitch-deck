import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's /ad-briefing address opens the same Legal screen inside the portal.
export const Route = createFileRoute("/(legal-links)/ad-briefing")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$" as never, params: { _splat: "ad-briefing" } as never });
  },
});
