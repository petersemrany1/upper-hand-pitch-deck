// Ported from the Legal app (family-law-floater/src/components/firms/FirmDuplicateNotice.tsx). Re-run the port script to refresh.
import { Copy } from "lucide-react";
import {
  displayName,
  formatDateTime,
  stageLabel,
  type FirmDuplicateHistory,
} from "@/legal/lib/firm-applications";
import type { FirmDuplicateMatch } from "@/legal/lib/firm-duplicates";
import { FIRM_CALL_ANSWER_LABELS } from "@/legal/lib/firm-calling";

export function FirmDuplicateBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
      <Copy size={12} aria-hidden="true" /> Duplicate · {count} {count === 1 ? "match" : "matches"}
    </span>
  );
}

export function FirmDuplicateNotice({
  matches,
  history,
  loading,
  error,
  onRetry,
  onOpen,
}: {
  matches: FirmDuplicateMatch[];
  history: FirmDuplicateHistory | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (id: string) => void;
}) {
  if (!matches.length) return null;
  return (
    <section className="crm-duplicates" aria-label="Duplicate application and previous notes">
      <h3>
        <Copy size={15} aria-hidden="true" /> Duplicate application — review previous notes
      </h3>
      <p className="crm-duplicate-intro">
        Matching contact details found on {matches.length} other{" "}
        {matches.length === 1 ? "application" : "applications"}. Check the history before calling; a
        firm may share a phone number or email.
      </p>
      {loading && <p role="status">Loading previous notes before calling…</p>}
      {error && (
        <div role="alert">
          <p>Could not load previous notes. Retry before calling.</p>
          <button type="button" onClick={onRetry}>
            Retry previous notes
          </button>
        </div>
      )}
      <div className="crm-duplicate-history" tabIndex={0} aria-label="Previous application history">
        {matches.map(({ application, matchedOn }) => {
          const sheet = history?.sheets.find((item) => item.application_id === application.id);
          const notes =
            history?.notes.filter((note) => note.application_id === application.id) ?? [];
          const answers = Object.entries(sheet?.answers ?? {})
            .filter(([key, value]) => key !== "matter_value_calculation" && value.trim())
            .sort(([a], [b]) => (a === "team_notes" ? -1 : b === "team_notes" ? 1 : 0));
          return (
            <article key={application.id} className="crm-duplicate-application">
              <div className="crm-duplicate-heading">
                <strong>{displayName(application)}</strong>
                <button type="button" onClick={() => onOpen(application.id)}>
                  Open application →
                </button>
              </div>
              <p className="crm-duplicate-meta">
                Applied {formatDateTime(application.created_at)} · {stageLabel(application.stage)} ·
                Same {matchedOn.join(" and ")}
              </p>
              {answers.length > 0 && (
                <div className="crm-duplicate-note">
                  <p className="crm-duplicate-meta">
                    Saved call sheet · Updated {formatDateTime(sheet!.updated_at)}
                  </p>
                  {answers.map(([key, value]) => (
                    <div key={key}>
                      <h4>
                        {key === "team_notes"
                          ? "Team notes"
                          : (FIRM_CALL_ANSWER_LABELS[key] ?? key.replace(/_/g, " "))}
                      </h4>
                      <p className="crm-duplicate-text">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {notes.map((note) => (
                <div className="crm-duplicate-note" key={note.id}>
                  <p className="crm-duplicate-meta">
                    {note.kind === "user" ? "Team note" : "Activity / call note"} ·{" "}
                    {formatDateTime(note.created_at)}
                  </p>
                  <p className="crm-duplicate-text">{note.body}</p>
                </div>
              ))}
              {history && !loading && !error && !notes.length && !answers.length && (
                <p className="crm-duplicate-meta">No saved notes on this application.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
