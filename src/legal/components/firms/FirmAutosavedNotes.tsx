// Ported from the Legal app (family-law-floater/src/components/firms/FirmAutosavedNotes.tsx). Re-run the port script to refresh.
import { MessageSquare } from "lucide-react";
import { type useFirmAutosave, firmSaveLabel } from "@/legal/hooks/use-firm-autosave";

export function FirmAutosavedNotes({ form }: { form: ReturnType<typeof useFirmAutosave> }) {
  return (
    <section className="crm-note-composer">
      <div className="crm-panel-heading">
        <h3>
          <MessageSquare size={15} /> Call notes
        </h3>
        <span>Saves as you type</span>
      </div>
      <textarea
        aria-label="Call notes"
        className="crm-input crm-note-input"
        rows={6}
        maxLength={12000}
        placeholder="Take notes as you go…"
        value={form.answers["team_notes"] ?? ""}
        onChange={(event) => form.change("team_notes", event.target.value)}
        onBlur={() => void form.flush()}
      />
      <button
        type="button"
        className={`crm-save-status ${form.status === "retry" ? "has-error" : ""}`}
        onClick={() => void form.flush()}
        aria-live="polite"
      >
        {firmSaveLabel(form.status, form.protected)}
      </button>
    </section>
  );
}
