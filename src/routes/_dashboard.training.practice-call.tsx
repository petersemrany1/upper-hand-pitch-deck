import { createFileRoute } from "@tanstack/react-router";
import { SalesCallPortal } from "./_dashboard.sales-call";

export const Route = createFileRoute("/_dashboard/training/practice-call")({
  component: PracticeCallPageWrapper,
  head: () => ({ meta: [{ title: "Practice Call" }] }),
});

function PracticeCallPageWrapper() {
  return <SalesCallPortal practiceMode />;
}
