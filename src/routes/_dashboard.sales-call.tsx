import { createFileRoute } from "@tanstack/react-router";
import { ConversationProvider } from "@elevenlabs/react";
import { SalesCallPortal } from "@/components/SalesCallPortal";

function SalesCallRoute() {
  return (
    <ConversationProvider>
      <SalesCallPortal />
    </ConversationProvider>
  );
}

export const Route = createFileRoute("/_dashboard/sales-call")({
  component: SalesCallRoute,
  validateSearch: (search: Record<string, unknown>): { leadId?: string; phone?: string } => {
    const leadId = typeof search.leadId === "string" ? search.leadId : undefined;
    const phone = typeof search.phone === "string" ? search.phone : undefined;
    return { ...(leadId ? { leadId } : {}), ...(phone ? { phone } : {}) };
  },
});
