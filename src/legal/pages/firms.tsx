// Ported from the Legal app (family-law-floater/src/routes/_authenticated/firms.tsx). Re-run the port script to refresh.
import { FirmPipelineReadOnly } from "@/legal/components/firms/FirmPipelineReadOnly";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/legal/runtime/router";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

import { CardSkeleton, FirmCard, StageDot } from "@/legal/components/firms/firm-ui";
import { FirmDrawer } from "@/legal/components/firms/FirmDrawer";
import {
  STAGES,
  type FirmApplication,
  type StageValue,
  fetchApplications,
  fetchNoteSummaries,
  fetchNotes,
  moveStage,
  stageLabel,
} from "@/legal/lib/firm-applications";
import { useServerFn } from "@tanstack/react-start";
import { useDialler } from "@/legal/hooks/use-dialler";
import { prepareFirmCall, failPreparedFirmCall } from "@/legal/lib/firm-calling.functions";
import { FirmCallControls } from "@/legal/components/firms/FirmCallControls";
import { getFirmConversationInbox } from "@/legal/lib/firm-conversations.functions";
import { formatDateTime } from "@/legal/lib/firm-applications";
import { displayName } from "@/legal/lib/firm-applications";
import { cn } from "@/legal/lib/utils";
import { useFirmCallbacks } from "@/legal/hooks/use-firm-callbacks";
import { getFirmCallbackSettings, saveFirmCallbackSettings } from "@/legal/lib/firm-callbacks.functions";
import { FirmCallbackSetting } from "@/legal/components/firms/FirmCallbackSetting";
import { FirmIncomingCall } from "@/legal/components/firms/FirmIncomingCall";
import { FirmMissedCalls } from "@/legal/components/firms/FirmMissedCalls";
import { fetchCurrentStaff } from "@/legal/lib/client-leads";
import { landingPathFor } from "@/legal/lib/roles";
import { findFirmDuplicates } from "@/legal/lib/firm-duplicates";
import { FirmDuplicateBadge } from "@/legal/components/firms/FirmDuplicateNotice";

// Rendered inside the Upper Hand portal when Legal is selected.
import { legalRoute } from "@/legal/bridge/route";
export { FirmsRoute as LegalPage };
export const Route = legalRoute({
  head: () => ({
    meta: [
      { title: "Firm Applications — Legal Group Portal" },
      {
        name: "description",
        content:
          "Track law firms applying to partner with Legal Group through every stage from new lead to signed.",
      },
      { property: "og:title", content: "Firm Applications — Legal Group Portal" },
      {
        property: "og:description",
        content: "Pipeline of law firms applying to partner with Legal Group.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FirmsRoute,
});

function FirmsRoute() {
  const { role } = Route.useRouteContext();
  return role.isAdmin || role.canManageFirmPipeline === true ? (
    <FirmsPage />
  ) : (
    <FirmPipelineReadOnly />
  );
}

function FirmsPage() {
  const { user, role } = Route.useRouteContext();
  const staff = useQuery({ queryKey: ["current-staff"], queryFn: fetchCurrentStaff });
  const queryClient = useQueryClient();
  const getCallbacks = useServerFn(getFirmCallbackSettings);
  const saveCallbacks = useServerFn(saveFirmCallbackSettings);
  const callbackSettings = useQuery({
    queryKey: ["firm-callback-settings", user.id],
    queryFn: () => getCallbacks(),
    refetchInterval: 20_000,
  });
  const getInbox = useServerFn(getFirmConversationInbox);
  const [view, setView] = useState<"pipeline" | "inbox" | "missed">("pipeline");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const inbox = useQuery({
    queryKey: ["firm-conversation-inbox"],
    queryFn: () => getInbox(),
    refetchInterval: 5000,
  });
  const unreadCount = (inbox.data ?? []).reduce((sum, row) => sum + Number(row.unread_count), 0);
  const prepareCall = useServerFn(prepareFirmCall);
  const failPreparedCall = useServerFn(failPreparedFirmCall);
  const [callBusy, setCallBusy] = useState(false);
  const callLock = useRef(false);
  const [activeFirm, setActiveFirm] = useState<FirmApplication | null>(null);
  const [detailDirty, setDetailDirty] = useState(false);
  const [callbackDraftDirty, setCallbackDraftDirty] = useState(false);
  const dialler = useDialler(() => {
    void queryClient.invalidateQueries({ queryKey: ["firm-call-workspace"] });
  });
  const refreshConversations = () => {
    void queryClient.invalidateQueries({ queryKey: ["firm-call-workspace"] });
    void queryClient.invalidateQueries({ queryKey: ["firm-conversation-inbox"] });
    void queryClient.invalidateQueries({ queryKey: ["firm-conversation"] });
    void queryClient.invalidateQueries({ queryKey: ["firm-missed-calls"] });
  };
  const receiver = useFirmCallbacks(
    callbackSettings.data?.enabled === true,
    callBusy || dialler.status !== "idle",
    refreshConversations,
  );
  const callbackMutation = useMutation({
    mutationFn: (enabled: boolean) => saveCallbacks({ data: { enabled } }),
    onSuccess: (data) => queryClient.setQueryData(["firm-callback-settings", user.id], data),
    onError: (error) =>
      toast.error("Could not update incoming calls", { description: error.message }),
  });
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        callBusy ||
        dialler.status !== "idle" ||
        receiver.caller ||
        detailDirty ||
        callbackDraftDirty
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [callBusy, dialler.status, receiver.caller, detailDirty, callbackDraftDirty]);
  const callFirm = async (app: FirmApplication) => {
    if (receiver.caller) {
      toast.info("Finish the incoming firm call before starting another call.");
      return;
    }
    if (callLock.current || dialler.status !== "idle") return;
    callLock.current = true;
    setCallBusy(true);
    setActiveFirm(app);
    try {
      const prepared = await prepareCall({ data: { applicationId: app.id } });
      const started = await dialler.startCall({
        to: prepared.phone,
        leadId: "",
        repId: prepared.repId,
        extraParams: { FirmApplicationCallId: prepared.callId },
      });
      if (!started) await failPreparedCall({ data: { callId: prepared.callId } });
      void queryClient.invalidateQueries({ queryKey: ["firm-call-workspace", app.id] });
    } catch (error) {
      toast.error("Could not start call", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCallBusy(false);
      callLock.current = false;
    }
  };
  const selectFirm = (id: string | null) => {
    if (detailDirty) {
      toast.info(
        "Some changes could not be backed up. Wait for them to save, or finish checking the pending text send before closing.",
      );
      return;
    }
    setDetailDirty(false);
    setSelectedId(id);
  };
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<StageValue>("new");
  const [deadOpen, setDeadOpen] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const {
    data: applications,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["firm-applications"],
    queryFn: fetchApplications,
    refetchInterval: 30_000,
  });
  const { data: summaries } = useQuery({
    queryKey: ["firm-note-summaries"],
    queryFn: fetchNoteSummaries,
  });

  const apps = useMemo(() => applications ?? [], [applications]);
  const duplicates = useMemo(() => findFirmDuplicates(apps), [apps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((app) =>
      [app.first_name, app.last_name, app.firm_name, app.email, app.phone, app.city]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [apps, query]);

  const byStage = useMemo(() => {
    const map: Record<string, FirmApplication[]> = {};
    for (const stage of STAGES) map[stage.value] = [];
    for (const app of filtered) (map[app.stage] ??= []).push(app);
    return map;
  }, [filtered]);

  const selected = apps.find((app) => app.id === selectedId) ?? null;

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["firm-application-notes", selectedId],
    queryFn: () => fetchNotes(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const invalidate = (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: ["firm-applications"] });
    void queryClient.invalidateQueries({ queryKey: ["firm-note-summaries"] });
    void queryClient.invalidateQueries({
      queryKey: id ? ["firm-application-notes", id] : ["firm-application-notes"],
    });
  };

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: StageValue }) => moveStage(id, stage),
    onSuccess: (_data, variables) => invalidate(variables.id),
    onError: (err: { message?: string; code?: string }) =>
      toast.error("Could not update the stage", {
        description:
          err?.code === "23514"
            ? "The database does not allow this stage yet — the latest migration has not been applied."
            : err?.message,
      }),
  });

  const move = (app: FirmApplication, stage: StageValue) => {
    if (app.stage === stage) return;
    const previous = app.stage as StageValue;
    stageMutation.mutate(
      { id: app.id, stage },
      {
        onSuccess: () =>
          toast.success(`Moved to ${stageLabel(stage)}`, {
            action: {
              label: "Undo",
              onClick: () => stageMutation.mutate({ id: app.id, stage: previous }),
            },
          }),
      },
    );
  };

  const handleDrop = (stage: StageValue) => (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/firm-id");
    const app = apps.find((item) => item.id === id);
    if (app) move(app, stage);
  };

  const renderCard = (app: FirmApplication, draggable: boolean) => (
    <FirmCard
      key={app.id}
      app={app}
      summary={summaries?.[app.id]}
      duplicateCount={duplicates.get(app.id)?.length ?? 0}
      draggable={draggable}
      onOpen={() => selectFirm(app.id)}
      onMove={(stage) => move(app, stage)}
    />
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            to={landingPathFor(role) ?? "/auth"}
            aria-label="Back to your home page"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-semibold tracking-tight">Firm applications</h1>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {apps.length}
          </span>
          <label className="relative ml-auto w-40 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search applications</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="w-full rounded-md border border-border bg-card py-1.5 pr-2 pl-8 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        {callbackSettings.data?.allowed && (
          <FirmCallbackSetting
            enabled={callbackSettings.data.enabled}
            saving={callbackMutation.isPending}
            receiver={receiver}
            onChange={(enabled) => {
              if (enabled) receiver.startReceiving();
              callbackMutation.mutate(enabled);
            }}
          />
        )}
        {callbackSettings.error && (
          <p role="status" className="px-6 pb-3 text-xs text-muted-foreground">
            {callbackSettings.error.message}
          </p>
        )}
        <nav className="flex gap-2 px-6 pb-3" aria-label="Firm views">
          <button
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              view === "pipeline" && "bg-accent font-semibold",
            )}
            onClick={() => setView("pipeline")}
          >
            Pipeline
          </button>
          <button
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              view === "inbox" && "bg-accent font-semibold",
            )}
            onClick={() => setView("inbox")}
          >
            Inbox{" "}
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              view === "missed" && "bg-accent font-semibold",
            )}
            onClick={() => setView("missed")}
          >
            Missed calls
          </button>
        </nav>
      </header>

      {view === "missed" ? (
        <FirmMissedCalls applications={apps} search={query} onSelect={selectFirm} />
      ) : view === "inbox" ? (
        <div className="mx-auto max-w-4xl p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Messages & callbacks</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
              />
              Needs attention
            </label>
          </div>
          {(inbox.error || error) && (
            <p role="alert" className="text-destructive">
              Could not load the inbox. Please refresh and try again.
            </p>
          )}
          {(inbox.isLoading || isLoading) && <p>Loading conversations…</p>}
          {(inbox.data ?? [])
            .filter(
              (row) =>
                (!unreadOnly || Number(row.unread_count) > 0) &&
                filtered.some((app) => app.id === row.application_id),
            )
            .map((row) => {
              const app = apps.find((a) => a.id === row.application_id)!;
              return (
                <button
                  key={app.id}
                  onClick={() => selectFirm(app.id)}
                  className="mb-2 flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{displayName(app)}</div>
                    <FirmDuplicateBadge count={duplicates.get(app.id)?.length ?? 0} />
                    <p className="truncate text-sm text-muted-foreground">{row.preview}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(row.last_activity_at)}
                    </p>
                  </div>
                  {Number(row.unread_count) > 0 && (
                    <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                      {row.unread_count} new
                    </span>
                  )}
                  <ChevronRight size={16} />
                </button>
              );
            })}
          {!inbox.isLoading &&
            !inbox.error &&
            !error &&
            !(inbox.data ?? []).some(
              (row) =>
                (!unreadOnly || Number(row.unread_count) > 0) &&
                filtered.some((app) => app.id === row.application_id),
            ) && (
              <p className="py-12 text-center text-muted-foreground">
                {unreadOnly
                  ? "No replies or callbacks need attention."
                  : "No conversations match this view. Open a firm from the pipeline to send a text."}
              </p>
            )}
        </div>
      ) : error ? (
        <p className="px-6 py-16 text-center text-sm text-destructive">
          You do not have access to this pipeline, or it could not be loaded.
        </p>
      ) : isLoading ? (
        <div className="hidden gap-4 px-6 py-4 lg:grid lg:grid-cols-8">
          {STAGES.map((stage) => (
            <div key={stage.value} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : apps.length === 0 ? (
        <p className="px-6 py-24 text-center text-sm text-muted-foreground">
          No applications yet. New firms land here automatically.
        </p>
      ) : (
        <>
          {/* Desktop kanban */}
          <div className="hidden w-full items-start gap-3 px-4 py-4 lg:flex lg:px-6">
            {STAGES.map((stage) => {
              const items = byStage[stage.value] ?? [];
              const collapsed = stage.value === "dead" && !deadOpen;
              if (collapsed) {
                return (
                  <button
                    key={stage.value}
                    type="button"
                    onClick={() => setDeadOpen(true)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop(stage.value)}
                    className="flex w-12 shrink-0 flex-col items-center gap-2 rounded-lg border border-border/70 py-3 text-muted-foreground transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={`Expand ${stage.label} column`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-semibold tabular-nums">{items.length}</span>
                    <span className="text-[11px] tracking-wide [writing-mode:vertical-rl]">
                      {stage.label}
                    </span>
                  </button>
                );
              }
              return (
                <section
                  key={stage.value}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(stage.value);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === stage.value ? null : v))}
                  onDrop={handleDrop(stage.value)}
                  className={cn(
                    "min-w-0 flex-1 rounded-lg p-1 transition",
                    dragOver === stage.value && "bg-accent/50",
                  )}
                >
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <StageDot stage={stage.value} />
                    <h2 className="truncate text-[11px] font-semibold tracking-[0.1em] uppercase">
                      {stage.label}
                    </h2>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                    {stage.value === "dead" && (
                      <button
                        type="button"
                        onClick={() => setDeadOpen(false)}
                        className="ml-auto text-[11px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <div className="h-20 rounded-lg border border-dashed border-border/70" />
                  ) : (
                    <div className="space-y-2">{items.map((app) => renderCard(app, true))}</div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Mobile single-stage list */}
          <div className="lg:hidden">
            <div className="-mx-4 overflow-x-auto px-4 py-3">
              <div className="flex w-max gap-2">
                {STAGES.map((stage) => {
                  const count = (byStage[stage.value] ?? []).length;
                  const active = stage.value === mobileStage;
                  return (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => setMobileStage(stage.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active
                          ? "border-foreground/20 bg-accent font-medium"
                          : "border-border/70 text-muted-foreground",
                      )}
                    >
                      <StageDot stage={stage.value} />
                      {stage.label}
                      <span className="tabular-nums opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 px-4 pb-16">
              {(byStage[mobileStage] ?? []).map((app) => renderCard(app, false))}
              {(byStage[mobileStage] ?? []).length === 0 && (
                <div className="h-24 rounded-lg border border-dashed border-border/70" />
              )}
            </div>
          </div>
        </>
      )}

      {!selected && (callBusy || dialler.status !== "idle") && (
        <div className="fixed right-4 bottom-4 z-50 w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          <button
            type="button"
            className="px-5 pt-3 text-xs text-primary underline"
            onClick={() => activeFirm && selectFirm(activeFirm.id)}
          >
            Open calling firm
          </button>
          <FirmCallControls
            dialler={dialler}
            busy={callBusy}
            activeName={activeFirm ? displayName(activeFirm) : null}
            canCall={false}
            onCall={() => {}}
          />
        </div>
      )}
      <FirmIncomingCall
        receiver={receiver}
        senderName={staff.data?.name || "Bold team"}
        onSent={refreshConversations}
        onDraftChange={setCallbackDraftDirty}
      />
      {selected && (
        <FirmDrawer
          key={selected.id}
          app={selected}
          duplicates={duplicates.get(selected.id) ?? []}
          onOpenApplication={selectFirm}
          notes={notes}
          notesLoading={notesLoading}
          onClose={() => selectFirm(null)}
          onMove={(stage) => move(selected, stage)}
          userId={user.id}
          canManageOffers={role.isAdmin}
          canSetUpPortal={role.isAdmin}
          repName={staff.data?.name?.split(" ")[0] || ""}
          dialler={dialler}
          callBusy={callBusy}
          activeName={activeFirm ? displayName(activeFirm) : null}
          onCall={() => void callFirm(selected)}
          onDirtyChange={setDetailDirty}
        />
      )}
    </div>
  );
}
