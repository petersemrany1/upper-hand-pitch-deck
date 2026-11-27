// Ported from the Legal app (family-law-floater/src/routes/_authenticated/transcripts.tsx). Re-run the port script to refresh.
import { useState } from "react";
import { Link } from "@/legal/runtime/router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowLeft, FileText } from "lucide-react";
import { ClientFinder } from "@/legal/components/sales-call/client-finder";
import { Button } from "@/legal/components/ui/button";
import { getClientTranscriptsFn } from "@/legal/bridge/call-review";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { TranscriptPage as LegalPage };
export const Route = legalRoute({
  validateSearch: (search: Record<string, unknown>): { lead?: string; q?: string } => {
    const id = z.string().uuid().safeParse(search["lead"]);
    return {
      ...(id.success ? { lead: id.data } : {}),
      ...(typeof search["q"] === "string" && search["q"].trim()
        ? { q: search["q"].trim().slice(0, 100) }
        : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Client transcripts — Legal Group Portal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TranscriptPage,
});

function TranscriptPage() {
  const { lead, q } = Route.useSearch();
  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-2xl font-semibold">Client transcripts</h1>
        {lead ? (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/my-recordings" search={{ biz: "legal", ...(q ? { q } : {}) } as never}>
                <ArrowLeft className="mr-2 size-4" /> Find another client
              </Link>
            </Button>
            <ClientTranscripts key={lead} leadId={lead} />
          </>
        ) : (
          <section className="overflow-hidden rounded-xl border">
            <ClientFinder
              initialSearch={q ?? ""}
              renderAction={(client) => (
                <Button asChild size="sm" variant="outline">
                  <Link to="/my-recordings" search={{ biz: "legal", ...({ lead: client.leadId }) } as never}>
                    <FileText className="mr-2 size-4" /> Read transcripts
                  </Link>
                </Button>
              )}
            />
          </section>
        )}
      </div>
    </main>
  );
}

const callDate = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Australia/Sydney",
});

function ClientTranscripts({ leadId }: { leadId: string }) {
  const getTranscripts = useServerFn(getClientTranscriptsFn);
  const [selected, setSelected] = useState<string>();
  const { user } = Route.useRouteContext();
  const query = useInfiniteQuery({
    queryKey: ["client-transcripts", user.id, leadId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getTranscripts({ data: { leadId, offset: pageParam } }),
    getNextPageParam: (page) => page.nextOffset,
    retry: false,
  });
  if (query.isPending) return <p role="status">Loading transcripts…</p>;
  if (!query.data || (query.isError && !query.isFetchNextPageError))
    return (
      <div role="alert">
        <p>Couldn’t open this client’s transcripts. Check access or try again.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  const seen = new Set<string>();
  const calls = query.data.pages
    .flatMap((page) => page.calls)
    .filter((call) => {
      if (seen.has(call.key)) return false;
      seen.add(call.key);
      return true;
    });
  const current = calls.find((call) => call.key === selected) ?? calls[0];
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{query.data.pages[0]?.name}</h2>
      {current ? (
        <>
          <label className="block text-sm font-medium">
            Call date (Sydney time)
            <select
              className="mt-2 block w-full rounded-md border bg-background p-2.5"
              value={current.key}
              onChange={(event) => setSelected(event.target.value)}
            >
              {calls.map((call) => (
                <option key={call.key} value={call.key}>
                  {callDate.format(new Date(call.createdAt))}
                  {call.previousEnquiry ? " · Earlier enquiry" : ""}
                </option>
              ))}
            </select>
          </label>
          <article
            aria-label="Full call transcript"
            className="rounded-xl border bg-card p-4 sm:p-6"
          >
            <h3 className="mb-3 font-semibold">Full transcript</h3>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {current.transcript}
            </p>
          </article>
        </>
      ) : (
        <p>No saved transcript for this client yet.</p>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load older transcripts"}
        </Button>
      )}
      {query.isFetchNextPageError && (
        <p role="alert">Couldn’t load older transcripts. Try again.</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        Refresh transcripts
      </Button>
    </section>
  );
}
