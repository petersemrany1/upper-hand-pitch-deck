import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's /firm-cold-calling address opens the same Legal screen inside the portal.
export const Route = createFileRoute("/(legal-links)/firm-cold-calling")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$" as never, params: { _splat: "firm-cold-calling" } as never });
  },
});
