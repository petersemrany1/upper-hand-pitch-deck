import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Loader2, Check, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Maps the AI outcome enum (from auto-analyse-call's Claude prompt) to the
// existing pipeline stage labels used in src/routes/_dashboard.clinics.tsx.
const AI_OUTCOME_TO_STAGE: Record<string, string> = {
  "Not Interested": "Contacted — Not Interested",
  "No Answer": "Contacted — No Answer",
  "Left Voicemail": "Contacted — Left Voicemail",
  "Gatekeeper": "Contacted — Gatekeeper",
  "Call Me Back": "Contacted — Call Me Back",
  "Zoom Set": "Zoom Set",
  "Spoke - Interested": "Contacted — Call Me Back",
};

export type AutoCallAnalysis = {
  outcome?: string;
  next_action?: string;
  follow_up_date?: string | null;
  notes?: string;
  contact_name?: string | null;
  owner_reached?: boolean;
};

type Props = {
  callRecordId: string;
  clinicId: string;
  clinicName: string;
  analysis: AutoCallAnalysis;
  duration?: number | null;
  onClose: () => void;
  onApplied: () => void;
  onEdit: (analysis: AutoCallAnalysis) => void;
};

export function CallReviewPopup({
  callRecordId,
  clinicId,
  clinicName,
  analysis,
  duration,
  onClose,
  onApplied,
  onEdit,
}: Props) {
  const [saving, setSaving] = useState(false);

  const stage = analysis.outcome ? AI_OUTCOME_TO_STAGE[analysis.outcome] : null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // 1. Insert a clinic_contacts row capturing the call.
      await supabase.from("clinic_contacts").insert({
        clinic_id: clinicId,
        contact_type: "Call",
        outcome: analysis.outcome || null,
        notes: analysis.notes || null,
        next_action: analysis.next_action || null,
        next_action_date: analysis.follow_up_date || null,
        duration: duration ? `${duration}s` : null,
      });

      // 2. Apply clinic-level fields.
      const update: Record<string, unknown> = {};
      if (stage) update.status = stage;
      if (analysis.follow_up_date) update.next_follow_up = analysis.follow_up_date;
      if (analysis.contact_name) update.owner_name = analysis.contact_name;
      if (Object.keys(update).length > 0) {
        await supabase.from("clinics").update(update).eq("id", clinicId);
      }

      // 3. Clear the review flag on the call record.
      await supabase
        .from("call_records")
        .update({ needs_review: false })
        .eq("id", callRecordId);

      onApplied();
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    await supabase
      .from("call_records")
      .update({ needs_review: false })
      .eq("id", callRecordId);
    onClose();
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-[400px] rounded-lg shadow-2xl"
      style={{ background: "#0f0f12", border: "1px solid #2a2a30" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #1f1f24" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#60a5fa" }} />
          <div>
            <div className="text-xs font-semibold text-white">AI Call Summary</div>
            <div className="text-[11px]" style={{ color: "#777" }}>
              {clinicName}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/5"
          aria-label="Close"
        >
          <X className="w-4 h-4" style={{ color: "#666" }} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 text-xs">
        <Field label="Outcome" value={stage || analysis.outcome || "—"} />
        <Field label="Notes" value={analysis.notes || "—"} multiline />
        <Field label="Next Action" value={analysis.next_action || "—"} multiline />
        <Field
          label="Follow-up"
          value={analysis.follow_up_date || "—"}
        />
        {analysis.contact_name && (
          <Field label="Contact" value={analysis.contact_name} />
        )}
      </div>

      <div
        className="flex gap-2 px-4 py-3"
        style={{ borderTop: "1px solid #1f1f24" }}
      >
        <Button
          size="sm"
          className="flex-1"
          style={{ background: "#16a34a", color: "white" }}
          onClick={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5 mr-1" />
              Looks Good
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          style={{ borderColor: "#2a2a30", color: "#ccc", background: "transparent" }}
          onClick={() => onEdit(analysis)}
          disabled={saving}
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          style={{ color: "#666" }}
          onClick={handleDismiss}
          disabled={saving}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wide mb-0.5"
        style={{ color: "#666" }}
      >
        {label}
      </div>
      <div
        className={multiline ? "text-white leading-relaxed" : "text-white"}
        style={{ wordBreak: "break-word" }}
      >
        {value}
      </div>
    </div>
  );
}
