// Ported from the Legal app (family-law-floater/src/components/sales-call/sales-call-summary.tsx). Re-run the port script to refresh.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { getSalesCallSummaryFn } from "@/legal/bridge/call-review";
import type { PreviousCall } from "@/legal/lib/call-review";
import type { SalesCallSummary } from "@/legal/lib/sales-call-summary";

const OUTCOMES = {
  booked: "Booked during this call",
  not_booked: "Not booked during this call",
  no_conversation: "No conversation",
  unclear: "Booking outcome not confirmed in this call",
};
const DATE_STATUS = { agreed: "Agreed", proposed: "Proposed", mentioned: "Mentioned" };

function Detail({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{value || empty}</dd>
    </div>
  );
}

export function SalesCallSummaryContent({ summary }: { summary: SalesCallSummary }) {
  return (
    <>
      <p className="text-sm font-semibold">{OUTCOMES[summary.outcome.status]}</p>
      <dl className="mt-4 space-y-4">
        {summary.outcome.status === "not_booked" || summary.outcome.status === "unclear" ? (
          <Detail
            label="Why they didn’t book"
            value={summary.notBookedReason?.text ?? null}
            empty="No reason confirmed in this call."
          />
        ) : null}
        <Detail
          label="What the client said"
          value={summary.clientSaid?.text ?? null}
          empty="No booking decision stated in this call."
        />
        <Detail
          label="What they’re waiting for"
          value={summary.waitingFor?.text ?? null}
          empty="Not stated in this call."
        />
        <Detail
          label="Agreed next step"
          value={summary.nextStep?.text ?? null}
          empty="No next step confirmed in this call."
        />
        <div>
          <dt className="text-xs font-semibold text-muted-foreground">Dates discussed</dt>
          <dd className="mt-1 text-sm leading-6">
            {summary.datesDiscussed.length ? (
              <ul className="space-y-2">
                {summary.datesDiscussed.map((date, index) => (
                  <li key={index} className="break-words">
                    <span className="font-medium">{DATE_STATUS[date.status]}: </span>
                    {date.text}
                  </li>
                ))}
              </ul>
            ) : (
              "No date or time stated in this call."
            )}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Summarised from this call’s transcript. Check the recording for exact wording.
      </p>
    </>
  );
}

export function SalesCallSummaryPanel({ call, leadId }: { call: PreviousCall; leadId: string }) {
  const getSummary = useServerFn(getSalesCallSummaryFn);
  const result = useQuery({
    queryKey: ["sales-call-summary", leadId, call.id, call.transcript],
    queryFn: () => getSummary({ data: { leadId, callId: call.id } }),
    enabled: Boolean(call.transcript),
    staleTime: Infinity,
    retry: false,
  });
  return (
    <section
      aria-label="Sales follow-up"
      className="rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <h4 className="mb-3 text-sm font-semibold text-primary">Sales follow-up</h4>
      {result.data ? (
        <SalesCallSummaryContent summary={result.data} />
      ) : (
        <>
          {call.transcript && result.isPending ? (
            <p role="status" className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              Preparing booking reasons, next steps and dates from this call…
            </p>
          ) : result.isError ? (
            <div role="alert" className="mb-3 space-y-2">
              <p className="text-sm">
                Couldn’t prepare the sales follow-up. You can still review the saved summary,
                transcript and recording.
              </p>
              <Button variant="outline" size="sm" onClick={() => void result.refetch()}>
                <RefreshCw className="mr-2 size-4" />
                Retry sales summary
              </Button>
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              A transcript is needed to identify the booking reason and dates discussed. Check the
              recording and saved notes below.
            </p>
          )}
          <dl className="space-y-3">
            {call.outcome ? (
              <Detail label="Saved call outcome" value={call.outcome} empty="" />
            ) : null}
            {call.outcome !== "Booked" && call.noSaleReasons.length ? (
              <Detail
                label="Saved reasons for not booking"
                value={call.noSaleReasons.join("; ")}
                empty=""
              />
            ) : null}
            {call.nextAction ? (
              <Detail label="Saved next step" value={call.nextAction} empty="" />
            ) : null}
            {call.followUpDate || call.followUpTime ? (
              <Detail
                label="Saved follow-up date / time"
                value={[call.followUpDate, call.followUpTime].filter(Boolean).join(" · ")}
                empty=""
              />
            ) : null}
          </dl>
        </>
      )}
    </section>
  );
}
