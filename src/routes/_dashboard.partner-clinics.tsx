import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/partner-clinics")({
  head: () => ({ meta: [{ title: "Partner Clinics" }] }),
});
