// Ported from the Legal app (family-law-floater/src/components/firms/FirmDrawer.tsx). Re-run the port script to refresh.
import { useCallback, useEffect, useState } from "react";
import { FirmOfferPanel } from "../firm-offers/FirmOfferPanel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, BookOpen, Clock3, Mail, MessageSquare, Phone, X } from "lucide-react";
import { toast } from "sonner";
import {
  STAGES,
  type FirmApplication,
  type FirmNote,
  type StageValue,
  displayName,
  formatDateTime,
  personName,
  relativeTime,
  fetchFirmDuplicateHistory,
} from "@/legal/lib/firm-applications";
import { getFirmCallWorkspace, retryFirmCallNotes } from "@/legal/lib/firm-calling.functions";
import { FirmContactEditor } from "./FirmContactEditor";
import { FirmConversation } from "./FirmConversation";
import { FirmCallSheet } from "./FirmCallSheet";
import { FirmCallControls } from "./FirmCallControls";
import { StageDot } from "./firm-ui";
import { FirmCalendlyBooking } from "./FirmCalendlyBooking";
import "./firm-crm.css";
import type { DiallerState } from "@/legal/hooks/use-dialler";
import type { FirmDuplicateMatch } from "@/legal/lib/firm-duplicates";
import { FirmDuplicateNotice } from "./FirmDuplicateNotice";
import { FirmPortalSetupButton } from "./FirmPortalSetupButton";

export function FirmDrawer({
  app,
  notes,
  notesLoading,
  onClose,
  onMove,
  userId,
  canManageOffers = false,
  canSetUpPortal = false,
  repName,
  dialler,
  callBusy,
  activeName,
  onCall,
  onDirtyChange,
  duplicates = [],
  onOpenApplication,
}: {
  app: FirmApplication;
  notes: FirmNote[];
  notesLoading: boolean;
  onClose: () => void;
  onMove: (stage: StageValue) => void;
  userId: string;
  canManageOffers?: boolean;
  canSetUpPortal?: boolean;
  repName: string;
  dialler: DiallerState;
  callBusy: boolean;
  activeName: string | null;
  onCall: () => void;
  onDirtyChange: (dirty: boolean) => void;
  duplicates?: FirmDuplicateMatch[];
  onOpenApplication?: (id: string) => void;
}) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"guide" | "notes">("guide");
  const [historyTab, setHistoryTab] = useState<"activity" | "calls">("activity");
  const [showConversation, setShowConversation] = useState(true);
  const [contactEditors, setContactEditors] = useState<Record<string, boolean>>({});
  const contactDirty = Object.values(contactEditors).some(Boolean);
  const [syncingContacts, setSyncingContacts] = useState<Record<string, boolean>>({});
  const setContactSyncing = useCallback(
    (key: string, syncing: boolean) =>
      setSyncingContacts((current) => ({ ...current, [key]: syncing })),
    [],
  );
  const setContactEditing = useCallback(
    (key: string, editing: boolean) =>
      setContactEditors((current) => ({ ...current, [key]: editing })),
    [],
  );
  const [messageDirty, setMessageDirty] = useState(false);
  const [sheetDirty, setSheetDirty] = useState(false);
  const queryClient = useQueryClient();
  const duplicateIds = duplicates.map(({ application }) => application.id).sort();
  const duplicateHistory = useQuery({
    queryKey: ["firm-duplicate-history", duplicateIds, true],
    queryFn: () => fetchFirmDuplicateHistory(duplicateIds),
    enabled: duplicateIds.length > 0,
    refetchInterval: 15_000,
  });
  const getWorkspace = useServerFn(getFirmCallWorkspace);
  const retryNotes = useServerFn(retryFirmCallNotes);
  const workspace = useQuery({
    queryKey: ["firm-call-workspace", app.id],
    queryFn: () => getWorkspace({ data: { applicationId: app.id } }),
    refetchInterval: 5000,
  });
  const retry = useMutation({
    mutationFn: (callId: string) => retryNotes({ data: { callId } }),
    onSuccess: () => {
      void workspace.refetch();
      void queryClient.invalidateQueries({ queryKey: ["firm-application-notes", app.id] });
    },
    onError: (error: Error) =>
      toast.error("Could not generate notes", { description: error.message }),
  });
  useEffect(() => {
    onDirtyChange(contactDirty || sheetDirty || messageDirty);
  }, [contactDirty, sheetDirty, messageDirty, onDirtyChange]);
  const completedCalls = workspace.data?.calls.filter(
    (call) => call.analysis_status === "complete",
  ).length;
  useEffect(() => {
    // Refresh the activity when a background summary arrives.
    void queryClient.invalidateQueries({ queryKey: ["firm-application-notes", app.id] });
    void queryClient.invalidateQueries({ queryKey: ["firm-note-summaries"] });
  }, [completedCalls, app.id, queryClient]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      // A nested calculator/dialog owns Escape while it is open.
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !(event.target instanceof Element && event.target.closest('[role="dialog"]'))
      )
        onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  return (
    <>
      <button
        type="button"
        aria-label="Close firm details"
        onClick={onClose}
        className="crm-backdrop"
      />
      <aside aria-label={`${displayName(app)} details`} className="firm-crm">
        <header className="crm-header">
          <div className="crm-identity">
            <div className="crm-avatar" aria-hidden="true">
              {displayName(app)
                .split(/\s+/)
                .slice(0, 2)
                .map((word) => word[0])
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="crm-eyebrow">Firm pipeline</p>
              <div>
                <FirmContactEditor
                  app={app}
                  userId={userId}
                  label="Firm name"
                  fields={[{ key: "firm_name", label: "Firm name" }]}
                  onEditingChange={setContactEditing}
                  onSyncingChange={setContactSyncing}
                >
                  <h2>{displayName(app)}</h2>
                </FirmContactEditor>
              </div>
              <div className="crm-contact-name">
                <FirmContactEditor
                  app={app}
                  userId={userId}
                  label="Contact name"
                  fields={[
                    { key: "first_name", label: "First name" },
                    { key: "last_name", label: "Last name" },
                  ]}
                  onEditingChange={setContactEditing}
                  onSyncingChange={setContactSyncing}
                >
                  {personName(app)}
                </FirmContactEditor>
                {app.city ? ` · ${app.city}` : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close firm details"
            className="crm-close"
          >
            <X size={19} />
          </button>
        </header>
        <div className="crm-contact-bar">
          <div className="crm-contact-links">
            <FirmContactEditor
              app={app}
              userId={userId}
              label="Phone number"
              fields={[{ key: "phone", label: "Phone number", type: "tel" }]}
              onEditingChange={setContactEditing}
              onSyncingChange={setContactSyncing}
            >
              <Phone size={13} />
              {app.phone || "Add phone number"}
            </FirmContactEditor>
            <FirmContactEditor
              app={app}
              userId={userId}
              label="Email"
              fields={[{ key: "email", label: "Email", type: "email" }]}
              onEditingChange={setContactEditing}
              onSyncingChange={setContactSyncing}
            >
              <Mail size={13} />
              {app.email ? (
                <a href={`mailto:${app.email}`}>
                  <span>{app.email}</span>
                  <ArrowUpRight size={12} />
                </a>
              ) : (
                "Add email"
              )}
            </FirmContactEditor>
          </div>
          <label className="crm-stage-select">
            <StageDot stage={app.stage} />
            <span className="sr-only">Pipeline stage</span>
            <select
              aria-label="Pipeline stage"
              value={app.stage}
              onChange={(e) => onMove(e.target.value as StageValue)}
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FirmCalendlyBooking app={app} />
        <FirmDuplicateNotice
          matches={duplicates}
          history={duplicateHistory.data}
          loading={duplicateHistory.isLoading}
          error={duplicateHistory.isError}
          onRetry={() => void duplicateHistory.refetch()}
          onOpen={(id) => onOpenApplication?.(id)}
        />
        <div className="crm-firm-actions">
          {canSetUpPortal && (
            <FirmPortalSetupButton
              applicationId={app.id}
              contactSaving={Object.values(syncingContacts).some(Boolean)}
            />
          )}
          {canManageOffers && (
            <button
              type="button"
              className="text-sm font-semibold text-primary"
              onClick={() => setOfferOpen(true)}
            >
              Prepare proposal →
            </button>
          )}
        </div>
        <div
          className="crm-mobile-tabs crm-workspace-tabs"
          role="tablist"
          aria-label="Firm workspace"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "guide"}
            onClick={() => setMobilePanel("guide")}
          >
            <BookOpen size={15} />
            Call guide
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePanel === "notes"}
            onClick={() => setMobilePanel("notes")}
          >
            <MessageSquare size={15} />
            Messages & history
          </button>
        </div>
        <div className="crm-workspace" data-mobile-panel={mobilePanel}>
          <div className="crm-guide-panel">
            {workspace.isLoading || (!workspace.isFetchedAfterMount && !workspace.error) ? (
              <p className="p-5 text-sm text-muted-foreground">Loading call sheet…</p>
            ) : workspace.error && !workspace.data ? (
              <div className="p-5 text-sm text-destructive">
                <p>Could not load the call sheet. {workspace.error.message}</p>
                <button className="mt-2 underline" onClick={() => void workspace.refetch()}>
                  Retry
                </button>
              </div>
            ) : (
              workspace.data && (
                <FirmCallSheet
                  applicationId={app.id}
                  userId={userId}
                  contactName={app.first_name || ""}
                  repName={repName}
                  initialAnswers={workspace.data.answers}
                  onSavingChange={setSheetDirty}
                />
              )
            )}
          </div>
          <div className="crm-notes-panel">
            <div className="crm-history-tabs" role="tablist" aria-label="Communication workspace">
              <button
                role="tab"
                aria-selected={showConversation}
                onClick={() => setShowConversation(true)}
              >
                Messages & calls
              </button>
              <button
                role="tab"
                aria-selected={!showConversation}
                onClick={() => setShowConversation(false)}
              >
                Notes & history
              </button>
            </div>
            <div hidden={!showConversation} className="min-h-0 flex-1">
              <FirmConversation
                app={app}
                userId={userId}
                calls={workspace.data?.calls ?? []}
                callsError={workspace.error?.message}
                onDirtyChange={setMessageDirty}
              />
            </div>
            <div hidden={showConversation} className="overflow-y-auto">
              <div className="crm-history-tabs" role="tablist" aria-label="Firm history">
                <button
                  type="button"
                  role="tab"
                  aria-selected={historyTab === "activity"}
                  onClick={() => setHistoryTab("activity")}
                >
                  <Clock3 size={14} />
                  Activity <span>{notes.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={historyTab === "calls"}
                  onClick={() => setHistoryTab("calls")}
                >
                  <Phone size={14} />
                  Calls <span>{workspace.data?.calls.length ?? 0}</span>
                </button>
              </div>
              {historyTab === "calls" && (
                <section className="crm-history-content space-y-3" aria-label="Calls">
                  {!workspace.data?.calls.length && (
                    <p className="text-xs text-muted-foreground">
                      <Phone size={24} className="mb-3 opacity-40" />
                      Your call history starts here.
                      <br />
                      Call this firm to capture a recording and automatic notes.
                    </p>
                  )}
                  {workspace.data?.calls.map((call) => (
                    <article
                      key={call.id}
                      className="space-y-2 rounded-lg border border-border bg-background p-3 text-xs"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium capitalize">
                          {call.direction === "inbound" ? "Incoming · " : "Outgoing · "}
                          {call.status.replaceAll("-", " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {call.duration_seconds != null ? `${call.duration_seconds}s` : ""}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{formatDateTime(call.created_at)}</p>
                      {call.summary ? (
                        <details>
                          <summary className="cursor-pointer font-medium">AI call notes</summary>
                          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{call.summary}</p>
                        </details>
                      ) : (
                        <p className="text-muted-foreground">
                          {call.analysis_status === "processing"
                            ? "Generating call notes…"
                            : call.analysis_status === "failed"
                              ? "Automatic notes need a retry."
                              : call.has_recording
                                ? "Recording ready for notes."
                                : ["completed", "busy", "no-answer", "failed", "canceled"].includes(
                                      call.status,
                                    )
                                  ? "Recording unavailable. Automatic notes need a recording."
                                  : "Waiting for the call to finish."}
                        </p>
                      )}
                      {(call.has_recording ||
                        call.transcript ||
                        call.status === "completed" ||
                        call.status === "voicemail") &&
                        !call.summary && (
                          <button
                            type="button"
                            disabled={retry.isPending}
                            onClick={() => retry.mutate(call.id)}
                            className="text-primary underline disabled:opacity-40"
                          >
                            {retry.isPending && retry.variables === call.id
                              ? "Generating…"
                              : call.has_recording || call.transcript
                                ? "Retry notes"
                                : "Check recording & rebuild notes"}
                          </button>
                        )}
                      {call.transcript && (
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">
                            Transcript
                          </summary>
                          <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                            {call.transcript}
                          </p>
                        </details>
                      )}
                    </article>
                  ))}
                </section>
              )}
              {historyTab === "activity" && (
                <section className="crm-history-content space-y-3" aria-label="Activity">
                  {notesLoading && (
                    <p className="text-xs text-muted-foreground">Loading activity…</p>
                  )}
                  {!notesLoading && !notes.length && (
                    <p className="text-xs text-muted-foreground">No notes yet.</p>
                  )}
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className={`crm-timeline-item ${note.kind === "system" ? "is-system" : ""}`}
                    >
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{note.body}</p>
                      <p
                        className="mt-1 text-[11px] text-muted-foreground"
                        title={formatDateTime(note.created_at)}
                      >
                        {relativeTime(note.created_at)}
                      </p>
                    </article>
                  ))}
                </section>
              )}
              <details className="crm-source text-xs text-muted-foreground">
                <summary className="cursor-pointer">Application source</summary>
                <dl className="mt-2 space-y-2">
                  {[
                    ["Applied", formatDateTime(app.created_at)],
                    ["Ad", app.ad_name],
                    ["Ad set", app.adset_name],
                    ["Campaign", app.campaign_name],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className="text-foreground">{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          </div>
        </div>
        <FirmCallControls
          dialler={dialler}
          busy={callBusy}
          activeName={activeName}
          canCall={
            !!app.phone &&
            !workspace.error &&
            !workspace.isLoading &&
            (!duplicates.length || duplicateHistory.isSuccess)
          }
          onCall={onCall}
        />
      </aside>
      {canManageOffers && offerOpen && (
        <FirmOfferPanel app={app} onClose={() => setOfferOpen(false)} />
      )}
    </>
  );
}
export function StageLegendDot({ stage }: { stage: string }) {
  return <StageDot stage={stage} />;
}
