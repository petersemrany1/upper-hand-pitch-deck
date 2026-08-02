import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sydneyTodayISO } from "@/lib/timezone";
import { toast } from "sonner";
import { ChevronLeft, Clock, User, AlertTriangle, FileText, ExternalLink, Images, Box, Sparkles } from "lucide-react";
import { ClinicFlowQuoteBuilder } from "@/components/ClinicFlowQuoteBuilder";
import { ClinicFlowPresentGallery, type PresentPhoto } from "@/components/ClinicFlowPresentGallery";
import { useServerFn } from "@tanstack/react-start";
import { getClinicflowGalleryPhotos } from "@/lib/clinicflow-phase4.functions";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";
const GREEN = "#15803d";
const GREEN_BG = "#dcfce7";
const AMBER_BG = "#fff7ed";
const AMBER_FG = "#9a3412";

type Appt = {
  id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  appointment_date: string;
  appointment_time: string;
  intel_notes: string | null;
};

type Intake = {
  id: string;
  appointment_id: string;
  status: "in_progress" | "completed";
  completed_at: string | null;
  confirmed_name: string | null;
  dob: string | null;
  mobile: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_details: string | null;
  medications: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  previous_treatments: string | null;
  hair_answers: Record<string, string> | null;
  wellbeing_answers: Record<string, string> | null;
  wellbeing_review: boolean;
};

function fmtTime(t: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${min}${ampm}`;
}

/** Full-screen consult view for one appointment. Loads its own appointment + intake. */
export function ClinicFlowConsult({ clinicId, appointmentId, onBack }: { clinicId: string; appointmentId: string; onBack: () => void }) {
  const [appt, setAppt] = useState<Appt | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: a, error: aErr }, { data: i }] = await Promise.all([
        supabase
          .from("clinic_appointments")
          .select("id, patient_name, patient_phone, patient_email, appointment_date, appointment_time, intel_notes")
          .eq("id", appointmentId)
          .maybeSingle(),
        supabase
          .from("clinicflow_intakes")
          .select("*")
          .eq("appointment_id", appointmentId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (aErr) toast.error(aErr.message);
      setAppt((a ?? null) as Appt | null);
      setIntake((i ?? null) as Intake | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [appointmentId]);

  if (loading || !appt) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: GREY, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        {loading ? "Loading…" : "Appointment not found."}
      </div>
    );
  }

  return <PatientDetail appt={appt} intake={intake} clinicId={clinicId} onBack={onBack} />;
}

function PatientDetail({ appt, intake, clinicId, onBack }: { appt: Appt; intake: Intake | null; clinicId: string; onBack: () => void }) {
  const loadGallery = useServerFn(getClinicflowGalleryPhotos);
  const [galleryMode, setGalleryMode] = useState<"timeline" | "before_after" | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [timelinePhotos, setTimelinePhotos] = useState<PresentPhoto[] | null>(null);
  const [beforeAfterPhotos, setBeforeAfterPhotos] = useState<PresentPhoto[] | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("clinicflow_clinic_settings")
        .select("follicle_model_url")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (!cancelled) setModelUrl((data?.follicle_model_url as string | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const openGallery = async (mode: "timeline" | "before_after") => {
    setGalleryMode(mode);
    if (timelinePhotos === null || beforeAfterPhotos === null) {
      setGalleryLoading(true);
      try {
        const { timeline, beforeAfter } = await loadGallery({ data: { clinicId } });
        setTimelinePhotos(timeline as PresentPhoto[]);
        setBeforeAfterPhotos(beforeAfter as PresentPhoto[]);
      } catch {
        setTimelinePhotos([]);
        setBeforeAfterPhotos([]);
      }
      setGalleryLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: NAVY, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <ChevronLeft size={16} /> Back to Patients
        </button>
        {intake?.status !== "completed" && (
          <button
            onClick={() => { window.location.href = `/kiosk/${appt.id}`; }}
            style={{ background: "#fff", border: `1px solid ${LINE}`, color: NAVY, fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}
          >
            {intake ? "Resume check-in" : "Start check-in"}
          </button>
        )}
      </div>

      {/* Consult toolkit */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 20, background: "#fff",
          border: `1px solid ${LINE}`, borderRadius: 12, padding: 10, marginBottom: 16,
          display: "flex", gap: 8, alignItems: "center", overflowX: "auto",
          boxShadow: "0 1px 3px rgba(26,58,107,0.06)",
        }}
      >
        <ToolPill icon={<Images size={15} />} label="Before & after" onClick={() => void openGallery("before_after")} />
        <ToolPill icon={<Clock size={15} />} label="Timeline" onClick={() => void openGallery("timeline")} />
        {modelUrl && (
          <ToolPill icon={<Box size={15} />} label="Model" onClick={() => window.open(modelUrl, "_blank")} />
        )}

        <ToolPill
          icon={<Sparkles size={15} />}
          label="Simulator"
          note="Coming soon"
          disabled
          onClick={() => toast("Simulator coming soon")}
        />
        <ToolPill icon={<FileText size={15} />} label="Quote" primary onClick={() => setShowBuilder(true)} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 44, height: 44, borderRadius: 999, background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", color: NAVY }}>
            <User size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>{appt.patient_name}</div>
            <div style={{ fontSize: 13, color: GREY }}>
              {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(appt.appointment_time)}
            </div>
          </div>
          {intake?.status === "completed" ? (
            <span style={{ background: GREEN_BG, color: GREEN, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Check-in complete</span>
          ) : intake ? (
            <span style={{ background: AMBER_BG, color: AMBER_FG, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>In progress</span>
          ) : (
            <span style={{ background: "#eef2f7", color: "#334155", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Not checked in</span>
          )}
        </div>

        {intake?.wellbeing_review && (
          <div style={{ marginTop: 16, background: AMBER_BG, border: `1px solid #fcd9a8`, color: AMBER_FG, padding: "12px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} /> Take a moment on wellbeing before talking treatment.
          </div>
        )}
      </div>

      {intake ? (
        <>
          <Section title="Patient details">
            <KV label="Full name" value={intake.confirmed_name} />
            <KV label="Date of birth" value={intake.dob} />
            <KV label="Mobile" value={intake.mobile} />
            <KV label="Email" value={intake.email} />
            <KV label="Emergency contact" value={[intake.emergency_contact_name, intake.emergency_contact_phone].filter(Boolean).join(" · ") || null} />
            <KV label="GP" value={intake.gp_details} />
            <KV label="Medications" value={intake.medications} multiline />
            <KV label="Allergies" value={intake.allergies} multiline />
            <KV label="Medical conditions" value={intake.medical_conditions} multiline />
            <KV label="Previous hair treatments" value={intake.previous_treatments} multiline />
          </Section>

          <Section title="Their hair">
            {HAIR_QUESTIONS.map((q) => (
              <KV key={q.key} label={q.label} value={intake.hair_answers?.[q.key] ?? null} multiline={q.type === "text"} />
            ))}
          </Section>

          <Section title="A bit about them">
            {WELLBEING_QUESTIONS.map((q) => (
              <KV key={q.key} label={q.label} value={intake.wellbeing_answers?.[q.key] ?? null} multiline />
            ))}
          </Section>
        </>
      ) : (
        <div style={{ background: "#fff", border: `1px dashed ${LINE}`, borderRadius: 12, padding: 24, color: GREY, fontSize: 13, textAlign: "center" }}>
          Patient hasn't started their check-in yet.
        </div>
      )}

      <Section title="Patient Intel">
        {appt.intel_notes ? (
          <div style={{ fontSize: 13, color: "#111", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{appt.intel_notes}</div>
        ) : (
          <div style={{ fontSize: 13, color: GREY }}>No intel notes yet.</div>
        )}
      </Section>

      <Section title="Contact details">
        <KV label="Phone" value={appt.patient_phone} />
        <KV label="Email" value={appt.patient_email} />
      </Section>

      <QuotesForAppointment
        clinicId={clinicId}
        appointmentId={appt.id}
        intakeId={intake?.id ?? null}
        patientName={appt.patient_name}
        showBuilder={showBuilder}
        setShowBuilder={setShowBuilder}
      />

      {galleryMode && (
        <ClinicFlowPresentGallery
          mode={galleryMode}
          photos={(galleryMode === "before_after" ? beforeAfterPhotos : timelinePhotos) ?? []}
          loading={galleryLoading}
          onClose={() => setGalleryMode(null)}
        />
      )}
    </div>
  );
}

function ToolPill({
  icon, label, note, onClick, disabled, primary,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        background: primary ? NAVY : disabled ? "#f4f6f9" : "#fff",
        color: primary ? "#fff" : disabled ? "#a3adba" : NAVY,
        border: primary ? "none" : `1px solid ${LINE}`,
        padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 7,
      }}
    >
      {icon} {label}
      {note && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#a3adba", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {note}
        </span>
      )}
    </button>
  );
}

function QuotesForAppointment({ clinicId, appointmentId, intakeId, patientName, showBuilder, setShowBuilder }: { clinicId: string; appointmentId: string; intakeId: string | null; patientName: string; showBuilder: boolean; setShowBuilder: (v: boolean) => void }) {
  const [rows, setRows] = useState<Array<{ id: string; price: number; status: string; valid_until: string; created_at: string }>>([]);
  const [resolvedClinicId, setResolvedClinicId] = useState<string>(clinicId);
  const [tick, setTick] = useState(0);
  const today = useMemo(() => sydneyTodayISO(), []);

  useEffect(() => {
    (async () => {
      let cid = clinicId;
      if (!cid) {
        const { data } = await supabase.from("clinic_appointments").select("clinic_id").eq("id", appointmentId).maybeSingle();
        cid = (data?.clinic_id as string | undefined) ?? "";
        setResolvedClinicId(cid);
      }
      const { data } = await supabase
        .from("clinicflow_quotes")
        .select("id, price, status, valid_until, created_at")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as typeof rows);
    })();
  }, [clinicId, appointmentId, tick]);

  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: NAVY }}>Quotes</div>
        <button onClick={() => setShowBuilder(true)}
          style={{ background: NAVY, color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} /> Create quote
        </button>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: GREY }}>No quotes yet for this consult.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => {
            const expired = r.status !== "booked" && r.status !== "deposit_recorded" && r.valid_until < today;
            const chip = expired
              ? { text: "Expired", bg: "#fee2e2", fg: "#991b1b" }
              : r.status === "deposit_recorded" ? { text: "Deposit ✓", bg: GREEN_BG, fg: GREEN }
              : r.status === "booked" ? { text: "Booked", bg: GREEN_BG, fg: GREEN }
              : { text: "Quoted", bg: AMBER_BG, fg: AMBER_FG };
            return (
              <div key={r.id} onClick={() => window.open(`/clinic-quote/${r.id}`, "_blank")}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 10, cursor: "pointer" }}>
                <FileText size={14} color={GREY} />
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: NAVY }}>${Math.round(r.price).toLocaleString()}</div>
                <div style={{ fontSize: 12, color: expired ? "#991b1b" : GREY }}>valid until {new Date(r.valid_until + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                <span style={{ background: chip.bg, color: chip.fg, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{chip.text}</span>
                <ExternalLink size={12} color={GREY} />
              </div>
            );
          })}
        </div>
      )}

      {showBuilder && resolvedClinicId && (
        <ClinicFlowQuoteBuilder
          clinicId={resolvedClinicId}
          appointmentId={appointmentId}
          intakeId={intakeId}
          defaultPatientName={patientName}
          onClose={() => setShowBuilder(false)}
          onCreated={(id) => {
            setShowBuilder(false);
            setTick((n) => n + 1);
            window.open(`/clinic-quote/${id}`, "_blank");
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: NAVY, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function KV({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: multiline ? "block" : "grid", gridTemplateColumns: multiline ? undefined : "180px 1fr", gap: multiline ? 4 : 12, alignItems: "start" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: GREY }}>{label}</div>
      <div style={{ fontSize: 13, color: "#111", whiteSpace: multiline ? "pre-wrap" : "normal", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

// Shared question definitions (also used by the kiosk).
export const HAIR_QUESTIONS: { key: string; label: string; type: "choice" | "text"; options?: string[] }[] = [
  { key: "duration", label: "How long have you noticed the thinning?", type: "choice", options: ["Under a year", "1–3 years", "3–5 years", "5+ years"] },
  { key: "area", label: "Where do you notice it most?", type: "choice", options: ["Hairline", "Temples", "Crown", "All over"] },
  { key: "why_now", label: "What made you book in now?", type: "text" },
  { key: "if_sorted", label: "If it was sorted, what would be different for you?", type: "text" },
  { key: "stage", label: "Where are you at?", type: "choice", options: ["Just researching", "Weighing up a couple of clinics", "Ready to book once I'm confident it's right"] },
  { key: "worries", label: "Anything you're unsure or worried about?", type: "text" },
];

export const WELLBEING_QUESTIONS: { key: string; label: string; type: "choice" | "text"; options?: string[] }[] = [
  { key: "thinking", label: "How often do you find yourself thinking about your hair?", type: "choice", options: ["Rarely", "Sometimes", "Most days", "Many times a day"] },
  { key: "affect", label: "Does it affect your day-to-day — avoiding photos, social plans, feeling low about it?", type: "choice", options: ["Not really", "A little", "Quite a bit", "A lot"] },
  { key: "other_concerns", label: "Are there other parts of your appearance that worry you as much or more?", type: "text" },
  { key: "gp_recent", label: "In the last year, have you spoken to a GP or counsellor about stress, mood or how you're feeling?", type: "choice", options: ["No", "Yes"] },
];

export function computeWellbeingReview(a: Record<string, string>): boolean {
  return a.thinking === "Many times a day"
    || a.affect === "A lot"
    || (typeof a.other_concerns === "string" && a.other_concerns.trim().length > 0 && !/^no\.?$/i.test(a.other_concerns.trim()));
}
