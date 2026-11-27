// Ported from the Legal app (family-law-floater/src/components/sales-call/call-history.tsx). Re-run the port script to refresh.
import { RefreshCw } from "lucide-react";
import { Button } from "@/legal/components/ui/button";
import { callStatusLabel } from "@/legal/lib/call-review";
import { formatDuration, type CallRecord } from "@/legal/lib/sales-call";

export function CallHistory({
  calls,
  loading,
  error,
  refreshing,
  onRefresh,
}: {
  calls: CallRecord[];
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  onRefresh?: (() => void) | undefined;
}) {
  return (
    <section className="mt-4 pb-4" aria-label="Call history">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Call history</h3>
        {onRefresh ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={refreshing}
            onClick={onRefresh}
            aria-label="Refresh call history"
          >
            <RefreshCw className={`mr-1.5 size-3 ${refreshing ? "animate-spin" : ""}`} />
            {error ? "Retry" : "Refresh"}
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p role="status" className="mt-2 text-[13px] text-muted-foreground">
          Loading call history…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-destructive">
          Couldn’t refresh call history. Please retry.
        </p>
      ) : null}
      {!loading && !error && calls.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">No calls logged yet.</p>
      ) : null}
      {calls.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {calls.map((call) => (
            <li
              key={call.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-[12px]"
            >
              <time dateTime={call.created_at}>
                {new Date(call.created_at).toLocaleString("en-AU", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Australia/Sydney",
                })}
              </time>
              <span className="text-right text-muted-foreground">
                {call.direction === "inbound" ? "Incoming · " : ""}
                {callStatusLabel(call.call_status)}
                {call.duration_seconds != null ? ` · ${formatDuration(call.duration_seconds)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
