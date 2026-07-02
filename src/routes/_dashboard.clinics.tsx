import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/clinics")({
  validateSearch: (search: Record<string, unknown>): { clinic?: string } => ({
    clinic: typeof search.clinic === "string" ? search.clinic : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Clinics CRM" },
      { name: "description", content: "Manage hair transplant clinic leads." },
    ],
  }),
});