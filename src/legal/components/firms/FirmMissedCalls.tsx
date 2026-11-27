// Ported from the Legal app (family-law-floater/src/components/firms/FirmMissedCalls.tsx). Re-run the port script to refresh.
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhoneMissed } from "lucide-react";
import { getMissedFirmCalls } from "@/legal/lib/firm-conversations.functions";
import { displayName, formatDateTime, type FirmApplication } from "@/legal/lib/firm-applications";
import type { FirmMissedCallCursor } from "@/legal/lib/firm-callbacks";
import { Button } from "@/legal/components/ui/button";

export function FirmMissedCalls({
  applications,
  search,
  onSelect,
}: {
  applications: FirmApplication[];
  search: string;
  onSelect: (id: string) => void;
}) {
  const getCalls = useServerFn(getMissedFirmCalls);
  const history = useInfiniteQuery({
    queryKey: ["firm-missed-calls"],
    initialPageParam: undefined as FirmMissedCallCursor | undefined,
    queryFn: ({ pageParam }) => getCalls({ data: pageParam ? { before: pageParam } : {} }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 5000,
  });
  const calls = history.data?.pages.flatMap((page) => page.calls) ?? [];
  const needle = search.trim().toLowerCase();
  const visible = calls.filter((call) => {
    const app = applications.find((firm) => firm.id === call.application_id);
    return !needle || `${app ? displayName(app) : ""} ${call.phone}`.toLowerCase().includes(needle);
  });
  return (
    <section className="mx-auto max-w-4xl p-4 sm:p-6" aria-label="Missed firm calls">
      <h2 className="mb-1 font-semibold">Missed calls</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Shared with your team, including earlier calls and voicemails.
      </p>
      {history.isLoading && <p>Loading missed calls…</p>}
      {history.error && (
        <p role="alert" className="mb-3 text-destructive">
          Could not load missed calls.{" "}
          <button className="underline" onClick={() => void history.refetch()}>
            Try again
          </button>
        </p>
      )}
      {visible.map((call) => {
        const app = applications.find((firm) => firm.id === call.application_id);
        return (
          <button
            key={call.id}
            onClick={() => onSelect(call.application_id)}
            className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/40"
          >
            <PhoneMissed size={18} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{app ? displayName(app) : call.phone}</p>
              <p className="text-sm text-muted-foreground">
                {call.phone} ·{" "}
                {call.status === "voicemail"
                  ? "Voicemail"
                  : call.status === "declined"
                    ? "Declined"
                    : "Missed call"}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(call.created_at)}</p>
            </div>
            {!call.reviewed_at && (
              <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                New
              </span>
            )}
          </button>
        );
      })}
      {!history.isLoading && !history.error && !visible.length && (
        <p className="py-8 text-center text-muted-foreground">
          {needle ? "No loaded missed calls match your search." : "No missed calls."}
        </p>
      )}
      {history.hasNextPage && (
        <Button
          variant="outline"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          {history.isFetchingNextPage ? "Loading…" : "Load earlier missed calls"}
        </Button>
      )}
    </section>
  );
}
