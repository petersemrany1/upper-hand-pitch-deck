import { createFileRoute, redirect } from "@tanstack/react-router";

// Clinic Meta Leads now lives in the CRM (CRM → Clinic Meta Leads).
export const Route = createFileRoute("/_dashboard/sales-test-leads")({
  beforeLoad: () => {
    throw redirect({ to: "/crm", search: { tab: "meta-leads" } as never });
  },
});
