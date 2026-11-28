import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's /firms address opens the same Legal screen inside the portal.
export const Route = createFileRoute("/(legal-links)/firms")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$" as never, params: { _splat: "firms" } as never });
  },
});
