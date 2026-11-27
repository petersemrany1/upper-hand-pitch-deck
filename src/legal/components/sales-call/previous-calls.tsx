// Ported from the Legal app (family-law-floater/src/components/sales-call/previous-calls.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { Link } from "@/legal/runtime/router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, History, Loader2, Play, RefreshCw } from "lucide-react";

import { Button } from "@/legal/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/legal/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/legal/components/ui/tabs";
import { getCallRecordingFn, getCallReviewFn } from "@/legal/bridge/call-review";
import {
  callStatusLabel,
  initialPreviousCall,
  mergePreviousCalls,
  type CallReviewPage,
  type PreviousCall,
} from "@/legal/lib/call-review";
import { formatDuration } from "@/legal/lib/sales-call";
import { cn } from "@/legal/lib/utils";
import { SalesCallSummaryPanel } from "./sales-call-summary";

function callTime(value: string): string {
  return new Date(value).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
}

function RecordingPlayer({ leadId, callId }: { leadId: string; callId: string }) {
  const getRecording = useServerFn(getCallRecordingFn);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lifetime = useRef<{ active: boolean; url: string | null }>({ active: true, url: null });

  useEffect(() => {
    const current = { active: true, url: null as string | null };
    lifetime.current = current;
    return () => {
      current.active = false;
      if (current.url) URL.revokeObjectURL(current.url);
    };
  }, []);

  const load = async () => {
    const current = lifetime.current;
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRecording({ data: { leadId, callId } });
      if (!response.ok) throw new Error("Recording unavailable");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Empty recording");
      if (!current.active) return;
      if (current.url) URL.revokeObjectURL(current.url);
      current.url = URL.createObjectURL(blob);
      setSource(current.url);
    } catch {
      if (current.active) setError("Couldn’t load the recording. Please try again.");
    } finally {
      if (current.active) setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold">Call recording</p>
      {source ? (
        <audio
          controls
          preload="metadata"
          src={source}
          className="h-10 w-full"
          aria-label="Previous call recording"
          onError={() => {
            setSource(null);
            setError("This recording couldn’t be played. Please retry.");
          }}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Play className="mr-2 size-4" />
          )}
          {loading ? "Loading recording…" : error ? "Retry recording" : "Load recording"}
        </Button>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ClientNotes({ notes }: { notes: CallReviewPage["notes"] }) {
  return (
    <section className="space-y-3" aria-label="Saved client notes">
      <div>
        <h3 className="text-sm font-semibold">Saved client notes</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These may cover more than one conversation.
        </p>
      </div>
      {notes.length ? (
        notes.map((note) => (
          <div key={`${note.leadId}:${note.kind ?? "legacy"}`} className="rounded-xl border p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {note.kind === "rep" ? "Rep notes" : "Saved summary / earlier notes"}
            </p>
            {note.previousEnquiry ? (
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Earlier enquiry</p>
            ) : null}
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{note.body}</p>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No client notes saved yet.</p>
      )}
    </section>
  );
}

function CallDetail({
  call,
  leadId,
  notes,
}: {
  call: PreviousCall;
  leadId: string;
  notes: CallReviewPage["notes"];
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Call date · Sydney time</p>
        <h3 className="text-base font-semibold">
          <time dateTime={call.createdAt}>{callTime(call.createdAt)}</time>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {call.direction === "inbound" ? "Incoming call" : "Outgoing call"} ·{" "}
          {callStatusLabel(call.status)}
          {call.duration != null ? ` · ${formatDuration(call.duration)}` : ""}
          {call.leadId !== leadId ? " · Earlier enquiry" : ""}
        </p>
      </div>
      {call.hasRecording ? (
        <RecordingPlayer leadId={leadId} callId={call.id} />
      ) : (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          No recording available for this call.
        </p>
      )}
      <Tabs defaultValue="summary">
        <TabsList className="mb-3 grid w-full grid-cols-2">
          <TabsTrigger value="summary">Summary & notes</TabsTrigger>
          <TabsTrigger value="transcript">Full transcript</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="space-y-5">
          <SalesCallSummaryPanel call={call} leadId={leadId} />
          <section>
            <h4 className="mb-2 text-sm font-semibold">What was discussed</h4>
            {call.summary ? (
              <>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{call.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saved call summary. Check the transcript or recording for the exact wording.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No summary saved for this call.{" "}
                {call.transcript
                  ? "Open Full transcript to read what was said."
                  : "Use the recording or client notes below."}
              </p>
            )}
          </section>
          <ClientNotes notes={notes} />
        </TabsContent>
        <TabsContent value="transcript">
          {call.transcript ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{call.transcript}</p>
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              <FileText className="mb-2 size-5" />
              No transcript is available for this call yet.{" "}
              {call.hasRecording
                ? "You can listen to the recording above."
                : "Check Summary & notes for any saved context."}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewBody({ leadId }: { leadId: string }) {
  const getReview = useServerFn(getCallReviewFn);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const history = useInfiniteQuery({
    queryKey: ["previous-call-review", leadId],
    queryFn: ({ pageParam }) => getReview({ data: { leadId, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 0,
  });
  const calls = mergePreviousCalls(history.data?.pages.flatMap((page) => page.calls) ?? []);
  const notes = history.data?.pages[0]?.notes ?? [];
  const selected = calls.find((call) => call.id === selectedId) ?? initialPreviousCall(calls);

  if (history.isPending)
    return (
      <div
        role="status"
        className="flex flex-1 items-center justify-center gap-2 p-10 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" />
        Loading previous calls…
      </div>
    );
  if (history.isError && !history.data)
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <p className="text-sm">Couldn’t load this client’s previous calls.</p>
        <Button variant="outline" onClick={() => void history.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Try again
        </Button>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
      <nav
        aria-label="Previous calls"
        className="max-h-44 shrink-0 overflow-y-auto border-b bg-muted/20 p-3 sm:max-h-none sm:w-56 sm:border-r sm:border-b-0"
      >
        <p className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
          Newest first · Sydney time
        </p>
        <div className="space-y-1">
          {calls.map((call) => (
            <button
              type="button"
              key={call.id}
              aria-pressed={selected?.id === call.id}
              className={cn(
                "w-full rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected?.id === call.id && "border-primary/30 bg-primary/5",
              )}
              onClick={() => setSelectedId(call.id)}
            >
              <span className="block text-xs font-semibold">{callTime(call.createdAt)}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {callStatusLabel(call.status)}
                {call.duration != null ? ` · ${formatDuration(call.duration)}` : ""}
              </span>
              {call.summary || call.transcript || call.hasRecording ? (
                <span className="mt-1.5 block text-[11px] text-primary">
                  {[
                    call.summary && "Summary",
                    call.transcript && "Transcript",
                    call.hasRecording && "Recording",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
            </button>
          ))}
          {history.hasNextPage ? (
            <Button
              size="sm"
              variant="ghost"
              className="w-full"
              disabled={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {history.isFetchingNextPage ? "Loading…" : "Load older calls"}
            </Button>
          ) : null}
          {history.isError ? (
            <p role="alert" className="px-2 text-xs text-destructive">
              Couldn’t load more calls. Please retry.
            </p>
          ) : null}
          {!calls.length ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No previous calls available.</p>
          ) : null}
        </div>
      </nav>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {selected ? (
          <CallDetail key={selected.id} call={selected} leadId={leadId} notes={notes} />
        ) : (
          <ClientNotes notes={notes} />
        )}
      </div>
    </div>
  );
}

/** Opens from the client header, directly beside Call. Key by lead to stop playback on navigation. */
export function PreviousCallsButton({
  leadId,
  clientName,
}: {
  leadId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button asChild type="button" size="sm" variant="outline">
        <Link to="/transcripts" search={{ lead: leadId }}>
          <FileText className="mr-1.5 size-4" /> Transcripts
        </Link>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <History className="mr-1.5 size-4" />
            Review previous calls
          </Button>
        </DialogTrigger>
        <DialogContent className="flex h-[85dvh] max-h-[860px] w-[calc(100%_-_1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
            <DialogTitle>Previous calls — {clientName}</DialogTitle>
            <DialogDescription>
              Review what was discussed before you call this client.
            </DialogDescription>
          </DialogHeader>
          {open ? <ReviewBody key={leadId} leadId={leadId} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
