import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's home address (boldfamilylaw.com.au/dashboard) opens the portal on its Legal side.
export const Route = createFileRoute("/(legal-links)/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/legal/$" as never, params: { _splat: "dashboard" } as never });
  },
});
