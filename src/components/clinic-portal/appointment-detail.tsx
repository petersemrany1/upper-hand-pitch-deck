import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ClipboardList, CalendarDays, List as ListIcon, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  generateSlots, summarizeDay, dayOfWeekMonFirst, ymdLocal, effectiveHoursFor, holidayLabelFor,
  DAY_NAMES, DAY_SHORT,
  type TradingHours, type BlockedSlot, type Slot, type AvailabilityOverride,
} from "@/lib/slot-generation";
import {
  NAVY, NAVY_PALE, OUTCOME_COLORS, MONTHS, ymd, parseDateOnly,
  parseAppointmentDateTime, fmtTime, navBtn, buildMonthGrid, outcomeBtn,
  hhmmToMinLocal, describeRecurring,
  type ApptNote, type AddPattern,
} from "./shared";
import { ModalShell } from "./modal-shell";
import type { ClinicAppointment } from "@/components/ClinicPortalView";

export function NotesTrail({ appointmentId, clinicId, isAdmin }: {
  appointmentId: string; clinicId: string; isAdmin: boolean;
}) {
  const [notes, setNotes] = useState<ApptNote[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase
      .from("clinic_appointment_notes")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("created_at", { ascending: false });
    if (!error) setNotes((data ?? []) as ApptNote[]);
    setLoading(false);
  };

  useEffect(() => { void load();   }, [appointmentId]);

  const addNote = async () => {
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const authorType: "admin" | "clinic" = isAdmin ? "admin" : "clinic";
    const authorName = userRes?.user?.user_metadata?.full_name
      ?? userRes?.user?.email
      ?? null;
    const { error } = await supabase.from("clinic_appointment_notes").insert({
      appointment_id: appointmentId,
      clinic_id: clinicId,
      author_type: authorType,
      author_name: authorName,
      body,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
    void load();
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("clinic_appointment_notes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const fmtStamp = (iso: string) =>
    new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div style={{ marginBottom: 14, paddingTop: 14, borderTop: "1px solid #e2e6ec" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Notes trail
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isAdmin ? "Add an admin note (e.g. spoke with patient — getting quotes Tuesday)…" : "Add a clinic note…"}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box", padding: 10, fontSize: 13,
            border: "1px solid #e2e6ec", borderRadius: 6, resize: "vertical",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={addNote}
            disabled={saving || !draft.trim()}
            style={{
              ...navBtn, fontSize: 12, padding: "6px 12px",
              background: NAVY, color: "#fff", borderColor: NAVY,
              opacity: saving || !draft.trim() ? 0.5 : 1,
            }}
          >
            {saving ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#6b7785" }}>Loading notes…</div>
      ) : notes.length === 0 ? (
        <div style={{ fontSize: 12, color: "#6b7785", fontStyle: "italic" }}>No notes yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((n) => {
            const isAdminNote = n.author_type === "admin";
            const bg = isAdminNote ? "#fff7ed" : "#eef5ff";
            const border = isAdminNote ? "#fcd9a8" : "#c7dcf5";
            const badgeBg = isAdminNote ? "#f59e0b" : NAVY;
            const badgeLabel = isAdminNote ? "ADMIN" : "Clinic";
            return (
              <div key={n.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", fontSize: 10, fontWeight: 700,
                      background: badgeBg, color: "#fff", borderRadius: 10, textTransform: "uppercase", letterSpacing: 0.4,
                    }}>{badgeLabel}</span>
                    {n.author_name && (
                      <span style={{ fontSize: 11, color: "#111", fontWeight: 600 }}>{n.author_name}</span>
                    )}
                    <span style={{ fontSize: 11, color: "#6b7785" }}>{fmtStamp(n.created_at)}</span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteNote(n.id)}
                      title="Delete note"
                      style={{ background: "transparent", border: "none", color: "#b83232", cursor: "pointer", fontSize: 11, padding: 2 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#111", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{n.body}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============== UNIFIED APPOINTMENT DETAIL MODAL ============== */

export function AppointmentDetailModal({ appt, isAdmin, onClose, onChange, clinicDefaultDeposit }: {
  appt: ClinicAppointment; isAdmin: boolean; onClose: () => void; onChange: () => void; clinicDefaultDeposit: number;
}) {
  const [summaryMode, setSummaryMode] = useState<null | "show" | "proceeded">(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const c = OUTCOME_COLORS[appt.outcome ?? "upcoming"];

  const setOutcome = async (outcome: "noshow" | "proceeded") => {
    const { error } = await supabase.from("clinic_appointments").update({ outcome }).eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome saved");
    onChange();
    onClose();
  };

  const resetOutcome = async () => {
    const { error } = await supabase.from("clinic_appointments").update({ outcome: null, consult_summary: null }).eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Outcome reset");
    onChange();
  };

  const deleteAppt = async () => {
    if (!confirm("Delete this appointment?")) return;
    const { error } = await supabase.from("clinic_appointments").delete().eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment deleted");
    onChange();
    onClose();
  };

  const depositAmount = appt.deposit_amount ?? clinicDefaultDeposit;
  const refundDate = appt.refund_processed_at
    ? new Date(appt.refund_processed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : "";

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastOrToday = appt.appointment_date <= todayStr;
  const needsManualRefund =
    (appt.outcome === "show" || appt.outcome === "proceeded") &&
    !appt.stripe_payment_intent_id &&
    !appt.refund_status &&
    isPastOrToday;

  const markRefundedManually = async () => {
    if (!confirm(`Mark $${depositAmount} deposit as refunded to ${appt.patient_name}?`)) return;
    const { error } = await supabase
      .from("clinic_appointments")
      .update({ refund_status: "refunded_manual", refund_processed_at: new Date().toISOString() })
      .eq("id", appt.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as refunded");
    onChange();
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 }}>{appt.patient_name}</div>
      <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 8 }}>
        {new Date(appt.appointment_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(appt.appointment_time)}
      </div>
      {appt.patient_phone && (
        <a href={`tel:${appt.patient_phone}`} style={{ fontSize: 13, color: NAVY, fontWeight: 500, display: "block", marginBottom: 10 }}>{appt.patient_phone}</a>
      )}
      <div style={{
        display: "inline-block", padding: "3px 10px", fontSize: 11, fontWeight: 600,
        background: c.bg, color: c.fg, borderRadius: 12, marginBottom: 14,
      }}>{c.label}</div>

      {appt.intel_notes && (
        <div style={{ background: NAVY_PALE, padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Patient Intel</div>
          <div style={{ fontSize: 12, color: "#111", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{appt.intel_notes}</div>
        </div>
      )}

      {appt.consult_summary && (
        <div style={{ background: NAVY_PALE, padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Consult summary</div>
          <div style={{ fontSize: 12, color: "#111", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{appt.consult_summary}</div>
        </div>
      )}

      <NotesTrail appointmentId={appt.id} clinicId={appt.clinic_id} isAdmin={isAdmin} />

      {/* Refund status cards (replace outcome buttons when applicable) */}
      {(appt.outcome === "show" || appt.outcome === "proceeded") && appt.refund_status === "refunded" && appt.stripe_refund_id && (
        <div style={{ background: "#e8f5ef", border: "1px solid #9ed4b5", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7a4a", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span> ${depositAmount} deposit refunded
          </div>
          <div style={{ fontSize: 11, color: "#1a7a4a", marginTop: 4 }}>
            Processed {refundDate} · Stripe ref {appt.stripe_refund_id}
          </div>
          <div style={{ fontSize: 11, color: "#6b7785", marginTop: 8 }}>Refund complete — no further action needed</div>
        </div>
      )}

      {(appt.outcome === "show" || appt.outcome === "proceeded") && appt.refund_status === "failed" && !appt.stripe_refund_id && (
        <div style={{ background: "#fdf0f0", border: "1px solid #f0b8b8", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#b83232", marginBottom: 6 }}>Refund failed</div>
          <div style={{ fontSize: 11, color: "#b83232", marginBottom: 10 }}>The deposit refund did not go through. Try again or process it manually in Stripe.</div>
          <button onClick={() => setSummaryMode("show")} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", background: "#b83232", color: "#fff", borderColor: "#b83232" }}>
            Retry refund
          </button>
        </div>
      )}

      {(appt.outcome === "show" || appt.outcome === "proceeded") && appt.refund_status === "refunded_manual" && (
        <div style={{ background: "#e8f5ef", border: "1px solid #9ed4b5", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7a4a", display: "flex", alignItems: "center", gap: 8 }}>
            <span>✓</span> ${depositAmount} deposit refunded (manual)
          </div>
          <div style={{ fontSize: 11, color: "#1a7a4a", marginTop: 4 }}>Marked refunded on {refundDate}</div>
          <div style={{ fontSize: 11, color: "#6b7785", marginTop: 8 }}>Patient was refunded outside Stripe (e.g. bank transfer)</div>
        </div>
      )}

      {needsManualRefund && isAdmin && (
        <div style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>Refund pending — paid outside Stripe</div>
          <div style={{ fontSize: 11, color: "#92400e", marginBottom: 10 }}>No Stripe payment on file. Once you've refunded ${depositAmount} to {appt.patient_name} directly, mark it here.</div>
          <button onClick={markRefundedManually} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", background: "#92400e", color: "#fff", borderColor: "#92400e" }}>
            Mark deposit refunded
          </button>
        </div>
      )}

      {!appt.outcome && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setSummaryMode("show")} style={outcomeBtn("#1a7a4a", "#e8f5ef")}>✅ They showed up</button>
          <button onClick={() => setSummaryMode("proceeded")} style={outcomeBtn("#6b3fa0", "#f3eefa")}>⭐ They booked the procedure!</button>
          <button onClick={() => setOutcome("noshow")} style={outcomeBtn("#b83232", "#fdf0f0")}>❌ No show</button>
          <button onClick={() => setRescheduleMode(true)} style={outcomeBtn("#2d5fa0", "#edf2f9")}>📅 Reschedule</button>
        </div>
      )}

      {(appt.outcome || isAdmin) && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e2e6ec", display: "flex", flexDirection: "column", gap: 8 }}>
          {appt.outcome && !appt.stripe_refund_id && (
            <button onClick={resetOutcome} style={{ ...navBtn, fontSize: 12, padding: "6px 10px" }}>Reset outcome</button>
          )}
          {isAdmin && (
            <button onClick={deleteAppt} style={{ ...navBtn, fontSize: 12, padding: "6px 10px", color: "#b83232", borderColor: "#f0b8b8" }}>Delete appointment</button>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Close</button>
      </div>

      {summaryMode && (
        <ConsultSummaryModal
          appt={appt}
          defaultProceeded={summaryMode === "proceeded"}
          clinicDefaultDeposit={clinicDefaultDeposit}
          onClose={() => setSummaryMode(null)}
          onSaved={() => { setSummaryMode(null); onChange(); onClose(); }}
        />
      )}
      {rescheduleMode && (
        <RescheduleModal
          appt={appt}
          onClose={() => setRescheduleMode(false)}
          onSaved={() => { setRescheduleMode(false); onChange(); onClose(); }}
        />
      )}
    </ModalShell>
  );
}

export function RescheduleModal({ appt, onClose, onSaved }: {
  appt: ClinicAppointment; onClose: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState<string>(appt.appointment_date);
  const timeInit = /^(\d{1,2}):(\d{2})/.exec(appt.appointment_time ?? "");
  const [time, setTime] = useState<string>(timeInit ? `${timeInit[1].padStart(2, "0")}:${timeInit[2]}` : "09:00");
  const [saving, setSaving] = useState(false);

  const oldLabel = `${new Date(appt.appointment_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} ${fmtTime(appt.appointment_time)}`;

  const save = async () => {
    if (!date || !time) { toast.error("Pick a date and time"); return; }
    if (date === appt.appointment_date && time === appt.appointment_time) {
      toast.error("That's the same date and time");
      return;
    }
    setSaving(true);
    const newLabel = `${new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} ${fmtTime(time)}`;
    const stamp = new Date().toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
    const auditLine = `\n— Rescheduled from ${oldLabel} → ${newLabel} (${stamp})`;
    const nextNotes = (appt.intel_notes ?? "") + auditLine;

    const { error } = await supabase
      .from("clinic_appointments")
      .update({ appointment_date: date, appointment_time: time, intel_notes: nextNotes })
      .eq("id", appt.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rescheduled");
    onSaved();
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>Reschedule appointment</div>
      <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 14 }}>{appt.patient_name} · currently {oldLabel}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5 }}>New date</span>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #d4dae3", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5 }}>New time</span>
          <input
            type="time"
            value={time}
            step={300}
            onChange={(e) => setTime(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #d4dae3", borderRadius: 6 }}
          />
        </label>
      </div>

      <div style={{ fontSize: 11, color: "#6b7785", marginTop: 12, lineHeight: 1.5 }}>
        Reminder SMSes (3-day and 24-hour) will re-send for the new date. A note will be added to the Patient Intel for your records.
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} disabled={saving} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button
          onClick={save}
          disabled={saving}
          style={{ ...navBtn, fontSize: 13, background: NAVY, color: "#fff", borderColor: NAVY, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save new date"}
        </button>
      </div>
    </ModalShell>
  );
}


export function ConsultSummaryModal({ appt, onClose, onSaved, defaultProceeded = false, clinicDefaultDeposit }: { appt: ClinicAppointment; onClose: () => void; onSaved: () => void; defaultProceeded?: boolean; clinicDefaultDeposit: number }) {
  const [notes, setNotes] = useState(appt.consult_summary ?? "");
  const [proceeded, setProceeded] = useState(defaultProceeded);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lazy-resolved Stripe info for legacy appointments where the payment intent
  // wasn't saved on the row at booking time. Starts with whatever's on the row;
  // gets filled in on mount via Stripe lookup.
  const [resolvedPiId, setResolvedPiId] = useState<string | null>(appt.stripe_payment_intent_id);
  const [resolvedDeposit, setResolvedDeposit] = useState<number | null>(appt.deposit_amount);
  const [resolving, setResolving] = useState(!appt.stripe_payment_intent_id && !appt.stripe_refund_id);

  useEffect(() => {
    if (appt.stripe_payment_intent_id || appt.stripe_refund_id) return;
    let cancelled = false;
    void (async () => {
      try {
        const { resolveAppointmentDeposit } = await import("@/utils/consult-outcome.functions");
        const r = await resolveAppointmentDeposit({ data: { appointmentId: appt.id } });
        if (cancelled) return;
        if (r.success) {
          setResolvedPiId(r.paymentIntentId ?? null);
          if (r.depositAmount != null) setResolvedDeposit(r.depositAmount);
        }
      } catch { /* keep falling back to "no payment intent" copy */ }
      finally { if (!cancelled) setResolving(false); }
    })();
    return () => { cancelled = true; };
  }, [appt.id, appt.stripe_payment_intent_id, appt.stripe_refund_id]);

  const depositAmount = resolvedDeposit ?? clinicDefaultDeposit;
  const alreadyRefunded = !!appt.stripe_refund_id;
  const noPaymentIntent = !resolvedPiId;

  const submitLabel = alreadyRefunded
    ? "Save & close"
    : resolving
      ? "Checking payment…"
      : noPaymentIntent
        ? "Save & notify Admin"
        : `Save & refund $${depositAmount}`;

  const save = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const { processConsultOutcome } = await import("@/utils/consult-outcome.functions");
      const result = await processConsultOutcome({
        data: {
          appointmentId: appt.id,
          summary: notes,
          proceeded,
        },
      });
      if (!result.success) {
        setErrorMsg(`Refund failed — ${result.error}. Please try again or contact Admin.`);
        setSaving(false);
        // Outcome may still have been saved; surface that via a soft toast.
        if ("outcomeSaved" in result && result.outcomeSaved) {
          toast.success("Outcome saved (refund failed)");
          onSaved();
        }
        return;
      }
      toast.success(result.refunded ? `Refunded $${depositAmount}` : "Saved");
      setSaving(false);
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(`Refund failed — ${msg}. Please try again or contact Admin.`);
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 4 }}>How did the consult go?</div>
      <div style={{ fontSize: 12, color: "#6b7785", marginBottom: 14 }}>{appt.patient_name} · {fmtTime(appt.appointment_time)}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7785", textTransform: "uppercase", marginBottom: 6 }}>Notes from today</div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What was discussed? How did the patient seem? Any follow-up needed?"
        rows={5}
        style={{ width: "100%", padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8, resize: "vertical", outline: "none", marginBottom: 12, color: "#111" }}
        className="clinic-consult-textarea"
      />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111", marginBottom: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={proceeded} onChange={(e) => setProceeded(e.target.checked)} />
        The patient booked their procedure today
      </label>

      {alreadyRefunded ? (
        <div style={{ background: "#e8f5ef", border: "1px solid #9ed4b5", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1a7a4a" }}>Deposit already refunded</div>
          <div style={{ fontSize: 11, color: "#1a7a4a", marginTop: 4 }}>Stripe ref {appt.stripe_refund_id}</div>
        </div>
      ) : resolving ? (
        <div style={{ background: "#f0f2f5", border: "1px solid #e2e6ec", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#6b7785" }}>Checking payment details…</div>
        </div>
      ) : noPaymentIntent ? (
        <div style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 4 }}>Patient didn't pay via Stripe</div>
          <div style={{ fontSize: 11, color: "#92400e" }}>This deposit wasn't taken through our payment system (likely paid by direct deposit or another method). No refund will be processed from here — the Admin team will be in contact with the patient to arrange the refund directly.</div>
        </div>
      ) : (
        <div style={{ background: "#fef3c7", border: "1px solid #d97706", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>Deposit refund</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e", marginTop: 2 }}>${depositAmount}</div>
          <div style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>Will be refunded to the patient's card on submit</div>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#fdf0f0", border: "1px solid #f0b8b8", color: "#b83232", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving || resolving} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: (saving || resolving) ? "not-allowed" : "pointer", opacity: (saving || resolving) ? 0.5 : 1 }}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
      {/* Reference for unused-prop linter */}
      
    </ModalShell>
  );
}


export function AddAppointmentModal({ clinicId, onClose, onSaved }: { clinicId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !date || !time) { toast.error("Patient name, date and time required"); return; }
    // Guard against typos like year 0005 — date must be between 2024 and 2100.
    const y = Number(date.slice(0, 4));
    if (!Number.isFinite(y) || y < 2024 || y > 2100) {
      toast.error("Please enter a valid appointment date");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clinic_appointments").insert({
      clinic_id: clinicId,
      patient_name: name.trim(),
      patient_phone: phone.trim() || null,
      appointment_date: date,
      appointment_time: time,
      intel_notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment added");
    onSaved();
  };

  const inp: React.CSSProperties = { width: "100%", padding: 10, fontSize: 13, border: "1px solid #e2e6ec", borderRadius: 8, outline: "none", marginBottom: 12 };

  return (
    <ModalShell onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 14 }}>Add appointment</div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Patient name" style={inp} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inp} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input type="date" value={date} min="2024-01-01" max="2100-01-01" onChange={(e) => setDate(e.target.value)} style={inp} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inp} />

      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Intel notes (visible to clinic)" rows={3} style={{ ...inp, resize: "vertical" }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ ...navBtn, fontSize: 13 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
          Save
        </button>
      </div>
    </ModalShell>
  );
}

