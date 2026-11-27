import { createFileRoute, redirect } from "@tanstack/react-router";

// The Chase Queue now lives inside To Do.
export const Route = createFileRoute("/_dashboard/chase-queue")({
  beforeLoad: () => {
    throw redirect({ to: "/todo" as never, replace: true });
  },
});
