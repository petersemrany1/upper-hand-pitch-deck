import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});
