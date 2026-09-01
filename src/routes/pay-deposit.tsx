import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy payment path. All patient links now point at /squarepayment; links
 * already sent by SMS keep working via this redirect.
 */
export const Route = createFileRoute("/pay-deposit")({
  validateSearch: (search: Record<string, unknown>): { lead?: string; t?: string } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/squarepayment", search });
  },
  component: () => null,
});
