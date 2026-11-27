// Ported from the Legal app (family-law-floater/src/components/firms/FirmCallSummaries.tsx). Re-run the port script to refresh.
import { useEffect, useRef } from "react";
import { ArrowLeft, FileText, Loader2, Phone } from "lucide-react";
import { formatDateTime, type FirmNote } from "@/legal/lib/firm-applications";
import type { FirmCall } from "@/legal/lib/firm-calling";

export function FirmCallSummaries({
  calls,
  notes,
  loading,
  notesLoading,
  error,
  generatingCallId,
  onGenerate,
  onRefresh,
  onBack,
}: {
  calls: FirmCall[];
  notes: FirmNote[];
  loading: boolean;
  notesLoading: boolean;
  error: string | undefined;
  generatingCallId: string | null;
  onGenerate: (callId: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const conversations = calls
    .filter(
      (call) =>
        call.summary?.trim() ||
        call.transcript?.trim() ||
        call.has_recording ||
        ["completed", "voicemail"].includes(call.status),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const savedNotes = notes.filter((note) => note.kind === "user");
  return (
    <section className="crm-call-summaries" aria-label="Phone conversation summaries">
      <div className="crm-summary-content">
        <button type="button" className="crm-summary-back" onClick={onBack}>
          <ArrowLeft size={15} /> Back to firm workspace
        </button>
        <h3 ref={heading} tabIndex={-1}>
          Phone conversation summaries
        </h3>
        <p className="crm-summary-intro">
          Catch up before the closer call: what you discussed, their concerns and the next steps.
          Latest calls first. Summaries are AI-generated from recorded calls.
        </p>
        {loading && <p role="status">Loading phone conversations…</p>}
        {error && (
          <div role="alert" className="crm-summary-notice">
            <p>Could not refresh phone conversations. {error}</p>
            <button type="button" onClick={onRefresh}>
              Try again
            </button>
          </div>
        )}
        {!loading && !error && !conversations.length && (
          <div className="crm-summary-notice">
            <Phone size={22} aria-hidden="true" />
            <p>No recorded phone conversations yet.</p>
            <p>
              Calls without a recording or transcript cannot be summarised automatically. You can
              review your saved notes below or add a note in the firm workspace.
            </p>
          </div>
        )}
        {calls.length >= 50 && (
          <p className="crm-summary-intro">
            Showing conversations from the latest 50 call attempts.
          </p>
        )}
        {conversations.map((call) => {
          const summary = call.summary?.trim();
          const generating = generatingCallId === call.id;
          const processing = generating || call.analysis_status === "processing";
          const hasSource = call.has_recording || !!call.transcript?.trim();
          return (
            <article key={call.id} className="crm-summary-card">
              <div className="crm-summary-call-heading">
                <h4>
                  <Phone size={15} aria-hidden="true" />
                  {call.status === "voicemail"
                    ? "Voicemail"
                    : call.direction === "inbound"
                      ? "Incoming call"
                      : "Outgoing call"}
                </h4>
                {call.duration_seconds != null && (
                  <span>
                    {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                  </span>
                )}
              </div>
              <p className="crm-summary-date">{formatDateTime(call.created_at)}</p>
              {summary ? (
                <p className="crm-summary-text">{summary}</p>
              ) : (
                <div className="crm-summary-missing">
                  <p role={processing ? "status" : undefined}>
                    {processing
                      ? "Generating the call summary… This may take a minute."
                      : call.analysis_status === "failed"
                        ? "The summary could not be generated. You can try again."
                        : hasSource
                          ? "This call is ready to summarise."
                          : "No recording or transcript is saved for this call. Check for an available recording to generate a summary."}
                  </p>
                  <button
                    type="button"
                    className="crm-summary-generate"
                    disabled={generatingCallId !== null}
                    onClick={() => onGenerate(call.id)}
                  >
                    {generating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <FileText size={14} />
                    )}
                    {generating
                      ? "Generating summary…"
                      : processing || call.analysis_status === "failed"
                        ? "Retry summary"
                        : hasSource
                          ? "Generate summary"
                          : "Find recording & summarise"}
                  </button>
                </div>
              )}
              {call.transcript?.trim() && (
                <details className="crm-summary-transcript">
                  <summary>
                    Read {call.status === "voicemail" ? "voicemail " : ""}transcript
                  </summary>
                  <p className="crm-summary-text">{call.transcript}</p>
                </details>
              )}
            </article>
          );
        })}
        <details className="crm-summary-saved-notes" open={!conversations.length}>
          <summary>Saved team notes ({savedNotes.length})</summary>
          {notesLoading && <p role="status">Loading saved notes…</p>}
          {!notesLoading && !savedNotes.length && <p>No team notes saved yet.</p>}
          {savedNotes.map((note) => (
            <article key={note.id} className="crm-summary-card">
              <p className="crm-summary-date">{formatDateTime(note.created_at)}</p>
              <p className="crm-summary-text">{note.body}</p>
            </article>
          ))}
        </details>
      </div>
    </section>
  );
}
