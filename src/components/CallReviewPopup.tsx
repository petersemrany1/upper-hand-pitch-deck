import { useEffect, useState } from "react";
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

const OUTCOME_OPTIONS = [
  "Not Interested",
  "No Answer",
  "Left Voicemail",
  "Gatekeeper",
  "Call Me Back",
  "Zoom Set",
  "Spoke - Interested",
];

export type AutoCallAnalysis = {
  outcome?: string;
  next_action?: string;
  follow_up_date?: string | null;
  follow_up_time?: string | null;
  notes?: string;
  contact_name?: string | null;
  owner_reached?: boolean;
};

// Result handed back to onApplied so callers can patch local state instantly
// (issue #4 — page must update without a refresh).
export type AppliedReview = {
  callRecordId: string;
  clinicId: string;
  stage: string | null;
  followUpDate: string | null;
  ownerName: string | null;
  nextAction: string | null;
};

type Props = {
  callRecordId: string;
  clinicId: string;
  clinicName: string;
  analysis: AutoCallAnalysis;
  duration?: number | null;
  onClose: () => void;
  onApplied: (result: AppliedReview) => void;
};

export function CallReviewPopup({
  callRecordId,
  clinicId,
  clinicName,
  analysis,
  duration,
  onClose,
  onApplied,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editable copy of the AI analysis — pre-filled with Claude's values so
  // toggling Edit never wipes Peter's data (issue #3).
  const [outcome, setOutcome] = useState(analysis.outcome || "Spoke - Interested");
  const [notes, setNotes] = useState(analysis.notes || "");
  const [nextAction, setNextAction] = useState(analysis.next_action || "");
  const [followUpDate, setFollowUpDate] = useState(
    analysis.follow_up_date ? String(analysis.follow_up_date).slice(0, 10) : "",
  );
  const [followUpTime, setFollowUpTime] = useState(analysis.follow_up_time || "");
  const [contactName, setContactName] = useState(analysis.contact_name || "");

  // Re-sync local state if the analysis prop changes (rare, but happens when
  // Peter switches between items in the inbox without unmounting).
  useEffect(() => {
    setOutcome(analysis.outcome || "Spoke - Interested");
    setNotes(analysis.notes || "");
    setNextAction(analysis.next_action || "");
    setFollowUpDate(
      analysis.follow_up_date ? String(analysis.follow_up_date).slice(0, 10) : "",
    );
    setFollowUpTime(analysis.follow_up_time || "");
    setContactName(analysis.contact_name || "");
  }, [analysis]);

  const stage = outcome ? AI_OUTCOME_TO_STAGE[outcome] : null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const followDate = followUpDate ? followUpDate.slice(0, 10) : null;

      // 1. Activity timeline row.
      await supabase.from("clinic_contacts").insert({
        clinic_id: clinicId,
        contact_type: "Call",
        outcome: outcome || null,
        notes: notes || null,
        next_action: nextAction || null,
        next_action_date: followDate,
        next_action_time: followUpTime || null,
        duration: duration ? `${duration}s` : null,
      });

      // 2. CRM row update.
      const update: { status?: string; next_follow_up?: string; owner_name?: string } = {};
      if (stage) update.status = stage;
      if (followDate) update.next_follow_up = followDate;
      if (contactName) update.owner_name = contactName;
      if (Object.keys(update).length > 0) {
        await supabase.from("clinics").update(update).eq("id", clinicId);
      }

      // 3. Clear review flag.
      await supabase
        .from("call_records")
        .update({ needs_review: false })
        .eq("id", callRecordId);

      onApplied({
        callRecordId,
        clinicId,
        stage: stage || null,
        followUpDate: followDate,
        ownerName: contactName || null,
        nextAction: nextAction || null,
      });
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
      className="fixed bottom-4 right-4 z-[60] w-[420px] rounded-lg shadow-2xl"
      style={{ background: "#ffffff", border: "1px solid #ebebeb" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #ebebeb" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#60a5fa" }} />
          <div>
            <div className="text-xs font-semibold text-[#111111]">
              {editing ? "Edit AI Summary" : "AI Call Summary"}
            </div>
            <div className="text-[11px]" style={{ color: "#666" }}>
              {clinicName}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#ffffff]/5"
          aria-label="Close"
        >
          <X className="w-4 h-4" style={{ color: "#666" }} />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
        {editing ? (
          <>
            <EditField label="Outcome">
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full rounded px-2 py-1.5 text-xs border-0"
                style={{ background: "#f9f9f9", color: "#fff" }}
              >
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </EditField>
            <EditField label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded px-2 py-1.5 text-xs border-0 resize-none"
                style={{ background: "#f9f9f9", color: "#fff" }}
              />
            </EditField>
            <EditField label="Next Action">
              <textarea
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                rows={2}
                className="w-full rounded px-2 py-1.5 text-xs border-0 resize-none"
                style={{ background: "#f9f9f9", color: "#fff" }}
              />
            </EditField>
            <div className="grid grid-cols-2 gap-2">
              <EditField label="Follow-up Date">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded px-2 py-1.5 text-xs border-0"
                  style={{ background: "#f9f9f9", color: "#fff" }}
                />
              </EditField>
              <EditField label="Follow-up Time">
                <input
                  type="text"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  placeholder="e.g. 9am or 9–12"
                  className="w-full rounded px-2 py-1.5 text-xs border-0"
                  style={{ background: "#f9f9f9", color: "#fff" }}
                />
              </EditField>
            </div>
            <EditField label="Contact Name">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded px-2 py-1.5 text-xs border-0"
                style={{ background: "#f9f9f9", color: "#fff" }}
              />
            </EditField>
          </>
        ) : (
          <>
            <Field label="Outcome" value={stage || outcome || "—"} />
            <Field label="Notes" value={notes || "—"} multiline />
            <Field label="Next Action" value={nextAction || "—"} multiline />
            <Field
              label="Follow-up"
              value={
                followUpDate
                  ? `${followUpDate}${followUpTime ? ` · ${followUpTime}` : ""}`
                  : followUpTime || "—"
              }
            />
            {contactName && <Field label="Contact" value={contactName} />}
          </>
        )}
      </div>

      <div
        className="flex gap-2 px-4 py-3"
        style={{ borderTop: "1px solid #ebebeb" }}
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
              {editing ? "Save & Apply" : "Looks Good"}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          style={{ borderColor: "#ebebeb", color: "#999", background: "transparent" }}
          onClick={() => setEditing((v) => !v)}
          disabled={saving}
        >
          <Pencil className="w-3.5 h-3.5 mr-1" />
          {editing ? "Preview" : "Edit"}
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
        className={multiline ? "text-[#111111] leading-relaxed" : "text-[#111111]"}
        style={{ wordBreak: "break-word" }}
      >
        {value}
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wide mb-1"
        style={{ color: "#999" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
