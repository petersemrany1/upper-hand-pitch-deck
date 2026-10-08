import { createFileRoute } from "@tanstack/react-router";
import { partnerViewSearch } from "@/lib/partner-view";

export const Route = createFileRoute("/clinic-portal")({
  validateSearch: partnerViewSearch,
  head: () => ({ meta: [{ title: "Clinic Partner Portal" }] }),
});
