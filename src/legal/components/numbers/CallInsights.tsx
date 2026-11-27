// Ported from the Legal app (family-law-floater/src/components/numbers/CallInsights.tsx). Re-run the port script to refresh.
import { useState, useEffect } from "react";
import { Link } from "@/legal/runtime/router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  History,
  MessageSquare,
  ArrowUpRight,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getCallHooks, getHookEvidence, processCallHooks } from "@/legal/lib/numbers-insights.functions";
import { HOOK_QUALIFYING_RULE, type HookListItem } from "@/legal/lib/call-hooks";
import { formatSydney } from "@/legal/lib/timezone";
import { qualifiedCallsCsv } from "@/legal/lib/call-hook-export";

type Filter = "insights" | "ready" | "all" | "pending" | "unknown" | "excluded" | "failed";
type View = "insights" | "ready" | "history";
const topicLabels: Record<string, string> = {
  funding: "Paying for legal help",
  property: "Property & assets",
  parenting: "Children & parenting",
  process: "The legal process",
  timing: "Timing & next steps",
  other: "Client concern",
};
function callLabel(item: HookListItem) {
  if (item.status === "ready") return "Ad idea ready";
  if (item.insight) return "Client concern found";
  if (item.recoverable) return "Recording ready to review";
  return {
    pending: "Waiting to review",
    processing: "Reviewing",
    unknown: "No ad idea yet",
    failed: "Couldn't finish",
    excluded: "Not used",
    duplicate: "Already reviewed",
    no_transcript: "No transcript available",
  }[item.status];
}
const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Australia/Sydney",
  }).format(new Date(value));
export function CallInsights({
  mode = "brain",
  onUseHook,
  onViewBrain,
}: {
  mode?: "brain" | "ideation";
  onUseHook?: (item: HookListItem) => void;
  onViewBrain?: () => void;
}) {
  const load = useServerFn(getCallHooks),
    process = useServerFn(processCallHooks);
  const [page, setPage] = useState(0),
    [view, setView] = useState<View>("ready"),
    [historyFilter, setHistoryFilter] = useState<Filter>("all");
  const filter = view === "history" ? historyFilter : view;
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [settledSearch, setSettledSearch] = useState("");
  const [outcome, setOutcome] = useState<"all" | "booked" | "did_not_proceed" | "follow_up">("all");
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSettledSearch(search);
      setPage(0);
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);
  const report = useQuery({
    queryKey: ["call-hooks", page, filter, settledSearch, outcome],
    queryFn: () => load({ data: { page, filter, search: settledSearch, outcome } }),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  const data = report.data;
  const [exporting, setExporting] = useState(false);
  const waiting = (data?.coverage.pending ?? 0) + (data?.recoverable ?? 0);
  const failed = data?.coverage.failed ?? 0;
  const switchView = (next: View) => {
    setView(next);
    setPage(0);
  };
  const refresh = () => report.refetch();
  async function exportQualified() {
    setExporting(true);
    try {
      const items: HookListItem[] = [];
      let expected: number | undefined;
      for (let page = 0; ; page++) {
        const batch = await load({ data: { page, filter: "ready" } });
        expected ??= batch.total;
        if (batch.total !== expected || page > 1000) throw new Error("Changed list");
        items.push(...batch.items);
        if (!batch.hasMore) break;
      }
      if (new Set(items.map((item) => item.callId)).size !== expected)
        throw new Error("Incomplete list");
      const url = URL.createObjectURL(
        new Blob([qualifiedCallsCsv(items)], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "qualified-client-call-hooks.csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`${items.length} qualified calls exported`);
    } catch {
      toast.error("The call list changed or could not load. Refresh, then try the export again.");
    } finally {
      setExporting(false);
    }
  }
  async function retry(item: HookListItem) {
    if (busy) return;
    setBusy(true);
    try {
      await process({ data: { callId: item.callId, regenerate: true } });
    } catch {
      toast.error("Couldn’t review this call. Please try again.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }
  return (
    <section className="insights-workspace call-insights" aria-label="Call insights">
      <div className="insights-intro">
        <div>
          <h2>
            {mode === "brain" ? "Learn from client calls." : "Start with a client-backed hook."}
          </h2>
          <p>
            {mode === "brain"
              ? "The one line worth testing, drawn from each real client conversation."
              : "Choose an evidence-checked opening, then write the middle and the close."}
          </p>
        </div>
        <button
          className="insights-button"
          disabled={report.isFetching}
          onClick={() => void refresh()}
          aria-label="Refresh call insights"
        >
          <RefreshCw size={15} aria-hidden="true" /> Refresh
        </button>
      </div>
      {report.error && (
        <div className="insights-notice" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Couldn’t load your call insights.</strong>
            <p>Try Refresh in a moment.</p>
          </div>
        </div>
      )}
      {report.isPending && (
        <div className="insights-empty" role="status">
          Loading your call insights…
        </div>
      )}
      {data && (
        <>
          <div className="call-review-bar">
            <p role="status" aria-live="polite">
              {data.automationActive ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <AlertCircle size={16} aria-hidden="true" />
              )}
              {!data.providerReady
                ? "Automatic review is temporarily unavailable. Saved hooks are still here."
                : !data.automationActive
                  ? "Automatic review is not running yet. Saved hooks are still here."
                  : waiting || data.coverage.processing
                    ? `Updating automatically · ${waiting + data.coverage.processing} calls to review`
                    : "Up to date · New conversations are added automatically"}
            </p>
          </div>
          {failed > 0 && (
            <p className="call-view-note">
              {failed} {failed === 1 ? "call needs" : "calls need"} another review. Other calls
              continue to be processed.
            </p>
          )}
          {mode === "brain" && (
            <div className="brain-summary" aria-label="Client research summary">
              <div>
                <strong>{data.coverage.ready}</strong>
                <span>hooks from qualified calls</span>
              </div>
              <div>
                <strong>{data.insightCount ?? 0}</strong>
                <span>calls with client concerns</span>
              </div>
              <div>
                <strong>{data.clientTotal ?? data.coverage.total}</strong>
                <span>client call records</span>
              </div>
            </div>
          )}
          <div className="call-navigation">
            {mode === "brain" ? (
              <>
                <div className="call-view-switch" role="group" aria-label="Choose client research">
                  <button aria-pressed={view === "ready"} onClick={() => switchView("ready")}>
                    <Sparkles size={16} aria-hidden="true" /> Hooks{" "}
                    <span>{data.coverage.ready}</span>
                  </button>
                  <button aria-pressed={view === "insights"} onClick={() => switchView("insights")}>
                    <MessageSquare size={16} aria-hidden="true" /> Client concerns{" "}
                    <span>{data.insightCount ?? 0}</span>
                  </button>
                </div>
                <button
                  className="insights-button call-history-button"
                  aria-pressed={view === "history"}
                  onClick={() => switchView("history")}
                >
                  <History size={15} aria-hidden="true" /> All client calls
                </button>
                {view === "ready" && data.coverage.ready > 0 && (
                  <button
                    className="numbers-button"
                    aria-label="Download qualified call list"
                    title="Download every ready hook and its source call"
                    disabled={exporting}
                    onClick={() => void exportQualified()}
                  >
                    <Download size={14} /> {exporting ? "Preparing…" : "Export list"}
                  </button>
                )}
              </>
            ) : (
              <span className="numbers-badge">
                {data.total} reviewed {data.total === 1 ? "hook" : "hooks"}
              </span>
            )}
          </div>
          {view === "history" ? (
            <div className="insights-toolbar call-history-toolbar">
              <label>
                Show calls
                <select
                  value={historyFilter}
                  onChange={(event) => {
                    setHistoryFilter(event.target.value as Filter);
                    setPage(0);
                  }}
                >
                  <option value="all">All calls</option>
                  <option value="pending">Waiting for review</option>
                  <option value="failed">Couldn’t finish</option>
                  <option value="unknown">Qualification unconfirmed</option>
                  <option value="excluded">Not used / no transcript</option>
                </select>
              </label>
              <p>
                {(data.clientTotal ?? data.coverage.total).toLocaleString()} client call records ·{" "}
                {(data.clientTranscribed ?? data.coverage.transcribed).toLocaleString()} with
                transcripts
              </p>
            </div>
          ) : null}
          <div className="insights-toolbar">
            <label className="insights-search call-library-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search hooks and client concerns</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hooks, concerns or clients"
                maxLength={200}
              />
            </label>
            <label>
              <span className="sr-only">Client outcome</span>
              <select
                aria-label="Client outcome"
                value={outcome}
                onChange={(e) => {
                  setOutcome(e.target.value as typeof outcome);
                  setPage(0);
                }}
              >
                <option value="all">All outcomes</option>
                <option value="booked">Booked</option>
                <option value="did_not_proceed">Not booked after a conversation</option>
                <option value="follow_up">Following up</option>
              </select>
            </label>
          </div>
          <div className={`insights-hook-list call-results-${view}`}>
            {data.items.map((item) => {
              const showIdea =
                view === "ready" || (view === "insights" && !item.insight && !!item.hook);
              return (
                <article className="insights-hook call-card" key={`${view}-${item.callId}`}>
                  <header className="call-card-heading">
                    <h3>
                      {view === "history"
                        ? callLabel(item)
                        : showIdea
                          ? mode === "brain"
                            ? item.clientName || "Qualified client call"
                            : "Opening hook"
                          : (topicLabels[item.theme ?? "other"] ?? "Client concern")}
                    </h3>
                    <time dateTime={item.createdAt}>{shortDate(item.createdAt)}</time>
                  </header>
                  {showIdea && mode === "brain" && (
                    <div className="call-client-meta">
                      <span className="numbers-badge positive">
                        {item.outcome === "booked" || item.successful
                          ? (item.bookingOutcome ?? "Booked")
                          : item.outcome === "did_not_proceed"
                            ? "Not booked"
                            : "Following up"}
                      </span>
                      <span>
                        {item.duration === null
                          ? "Duration unavailable"
                          : `${Math.floor(item.duration / 60)}m ${item.duration % 60}s call`}
                      </span>
                    </div>
                  )}
                  {showIdea && <span className="call-hook-label">The hook to test</span>}
                  <p className="call-takeaway">
                    {showIdea
                      ? item.hook
                      : (item.insight ?? (view === "history" ? item.reason : item.hook))}
                  </p>
                  {showIdea && item.barrier && (
                    <p className="call-barrier">
                      <strong>What held them back</strong>
                      {item.barrier}
                    </p>
                  )}
                  {showIdea && item.hook && (
                    <footer>
                      <span>Draft · Review before use</span>
                      {onUseHook && (
                        <button className="insights-button primary" onClick={() => onUseHook(item)}>
                          <ArrowUpRight size={14} />{" "}
                          {mode === "brain" ? "Use in Ideation" : "Use this hook"}
                        </button>
                      )}
                      <button
                        className="insights-button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.hook!);
                            toast.success("Hook copied");
                          } catch {
                            toast.error("Couldn’t copy. Select and copy the hook text.");
                          }
                        }}
                      >
                        <Copy size={14} aria-hidden="true" /> Copy hook
                      </button>
                    </footer>
                  )}
                  <HookTrace
                    item={item}
                    busy={busy || !data.providerReady}
                    showConcern={showIdea}
                    retry={() => void retry(item)}
                  />
                </article>
              );
            })}
          </div>
          {!data.items.length && (
            <div className="insights-empty">
              {view === "ready" ? (
                <Sparkles size={28} aria-hidden="true" />
              ) : (
                <MessageSquare size={28} aria-hidden="true" />
              )}
              <h3>
                {view === "insights"
                  ? "No client concerns yet"
                  : view === "ready"
                    ? "No qualified hooks yet"
                    : "No calls in this view"}
              </h3>
              <p>
                {view === "insights"
                  ? waiting
                    ? "New client concerns appear as calls are reviewed automatically."
                    : "Concerns will appear here when a client call supports a clear finding."
                  : view === "ready"
                    ? search || outcome !== "all"
                      ? "Try another search or show all outcomes."
                      : "Hooks appear automatically after genuine conversations over two minutes about family-law help in a city we serve."
                    : "Choose another option in Show calls."}
              </p>
              {view === "ready" && (
                <button
                  className="insights-button"
                  onClick={() => (mode === "ideation" ? onViewBrain?.() : switchView("insights"))}
                >
                  View client concerns
                </button>
              )}
            </div>
          )}
          {(page > 0 || data.hasMore) && (
            <div className="insights-pagination">
              <button
                className="insights-button"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page + 1} · {data.total} {view === "history" ? "calls" : "results"}
              </span>
              <button
                className="insights-button"
                disabled={!data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
          <details className="insights-definitions call-help">
            <summary>Which calls are included?</summary>
            <p>{HOOK_QUALIFYING_RULE}</p>
            <p>
              One hook per conversation, supported by what the client actually said. Booked clients
              and people who did not proceed both contribute. Hooks are drafts to test; each
              includes its original call evidence.
            </p>
            <p>
              Short calls, voicemail, test calls, firm outreach and enquiries outside our service
              area do not contribute. Missing recordings or unconfirmed client needs stay in All
              client calls.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
function HookTrace({
  item,
  busy,
  showConcern,
  retry,
}: {
  item: HookListItem;
  busy: boolean;
  showConcern: boolean;
  retry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const load = useServerFn(getHookEvidence);
  const evidence = useQuery({
    queryKey: ["hook-evidence", item.callId, item.generatedAt, item.status],
    queryFn: () => load({ data: { callId: item.callId } }),
    enabled: open,
  });
  return (
    <details
      className="insights-details call-evidence"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <ChevronDown size={15} aria-hidden="true" />{" "}
        {showConcern ? "Why this hook & call evidence" : "View call evidence"}
      </summary>
      <div className="call-evidence-body">
        {showConcern && item.insight && (
          <p>
            <strong>Client concern:</strong> {item.insight}
          </p>
        )}
        {evidence.isFetching && <p role="status">Loading call evidence…</p>}
        {evidence.error && (
          <div role="alert">
            <p>Couldn’t load this call’s evidence.</p>
            <button className="insights-button" onClick={() => void evidence.refetch()}>
              Try again
            </button>
          </div>
        )}
        {evidence.data && (
          <>
            {!evidence.data.current && (
              <p>This call needs a fresh review. Earlier evidence is hidden until then.</p>
            )}
            {evidence.data.evidence.map((e, i) => (
              <blockquote key={i}>
                <p>“{e.quote}”</p>
                <small>
                  Transcript line {e.line} · {e.claim.replace(/_/g, " ")}
                </small>
              </blockquote>
            ))}
            <details className="insights-transcript">
              <summary>Read full transcript</summary>
              <pre>{evidence.data.transcript || "No saved transcript."}</pre>
            </details>
          </>
        )}
        {item.leadId && (
          <Link className="insights-button" to="/sales-call" search={{ lead: item.leadId }}>
            Open client call history
          </Link>
        )}
        <details className="call-review-details">
          <summary>Call details & review status</summary>
          <p>{item.reason}</p>
          <p>
            {formatSydney(item.createdAt)}
            {item.duration !== null
              ? ` · ${Math.floor(item.duration / 60)}m ${item.duration % 60}s`
              : ""}
            {item.successful ? " · Currently booked" : ""}
            {" · "}
            {item.attempts} review {item.attempts === 1 ? "attempt" : "attempts"}
            {item.generatedAt ? ` · Last reviewed ${formatSydney(item.generatedAt)}` : ""}
            <br />
            Call {item.callId}
          </p>
          {(["ready", "unknown", "failed", "pending"].includes(item.status) ||
            item.recoverable) && (
            <button className="insights-button" disabled={busy} onClick={retry}>
              {item.attempts ? "Review this call again" : "Review this call"}
            </button>
          )}
        </details>
      </div>
    </details>
  );
}
