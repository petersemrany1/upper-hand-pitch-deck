import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/clinic-portal")({
  head: () => ({ meta: [{ title: "Clinic Partner Portal" }] }),
});
