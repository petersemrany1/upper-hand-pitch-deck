import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Loader2, Phone, X, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CallReviewPopup, type AutoCallAnalysis } from "@/components/CallReviewPopup";

// Stages that mean the call is still in flight through the auto-analysis chain.
const IN_PROGRESS_STAGES = new Set([
  "waiting_for_recording",
  "transcribing",
  "analysing",
]);

const STAGE_LABEL: Record<string, string> = {
  waiting_for_recording: "Waiting for recording…",
  transcribing: "Transcribing…",
  analysing: "Analysing with AI…",
  failed: "Auto-analysis failed",
};

type InboxItem = {
  callRecordId: string;
  clinicId: string | null;
  clinicName: string;
  calledAt: string;
  duration: number | null;
  // When the call has finished analysing
  analysis: AutoCallAnalysis | null;
  needsReview: boolean;
  analysisStage: string | null;
};

type CallRecordRow = {
  id: string;
  clinic_id: string | null;
  call_analysis: AutoCallAnalysis | null;
  needs_review: boolean;
  duration: number | null;
  analysis_stage: string | null;
  called_at: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CallReviewInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [open, setOpen] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Hide the bell when a clinic detail panel is open (it overlaps the panel).
  useEffect(() => {
    const onPanel = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setHidden(!!detail?.open);
      if (detail?.open) setOpen(false);
    };
    window.addEventListener("clinic-detail-panel", onPanel);
    return () => window.removeEventListener("clinic-detail-panel", onPanel);
  }, []);

  // Resolve clinic name for a clinic_id (cached in component state through items).
  const fetchClinicName = async (clinicId: string | null): Promise<string> => {
    if (!clinicId) return "Unknown clinic";
    const { data } = await supabase
      .from("clinics")
      .select("clinic_name")
      .eq("id", clinicId)
      .maybeSingle();
    return data?.clinic_name || "Unknown clinic";
  };

  // Build/merge an inbox item from a row.
  const upsertFromRow = async (row: CallRecordRow) => {
    const isInProgress =
      row.analysis_stage !== null && IN_PROGRESS_STAGES.has(row.analysis_stage);
    const isReviewable = row.needs_review === true && !!row.call_analysis;
    const isFailed = row.analysis_stage === "failed";

    // Drop the row from inbox if it's no longer relevant.
    if (!isInProgress && !isReviewable && !isFailed) {
      setItems((prev) => prev.filter((i) => i.callRecordId !== row.id));
      return;
    }

    const clinicName = await fetchClinicName(row.clinic_id);
    setItems((prev) => {
      const next: InboxItem = {
        callRecordId: row.id,
        clinicId: row.clinic_id,
        clinicName,
        calledAt: row.called_at,
        duration: row.duration,
        analysis: row.call_analysis,
        needsReview: row.needs_review,
        analysisStage: row.analysis_stage,
      };
      const idx = prev.findIndex((i) => i.callRecordId === row.id);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  // Initial load — fetch any reviewable or in-progress calls in the last 24h.
  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("call_records")
        .select(
          "id, clinic_id, call_analysis, needs_review, duration, analysis_stage, called_at",
        )
        .gte("called_at", since)
        .order("called_at", { ascending: false })
        .limit(50);
      if (!data) return;
      const rows = data as CallRecordRow[];
      const filtered = rows.filter(
        (r) =>
          (r.needs_review && r.call_analysis) ||
          (r.analysis_stage && IN_PROGRESS_STAGES.has(r.analysis_stage)) ||
          r.analysis_stage === "failed",
      );
      const enriched: InboxItem[] = await Promise.all(
        filtered.map(async (r) => ({
          callRecordId: r.id,
          clinicId: r.clinic_id,
          clinicName: await fetchClinicName(r.clinic_id),
          calledAt: r.called_at,
          duration: r.duration,
          analysis: r.call_analysis,
          needsReview: r.needs_review,
          analysisStage: r.analysis_stage,
        })),
      );
      setItems(enriched);
    };
    void load();

    const channel = supabase
      .channel("call_review_inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_records" },
        (payload) => {
          const row =
            (payload.new as CallRecordRow | undefined) ??
            (payload.old as CallRecordRow | undefined);
          if (!row) return;
          if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((i) => i.callRecordId !== row.id));
            return;
          }
          void upsertFromRow(payload.new as CallRecordRow);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside to close panel.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const reviewableItems = useMemo(
    () => items.filter((i) => i.needsReview && i.analysis),
    [items],
  );
  const processingItems = useMemo(
    () =>
      items.filter(
        (i) =>
          !i.needsReview &&
          i.analysisStage &&
          (IN_PROGRESS_STAGES.has(i.analysisStage) || i.analysisStage === "failed"),
      ),
    [items],
  );
  const badgeCount = reviewableItems.length;

  const handleDismiss = async (item: InboxItem) => {
    setItems((prev) => prev.filter((i) => i.callRecordId !== item.callRecordId));
    await supabase
      .from("call_records")
      .update({ needs_review: false })
      .eq("id", item.callRecordId);
  };

  const handleDeleteFailed = async (item: InboxItem) => {
    setItems((prev) => prev.filter((i) => i.callRecordId !== item.callRecordId));
    // Mark as resolved by clearing the failed stage and review flag so it
    // never resurfaces in the inbox.
    await supabase
      .from("call_records")
      .update({ analysis_stage: null, needs_review: false })
      .eq("id", item.callRecordId);
  };

  const activeItem = items.find((i) => i.callRecordId === activeReviewId) || null;

  return (
    <>
      {/* Inline toolbar trigger — mounted by the clinics page toolbar only. */}
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-white/5 transition-colors"
          style={{ color: "#666" }}
          aria-label="Call review inbox"
          title="Call reviews"
        >
          <Bell className="w-3.5 h-3.5" />
          {badgeCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold text-white"
              style={{ background: "#dc2626" }}
            >
              {badgeCount}
            </span>
          )}
          {badgeCount === 0 && processingItems.length > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-3.5 w-3.5 rounded-full"
              style={{ background: "#1e3a5f" }}
            >
              <Loader2 className="w-2 h-2 animate-spin text-blue-400" />
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute top-12 right-0 w-[380px] max-h-[70vh] overflow-y-auto rounded-lg shadow-2xl"
            style={{ background: "#0f0f12", border: "1px solid #2a2a30" }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 sticky top-0"
              style={{ background: "#0f0f12", borderBottom: "1px solid #1f1f24" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "#60a5fa" }} />
                <div className="text-sm font-semibold text-white">Call Reviews</div>
                {badgeCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ background: "#dc2626" }}
                  >
                    {badgeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/5"
                aria-label="Close"
              >
                <X className="w-4 h-4" style={{ color: "#666" }} />
              </button>
            </div>

            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-xs" style={{ color: "#666" }}>
                No calls awaiting review.
                <br />
                Make a call and the AI summary will appear here.
              </div>
            )}

            <ul className="divide-y" style={{ borderColor: "#1f1f24" }}>
              {/* Processing items first so Peter sees them at the top while waiting */}
              {processingItems.map((item) => {
                const isFailed = item.analysisStage === "failed";
                return (
                  <li
                    key={item.callRecordId}
                    className="px-4 py-3"
                    style={isFailed ? { background: "rgba(220,38,38,0.06)" } : undefined}
                  >
                    <div className="flex items-start gap-2">
                      {isFailed ? (
                        <X className="w-4 h-4 mt-0.5" style={{ color: "#f87171" }} />
                      ) : (
                        <Loader2
                          className="w-4 h-4 animate-spin mt-0.5"
                          style={{ color: "#60a5fa" }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.clinicName}
                            {isFailed && (
                              <span
                                className="ml-2 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                style={{ background: "#450a0a", color: "#f87171" }}
                              >
                                Failed
                              </span>
                            )}
                          </div>
                          <div className="text-[10px]" style={{ color: "#666" }}>
                            {relativeTime(item.calledAt)}
                          </div>
                        </div>
                        <div
                          className="text-[11px] mt-0.5"
                          style={{ color: isFailed ? "#f87171" : "#60a5fa" }}
                        >
                          {STAGE_LABEL[item.analysisStage || ""] || "Processing…"}
                        </div>
                        {isFailed && (
                          <div className="mt-2">
                            <button
                              onClick={() => void handleDeleteFailed(item)}
                              className="text-[11px] px-2 py-1 rounded inline-flex items-center gap-1"
                              style={{
                                background: "transparent",
                                color: "#f87171",
                                border: "1px solid #450a0a",
                              }}
                            >
                              <X className="w-3 h-3" />
                              Dismiss failure
                            </button>
                          </div>
                        )}
                      </div>
                      {isFailed && (
                        <button
                          onClick={() => void handleDeleteFailed(item)}
                          className="p-1 rounded hover:bg-white/5 -mr-1"
                          aria-label="Delete failed item"
                          title="Delete failed item"
                        >
                          <X className="w-3.5 h-3.5" style={{ color: "#888" }} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}


              {reviewableItems.map((item) => {
                const a = item.analysis!;
                const summary =
                  a.notes?.trim() ||
                  a.next_action?.trim() ||
                  "AI summary ready — click Review";
                return (
                  <li key={item.callRecordId} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Phone
                        className="w-4 h-4 mt-0.5"
                        style={{ color: "#34d399" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.clinicName}
                          </div>
                          <div className="text-[10px]" style={{ color: "#666" }}>
                            {relativeTime(item.calledAt)}
                          </div>
                        </div>
                        {a.outcome && (
                          <div
                            className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1"
                            style={{ background: "#1e293b", color: "#94a3b8" }}
                          >
                            {a.outcome}
                          </div>
                        )}
                        <div
                          className="text-[11px] mt-1 line-clamp-2"
                          style={{ color: "#aaa" }}
                        >
                          {summary}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => {
                              setActiveReviewId(item.callRecordId);
                              setOpen(false);
                            }}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded inline-flex items-center gap-1"
                            style={{ background: "#2D6BE4", color: "#fff" }}
                          >
                            <Check className="w-3 h-3" />
                            Review
                          </button>
                          <button
                            onClick={() => void handleDismiss(item)}
                            className="text-[11px] px-2.5 py-1 rounded"
                            style={{
                              background: "transparent",
                              color: "#888",
                              border: "1px solid #2a2a30",
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Full review modal — reuses existing CallReviewPopup */}
      {activeItem && activeItem.analysis && activeItem.clinicId && (
        <CallReviewPopup
          callRecordId={activeItem.callRecordId}
          clinicId={activeItem.clinicId}
          clinicName={activeItem.clinicName}
          analysis={activeItem.analysis}
          duration={activeItem.duration}
          onClose={() => setActiveReviewId(null)}
          onApplied={() => {
            setItems((prev) =>
              prev.filter((i) => i.callRecordId !== activeItem.callRecordId),
            );
            setActiveReviewId(null);
          }}
          onEdit={() => {
            // For edit flow, drop from inbox and clear the review flag — Peter
            // will log it manually from the clinic detail panel.
            setItems((prev) =>
              prev.filter((i) => i.callRecordId !== activeItem.callRecordId),
            );
            void supabase
              .from("call_records")
              .update({ needs_review: false })
              .eq("id", activeItem.callRecordId);
            setActiveReviewId(null);
          }}
        />
      )}
    </>
  );
}
