import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo-clinic")({
  validateSearch: (search: Record<string, unknown>): { from?: "partner-view" } => search.from === "partner-view" ? { from: "partner-view" } : {},
  head: () => ({ meta: [{ title: "Demo Clinic · Partner Portal" }, { name: "robots", content: "noindex, nofollow" }] }),
});
