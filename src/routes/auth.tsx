import { createFileRoute, redirect } from "@tanstack/react-router";

// Legal Group's sign-in address (boldfamilylaw.com.au/auth) now opens the portal sign-in.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login" as never });
  },
});
