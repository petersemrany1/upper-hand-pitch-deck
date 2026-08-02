import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HAIR_QUESTIONS, WELLBEING_QUESTIONS, computeWellbeingReview } from "@/components/ClinicFlowConsult";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/kiosk/$appointmentId")({
  head: () => ({ meta: [{ title: "Patient check-in" }] }),
  component: KioskPage,
});

const NAVY = "#1a3a6b";
const NAVY_PALE = "#edf2f9";
const LINE = "#e2e6ec";
const GREY = "#6b7785";

type Appt = {
  id: string;
  clinic_id: string;
  lead_id: string | null;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
};

type Intake = {
  id: string;
  status: "in_progress" | "completed";
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
};

type Details = {
  confirmed_name: string;
  dob: string;
  mobile: string;
  email: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  gp_details: string;
  medications: string;
  allergies: string;
  medical_conditions: string;
  previous_treatments: string;
};

function emptyDetails(): Details {
  return {
    confirmed_name: "", dob: "", mobile: "", email: "",
    emergency_contact_name: "", emergency_contact_phone: "",
    gp_details: "", medications: "", allergies: "", medical_conditions: "", previous_treatments: "",
  };
}

function KioskPage() {
  const { appointmentId } = useParams({ from: "/kiosk/$appointmentId" });
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appt, setAppt] = useState<Appt | null>(null);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [kioskPin, setKioskPin] = useState<string>("0000");

  const [step, setStep] = useState(0); // 0..3 (3 = done)
  const [details, setDetails] = useState<Details>(emptyDetails());
  const [hair, setHair] = useState<Record<string, string>>({});
  const [wellbeing, setWellbeing] = useState<Record<string, string>>({});

  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinAttempt, setPinAttempt] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load appointment + existing intake + settings.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: apptRow, error: apptErr } = await supabase
        .from("clinic_appointments")
        .select("id, clinic_id, lead_id, patient_name, patient_phone, patient_email")
        .eq("id", appointmentId)
        .maybeSingle();
      if (cancelled) return;
      if (apptErr || !apptRow) {
        setLoadError(apptErr?.message ?? "Appointment not found. Ask staff for help.");
        setReady(true);
        return;
      }
      setAppt(apptRow as Appt);

      const [{ data: intakeRow }, { data: settingsRow }] = await Promise.all([
        supabase.from("clinicflow_intakes").select("*").eq("appointment_id", appointmentId).maybeSingle(),
        supabase.from("clinicflow_clinic_settings").select("kiosk_pin").eq("clinic_id", apptRow.clinic_id).maybeSingle(),
      ]);
      if (cancelled) return;

      if (settingsRow?.kiosk_pin) setKioskPin(String(settingsRow.kiosk_pin));

      if (intakeRow) {
        const r = intakeRow as unknown as Intake;
        setIntakeId(r.id);
        setDetails({
          confirmed_name: r.confirmed_name ?? apptRow.patient_name ?? "",
          dob: r.dob ?? "",
          mobile: r.mobile ?? apptRow.patient_phone ?? "",
          email: r.email ?? apptRow.patient_email ?? "",
          emergency_contact_name: r.emergency_contact_name ?? "",
          emergency_contact_phone: r.emergency_contact_phone ?? "",
          gp_details: r.gp_details ?? "",
          medications: r.medications ?? "",
          allergies: r.allergies ?? "",
          medical_conditions: r.medical_conditions ?? "",
          previous_treatments: r.previous_treatments ?? "",
        });
        setHair(r.hair_answers ?? {});
        setWellbeing(r.wellbeing_answers ?? {});
        if (r.status === "completed") setStep(3);
      } else {
        setDetails((d) => ({
          ...d,
          confirmed_name: apptRow.patient_name ?? "",
          mobile: apptRow.patient_phone ?? "",
          email: apptRow.patient_email ?? "",
        }));
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [appointmentId]);

  // Debounced autosave whenever answers change (once we have an appt).
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready || !appt || step === 3) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void autosave(); }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details, hair, wellbeing, ready]);

  const autosave = async () => {
    if (!appt) return;
    const payload = {
      clinic_id: appt.clinic_id,
      appointment_id: appt.id,
      lead_id: appt.lead_id,
      status: "in_progress" as const,
      confirmed_name: details.confirmed_name || null,
      dob: details.dob || null,
      mobile: details.mobile || null,
      email: details.email || null,
      emergency_contact_name: details.emergency_contact_name || null,
      emergency_contact_phone: details.emergency_contact_phone || null,
      gp_details: details.gp_details || null,
      medications: details.medications || null,
      allergies: details.allergies || null,
      medical_conditions: details.medical_conditions || null,
      previous_treatments: details.previous_treatments || null,
      hair_answers: hair,
      wellbeing_answers: wellbeing,
      wellbeing_review: computeWellbeingReview(wellbeing),
    };
    const { data, error } = await supabase
      .from("clinicflow_intakes")
      .upsert(payload, { onConflict: "appointment_id" })
      .select("id")
      .maybeSingle();
    if (!error && data?.id) setIntakeId(data.id);
  };

  const complete = async () => {
    if (!appt) return;
    setSubmitting(true);
    await autosave();
    const { error } = await supabase
      .from("clinicflow_intakes")
      .update({ status: "completed", completed_at: new Date().toISOString(), wellbeing_review: computeWellbeingReview(wellbeing) })
      .eq("appointment_id", appt.id);
    setSubmitting(false);
    if (error) {
      alert("Couldn't save — please ask staff for help.");
      return;
    }
    setStep(3);
  };

  const tryStaffExit = () => {
    setPinAttempt("");
    setPinError(null);
    setShowPinPrompt(true);
  };

  const submitPin = () => {
    if (pinAttempt.trim() === String(kioskPin).trim()) {
      navigate({ to: "/clinic-portal" });
    } else {
      setPinError("Wrong PIN.");
    }
  };

  const progress = useMemo(() => {
    return [0, 1, 2, 3].map((i) => ({ i, active: i === step, done: i < step }));
  }, [step]);

  if (!ready) {
    return (
      <div style={fullscreenStyle}>
        <Loader2 size={28} className="animate-spin" color={NAVY} />
      </div>
    );
  }
  if (loadError || !appt) {
    return (
      <div style={{ ...fullscreenStyle, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 20, color: NAVY, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 15, color: GREY, maxWidth: 420 }}>{loadError}</div>
      </div>
    );
  }

  const canNext =
    step === 0 ? details.confirmed_name.trim().length > 0
    : step === 1 ? HAIR_QUESTIONS.every((q) => (hair[q.key] ?? "").trim().length > 0)
    : step === 2 ? WELLBEING_QUESTIONS.every((q) => (wellbeing[q.key] ?? "").trim().length > 0)
    : false;

  return (
    <div style={{ ...fullscreenStyle, alignItems: "stretch", justifyContent: "flex-start", padding: 0, background: "#f6f8fb" }}>
      {/* Top bar */}
      <div style={{ padding: "18px 28px", background: "#fff", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Patient check-in</div>
        <div style={{ display: "flex", gap: 8 }}>
          {progress.map((p) => (
            <div key={p.i} style={{
              width: p.active ? 26 : 10, height: 10, borderRadius: 999,
              background: p.done || p.active ? NAVY : "#d5dbe4",
              transition: "all .2s",
            }} />
          ))}
        </div>
        <button onClick={tryStaffExit} style={{ background: "transparent", border: "none", color: GREY, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Lock size={12} /> Staff
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 120px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {step === 0 && (
            <SectionCard title="Your details" subtitle="Please check everything is correct.">
              <FieldGrid>
                <TextField label="Full name" value={details.confirmed_name} onChange={(v) => setDetails({ ...details, confirmed_name: v })} required />
                <TextField label="Date of birth" type="date" value={details.dob} onChange={(v) => setDetails({ ...details, dob: v })} />
                <TextField label="Mobile" type="tel" value={details.mobile} onChange={(v) => setDetails({ ...details, mobile: v })} />
                <TextField label="Email" type="email" value={details.email} onChange={(v) => setDetails({ ...details, email: v })} />
                <TextField label="Emergency contact name" value={details.emergency_contact_name} onChange={(v) => setDetails({ ...details, emergency_contact_name: v })} />
                <TextField label="Emergency contact number" type="tel" value={details.emergency_contact_phone} onChange={(v) => setDetails({ ...details, emergency_contact_phone: v })} />
                <TextField label="Your GP (optional)" value={details.gp_details} onChange={(v) => setDetails({ ...details, gp_details: v })} full />
                <TextArea label="Current medications" value={details.medications} onChange={(v) => setDetails({ ...details, medications: v })} />
                <TextArea label="Allergies" value={details.allergies} onChange={(v) => setDetails({ ...details, allergies: v })} />
                <TextArea label="Medical conditions we should know about" value={details.medical_conditions} onChange={(v) => setDetails({ ...details, medical_conditions: v })} />
                <TextArea label="Anything you've tried for your hair before" value={details.previous_treatments} onChange={(v) => setDetails({ ...details, previous_treatments: v })} />
              </FieldGrid>
            </SectionCard>
          )}

          {step === 1 && (
            <SectionCard title="Your hair" subtitle="A few quick questions.">
              {HAIR_QUESTIONS.map((q) => (
                <QuestionBlock key={q.key} label={q.label}>
                  {q.type === "choice" ? (
                    <ChoiceGroup value={hair[q.key] ?? ""} options={q.options!} onChange={(v) => setHair({ ...hair, [q.key]: v })} />
                  ) : (
                    <TextArea label="" value={hair[q.key] ?? ""} onChange={(v) => setHair({ ...hair, [q.key]: v })} />
                  )}
                </QuestionBlock>
              ))}
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard title="A bit about you" subtitle="We ask everyone these — they help the doctor make sure this is the right decision for you.">
              {WELLBEING_QUESTIONS.map((q) => (
                <QuestionBlock key={q.key} label={q.label}>
                  {q.type === "choice" ? (
                    <ChoiceGroup value={wellbeing[q.key] ?? ""} options={q.options!} onChange={(v) => setWellbeing({ ...wellbeing, [q.key]: v })} />
                  ) : (
                    <TextArea label="" value={wellbeing[q.key] ?? ""} onChange={(v) => setWellbeing({ ...wellbeing, [q.key]: v })} placeholder="Type 'No' or share what's on your mind." />
                  )}
                </QuestionBlock>
              ))}
            </SectionCard>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <CheckCircle2 size={64} color={NAVY} />
              <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, marginTop: 20 }}>All done</div>
              <div style={{ fontSize: 16, color: GREY, marginTop: 12 }}>Please hand the iPad back to reception.</div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky nav bar */}
      {step < 3 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: `1px solid ${LINE}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ ...secondaryBtnStyle, opacity: step === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ fontSize: 12, color: GREY }}>Step {step + 1} of 3</div>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              style={{ ...primaryBtnStyle, opacity: canNext ? 1 : 0.4 }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => void complete()}
              disabled={!canNext || submitting}
              style={{ ...primaryBtnStyle, opacity: canNext && !submitting ? 1 : 0.5 }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Finish
            </button>
          )}
        </div>
      )}

      {showPinPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 320, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12 }}>Staff PIN</div>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinAttempt}
              onChange={(e) => { setPinAttempt(e.target.value.replace(/\D/g, "")); setPinError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitPin(); }}
              style={{ width: "100%", padding: "12px 14px", fontSize: 20, border: `1px solid ${LINE}`, borderRadius: 8, letterSpacing: 8, textAlign: "center", fontFamily: "monospace" }}
              placeholder="••••"
            />
            {pinError && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>{pinError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowPinPrompt(false)} style={{ ...secondaryBtnStyle, flex: 1 }}>Cancel</button>
              <button onClick={submitPin} style={{ ...primaryBtnStyle, flex: 1 }}>Enter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- UI atoms --- */

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 30, fontWeight: 700, color: NAVY, marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 15, color: GREY, marginBottom: 24, lineHeight: 1.5 }}>{subtitle}</div>}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: 24 }}>{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>;
}

function TextField({ label, value, onChange, type = "text", required, full }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; full?: boolean }) {
  return (
    <label style={{ display: "block", gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{label}{required && <span style={{ color: "#b91c1c" }}> *</span>}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", fontSize: 16, border: `1px solid ${LINE}`, borderRadius: 8, background: "#fff" }}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "block", gridColumn: "1 / -1" }}>
      {label && <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 6 }}>{label}</div>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ width: "100%", padding: "12px 14px", fontSize: 16, border: `1px solid ${LINE}`, borderRadius: 8, background: "#fff", fontFamily: "inherit", resize: "vertical" }}
      />
    </label>
  );
}

function QuestionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#111", marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function ChoiceGroup({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              padding: "12px 18px", borderRadius: 999, fontSize: 15, fontWeight: 600,
              border: `2px solid ${active ? NAVY : LINE}`,
              background: active ? NAVY : "#fff",
              color: active ? "#fff" : "#111",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const fullscreenStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#fff",
  display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  zIndex: 50,
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: NAVY, color: "#fff", border: "none",
  padding: "12px 22px", borderRadius: 10, fontSize: 15, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};
const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  background: "#fff", color: NAVY, border: `1px solid ${LINE}`,
  padding: "12px 22px", borderRadius: 10, fontSize: 15, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

// Suppress unused import (kept for parity with ClinicFlowConsult exports).
void NAVY_PALE;
