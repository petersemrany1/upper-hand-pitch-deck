import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/demo-clinic")({
  head: () => ({ meta: [{ title: "Demo Clinic · Partner Portal" }, { name: "robots", content: "noindex, nofollow" }] }),
});
