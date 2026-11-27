// Ported from the Legal app (family-law-floater/src/components/sales-call/client-review.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { fetchLead } from "@/legal/lib/sales-call";
import { leadName, statusMeta } from "@/legal/lib/client-leads";
import { PreviousCallsButton } from "./previous-calls";
import { ClientAssetReview } from "./client-assets";

/** Uses the signed-in user's existing read permissions, without a calling session or claim. */
export function ClientReview({
  leadId,
  onBack,
  onOpenCalling,
}: {
  leadId: string;
  onBack: () => void;
  onOpenCalling: () => void;
}) {
  const query = useQuery({
    queryKey: ["client-review", leadId],
    queryFn: () => fetchLead(leadId),
    retry: false,
  });
  const lead = query.data;
  return (
    <main className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" /> Back to Sales Call
        </Button>
        <header className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Eye className="size-4" /> Client review · Viewing only
          </p>
          <h1 className="text-2xl font-semibold">{lead ? leadName(lead) : "Client review"}</h1>
          <p className="text-sm text-muted-foreground">
            You can review this client while another caller works with them. Reviewing does not take
            over their call or change the assigned advisor.
          </p>
        </header>
        {query.isPending ? (
          <p role="status">Loading client…</p>
        ) : query.isError || !lead ? (
          <div className="space-y-3 rounded-xl border p-5">
            <p role="alert">
              {query.isError
                ? "Couldn’t load this client. Please try again."
                : "This client is unavailable or you don’t have access to view them."}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <PreviousCallsButton key={lead.id} leadId={lead.id} clientName={leadName(lead)} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                <RefreshCw className="mr-2 size-4" /> Refresh details
              </Button>
            </div>
            <dl className="grid gap-5 rounded-xl border p-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Location on file</dt>
                <dd className="mt-1 font-medium">{lead.city || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="mt-1 font-medium">{statusMeta(lead.status).label}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Appointment on file</dt>
                <dd className="mt-1 font-medium">
                  {lead.booking_date
                    ? `${lead.booking_date.split("-").reverse().join("/")}${lead.booking_time ? ` at ${lead.booking_time}` : ""}`
                    : "No appointment recorded"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Handover</dt>
                <dd className="mt-1 font-medium">{lead.handover_sent_at ? "Sent" : "Not sent"}</dd>
              </div>
            </dl>
            <ClientAssetReview key={lead.id} leadId={lead.id} />
            <section className="rounded-xl border p-5">
              <h2 className="mb-3 font-semibold">Rep notes</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {lead.rep_notes || "No rep notes saved yet."}
              </p>
            </section>
            <section className="rounded-xl border p-5">
              <h2 className="mb-3 font-semibold">Saved summary / earlier notes</h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {lead.call_notes || "No client notes saved yet."}
              </p>
            </section>
            <div className="space-y-2 border-t pt-5">
              <Button variant="outline" onClick={onOpenCalling}>
                Open calling workspace
              </Button>
              <p className="text-xs text-muted-foreground">
                Calling is available once the other caller releases this client.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
