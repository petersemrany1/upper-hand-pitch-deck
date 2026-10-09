import { createLazyFileRoute } from "@tanstack/react-router";
import { DemoClinicPortal } from "@/components/DemoClinicPortal";
export const Route = createLazyFileRoute("/demo-clinic")({ component: DemoClinicPage });

function DemoClinicPage() {
  const { from } = Route.useSearch();
  return <DemoClinicPortal partnerView={from === "partner-view"} />;
}
