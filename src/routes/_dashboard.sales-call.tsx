import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/sales-call")({
  validateSearch: (search: Record<string, unknown>): { leadId?: string; phone?: string } => {
    const leadId = typeof search.leadId === "string" ? search.leadId : undefined;
    const phone = typeof search.phone === "string" ? search.phone : undefined;
    return { ...(leadId ? { leadId } : {}), ...(phone ? { phone } : {}) };
  },
});
