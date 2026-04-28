import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, X, Pencil, UserPlus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_dashboard/partner-clinics")({
  component: PartnerClinicsPage,
  head: () => ({ meta: [{ title: "Partner Clinics" }] }),
});

const COLORS = {
  text: "#111",
  line: "#ebebeb",
  coral: "#f4522d",
  coralBg: "#fff1ee",
  green: "#10b981",
  inputBg: "#f9f9f9",
};

type PartnerClinic = {
  id: string;
  clinic_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_active: boolean;
  consult_price_original: number | null;
  consult_price_deposit: number | null;
  parking_info: string | null;
  nearby_landmarks: string | null;
};

type PartnerDoctor = {
  id: string;
  clinic_id: string;
  name: string;
  title: string | null;
  years_experience: number | null;
  specialties: string | null;
  credentials: string | null;
  training_background: string | null;
  what_makes_them_different: string | null;
  natural_results_approach: string | null;
  advanced_cases: string | null;
  talking_points: string | null;
  aftercare_included: string | null;
  is_active: boolean;
};

const emptyClinic: Omit<PartnerClinic, "id" | "is_active"> = {
  clinic_name: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  consult_price_original: 395,
  consult_price_deposit: 75,
  parking_info: "",
  nearby_landmarks: "",
};

const emptyDoctor: Omit<PartnerDoctor, "id" | "clinic_id" | "is_active"> = {
  name: "",
  title: "",
  years_experience: null,
  specialties: "",
  credentials: "",
  training_background: "",
  what_makes_them_different: "",
  natural_results_approach: "",
  advanced_cases: "",
  talking_points: "",
  aftercare_included: "",
};

function PartnerClinicsPage() {
  const [clinics, setClinics] = useState<PartnerClinic[]>([]);
  const [doctors, setDoctors] = useState<PartnerDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);

  const [clinicPanel, setClinicPanel] = useState<{ mode: "create" | "edit"; data: Partial<PartnerClinic> } | null>(null);
  const [doctorPanel, setDoctorPanel] = useState<{ mode: "create" | "edit"; clinicId: string; data: Partial<PartnerDoctor> } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("partner_clinics").select("*").order("clinic_name"),
      supabase.from("partner_doctors").select("*").order("name"),
    ]);
    setClinics((c ?? []) as PartnerClinic[]);
    setDoctors((d ?? []) as PartnerDoctor[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const visibleClinics = showInactive ? clinics : clinics.filter((c) => c.is_active);

  const toggleClinicActive = async (c: PartnerClinic) => {
    await supabase.from("partner_clinics").update({ is_active: !c.is_active }).eq("id", c.id);
    toast.success(c.is_active ? "Clinic marked inactive" : "Clinic activated");
    void load();
  };

  const toggleDoctorActive = async (d: PartnerDoctor) => {
    await supabase.from("partner_doctors").update({ is_active: !d.is_active }).eq("id", d.id);
    toast.success(d.is_active ? "Doctor marked inactive" : "Doctor activated");
    void load();
  };

  return (
    <div style={{ background: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 28px 80px" }}>
        {/* Header */}
        <div className="flex items-end justify-between" style={{ marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#111", opacity: 0.5, marginBottom: 6 }}>
              Approved partners
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: COLORS.text, letterSpacing: "-0.01em" }}>
              Partner Clinics
            </h1>
            <p style={{ fontSize: 13, color: "#111", opacity: 0.65, marginTop: 6 }}>
              Approved clinics the sales portal sends patients to. Separate from CRM outreach.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2" style={{ fontSize: 12, color: "#111", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <button
              onClick={() => setClinicPanel({ mode: "create", data: { ...emptyClinic } })}
              className="flex items-center gap-2 rounded-[8px]"
              style={{
                background: COLORS.coral,
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
                padding: "10px 16px",
                border: "none",
              }}
            >
              <Plus className="h-4 w-4" />
              Add Clinic
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ fontSize: 13, color: "#111", opacity: 0.6, padding: "40px 0" }}>Loading…</div>
        )}

        {!loading && visibleClinics.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: `0.5px solid ${COLORS.line}`,
              borderRadius: 12,
              padding: "60px 40px",
              textAlign: "center",
            }}
          >
            <Building2 className="h-8 w-8" style={{ color: "#111", opacity: 0.25, margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, color: "#111", marginBottom: 6 }}>No partner clinics yet</div>
            <div style={{ fontSize: 13, color: "#111", opacity: 0.6 }}>Click "Add Clinic" to create your first one.</div>
          </div>
        )}

        {!loading && visibleClinics.map((clinic) => {
          const clinicDoctors = doctors.filter((d) => d.clinic_id === clinic.id && (showInactive || d.is_active));
          return (
            <div
              key={clinic.id}
              style={{
                background: "#fff",
                border: `0.5px solid ${COLORS.line}`,
                borderRadius: 12,
                marginBottom: 16,
                overflow: "hidden",
                opacity: clinic.is_active ? 1 : 0.55,
              }}
            >
              {/* Clinic header */}
              <div style={{ padding: "20px 22px", borderBottom: `0.5px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 500, color: COLORS.text }}>{clinic.clinic_name}</div>
                      {!clinic.is_active && (
                        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111", background: "#f3f3f3", padding: "2px 8px", borderRadius: 20 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "#111" }}>
                      {[clinic.address, clinic.city, clinic.state].filter(Boolean).join(", ") || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#111", marginTop: 6, opacity: 0.75 }}>
                      Consult ${clinic.consult_price_original ?? 0} · ${clinic.consult_price_deposit ?? 0} deposit
                      {clinic.parking_info ? ` · ${clinic.parking_info}` : ""}
                    </div>
                    {clinic.nearby_landmarks && (
                      <div style={{ fontSize: 12, color: "#111", marginTop: 4, opacity: 0.65 }}>
                        {clinic.nearby_landmarks}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <IconBtn label="Edit" onClick={() => setClinicPanel({ mode: "edit", data: clinic })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <button
                      onClick={() => void toggleClinicActive(clinic)}
                      style={{
                        fontSize: 11,
                        color: "#111",
                        opacity: 0.6,
                        background: "transparent",
                        textDecoration: "underline",
                        padding: "4px 8px",
                      }}
                    >
                      {clinic.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Doctors */}
              <div style={{ padding: "16px 22px" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#111", opacity: 0.5 }}>
                    Doctors ({clinicDoctors.length})
                  </div>
                  <button
                    onClick={() => setDoctorPanel({ mode: "create", clinicId: clinic.id, data: { ...emptyDoctor } })}
                    className="flex items-center gap-1.5 rounded-[6px]"
                    style={{
                      background: "#fff",
                      border: `0.5px solid ${COLORS.coral}`,
                      color: COLORS.coral,
                      fontSize: 12,
                      fontWeight: 500,
                      padding: "5px 10px",
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Doctor
                  </button>
                </div>

                {clinicDoctors.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#111", opacity: 0.5, padding: "8px 0" }}>
                    No doctors yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {clinicDoctors.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          background: COLORS.inputBg,
                          border: `0.5px solid ${COLORS.line}`,
                          borderRadius: 8,
                          padding: "12px 14px",
                          opacity: d.is_active ? 1 : 0.55,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{d.name}</div>
                              {d.title && (
                                <span style={{ fontSize: 12, color: "#111", opacity: 0.7 }}>· {d.title}</span>
                              )}
                              {!d.is_active && (
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#111", background: "#fff", padding: "1px 6px", borderRadius: 20, opacity: 0.6 }}>
                                  Inactive
                                </span>
                              )}
                            </div>
                            {d.what_makes_them_different && (
                              <div style={{ fontSize: 12, color: "#111", marginTop: 6, lineHeight: 1.5, opacity: 0.85 }}>
                                {d.what_makes_them_different}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1" style={{ marginTop: 8, fontSize: 11, color: "#111", opacity: 0.65 }}>
                              {d.years_experience != null && <span>{d.years_experience} yrs experience</span>}
                              {d.specialties && <span>· {d.specialties}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <IconBtn label="Edit" onClick={() => setDoctorPanel({ mode: "edit", clinicId: clinic.id, data: d })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            <button
                              onClick={() => void toggleDoctorActive(d)}
                              style={{
                                fontSize: 11,
                                color: "#111",
                                opacity: 0.6,
                                background: "transparent",
                                textDecoration: "underline",
                                padding: "4px 8px",
                              }}
                            >
                              {d.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-out panels */}
      {clinicPanel && (
        <ClinicPanel
          mode={clinicPanel.mode}
          initial={clinicPanel.data}
          onClose={() => setClinicPanel(null)}
          onSaved={() => { setClinicPanel(null); void load(); }}
        />
      )}
      {doctorPanel && (
        <DoctorPanel
          mode={doctorPanel.mode}
          clinicId={doctorPanel.clinicId}
          initial={doctorPanel.data}
          onClose={() => setDoctorPanel(null)}
          onSaved={() => { setDoctorPanel(null); void load(); }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        background: "#fff",
        border: `0.5px solid ${COLORS.line}`,
        borderRadius: 6,
        padding: "5px 7px",
        color: "#111",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────── Slide-out panel scaffold ─────────────── */

function SlideOver({ title, subtitle, onClose, children, footer }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,17,0.35)",
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          background: "#fff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(17,17,17,0.08)",
        }}
      >
        <div style={{ padding: "20px 24px", borderBottom: `0.5px solid ${COLORS.line}` }} className="flex items-start justify-between gap-4">
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: COLORS.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#111", opacity: 0.6, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "transparent", padding: 4 }}>
            <X className="h-4 w-4" style={{ color: "#111" }} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>{children}</div>
        <div style={{ padding: "16px 24px", borderTop: `0.5px solid ${COLORS.line}` }} className="flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111", opacity: 0.6, marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: COLORS.inputBg,
  border: `0.5px solid ${COLORS.line}`,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  color: COLORS.text,
  outline: "none",
};

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical", ...(props.style || {}) }} />;
}

/* ─────────────── Clinic panel ─────────────── */

function ClinicPanel({ mode, initial, onClose, onSaved }: {
  mode: "create" | "edit";
  initial: Partial<PartnerClinic>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<PartnerClinic>>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PartnerClinic>(k: K, v: PartnerClinic[K] | null | string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.clinic_name?.trim()) { toast.error("Clinic name is required"); return; }
    setSaving(true);
    const payload = {
      clinic_name: form.clinic_name.trim(),
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      consult_price_original: form.consult_price_original ?? null,
      consult_price_deposit: form.consult_price_deposit ?? null,
      parking_info: form.parking_info || null,
      nearby_landmarks: form.nearby_landmarks || null,
    };
    const { error } = mode === "edit" && form.id
      ? await supabase.from("partner_clinics").update(payload).eq("id", form.id)
      : await supabase.from("partner_clinics").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mode === "edit" ? "Clinic updated" : "Clinic added");
    onSaved();
  };

  return (
    <SlideOver
      title={mode === "edit" ? "Edit Clinic" : "Add Partner Clinic"}
      subtitle="Approved clinic for sales portal bookings"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ fontSize: 13, color: "#111", padding: "8px 14px", background: "transparent" }}>Cancel</button>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{ background: COLORS.coral, color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 6, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add clinic"}
          </button>
        </>
      }
    >
      <Field label="Clinic Name *">
        <TextInput value={form.clinic_name ?? ""} onChange={(e) => set("clinic_name", e.target.value)} />
      </Field>
      <Field label="Address">
        <TextInput value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City"><TextInput value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="State"><TextInput value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><TextInput value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><TextInput type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
      </div>
      <Field label="Website">
        <TextInput value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Consult Price ($)">
          <TextInput type="number" value={form.consult_price_original ?? ""} onChange={(e) => set("consult_price_original", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label="Deposit ($)">
          <TextInput type="number" value={form.consult_price_deposit ?? ""} onChange={(e) => set("consult_price_deposit", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Parking Info">
        <TextInput value={form.parking_info ?? ""} onChange={(e) => set("parking_info", e.target.value)} placeholder="e.g. Free parking on site" />
      </Field>
      <Field label="Nearby Landmarks">
        <TextArea rows={3} value={form.nearby_landmarks ?? ""} onChange={(e) => set("nearby_landmarks", e.target.value)} placeholder="e.g. Near Lincoln Park · 5 mins DFO · 10 mins Airport" />
      </Field>
    </SlideOver>
  );
}

/* ─────────────── Doctor panel ─────────────── */

function DoctorPanel({ mode, clinicId, initial, onClose, onSaved }: {
  mode: "create" | "edit";
  clinicId: string;
  initial: Partial<PartnerDoctor>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<PartnerDoctor>>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PartnerDoctor>(k: K, v: PartnerDoctor[K] | null | string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Doctor name is required"); return; }
    setSaving(true);
    const payload = {
      clinic_id: clinicId,
      name: form.name.trim(),
      title: form.title || null,
      years_experience: form.years_experience ?? null,
      specialties: form.specialties || null,
      credentials: form.credentials || null,
      training_background: form.training_background || null,
      what_makes_them_different: form.what_makes_them_different || null,
      natural_results_approach: form.natural_results_approach || null,
      advanced_cases: form.advanced_cases || null,
      talking_points: form.talking_points || null,
      aftercare_included: form.aftercare_included || null,
    };
    const { error } = mode === "edit" && form.id
      ? await supabase.from("partner_doctors").update(payload).eq("id", form.id)
      : await supabase.from("partner_doctors").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mode === "edit" ? "Doctor updated" : "Doctor added");
    onSaved();
  };

  return (
    <SlideOver
      title={mode === "edit" ? "Edit Doctor" : "Add Doctor"}
      subtitle="Profile shown in sales portal & clinic handovers"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} style={{ fontSize: 13, color: "#111", padding: "8px 14px", background: "transparent" }}>Cancel</button>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{ background: COLORS.coral, color: "#fff", fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 6, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add doctor"}
          </button>
        </>
      }
    >
      <Field label="Doctor Name *">
        <TextInput value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Dr. Jane Smith" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Title">
          <TextInput value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Hair Transplant Specialist" />
        </Field>
        <Field label="Years Experience">
          <TextInput type="number" value={form.years_experience ?? ""} onChange={(e) => set("years_experience", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Specialties">
        <TextInput value={form.specialties ?? ""} onChange={(e) => set("specialties", e.target.value)} placeholder="Hair transplants, cosmetic injectables" />
      </Field>
      <Field label="Credentials">
        <TextArea rows={2} value={form.credentials ?? ""} onChange={(e) => set("credentials", e.target.value)} />
      </Field>
      <Field label="Training Background">
        <TextArea rows={2} value={form.training_background ?? ""} onChange={(e) => set("training_background", e.target.value)} />
      </Field>
      <Field label="What Makes Them Different (key talking point)">
        <TextArea rows={3} value={form.what_makes_them_different ?? ""} onChange={(e) => set("what_makes_them_different", e.target.value)} placeholder="The single sentence that differentiates this doctor — used in the sales portal." />
      </Field>
      <Field label="Natural Results Approach">
        <TextArea rows={3} value={form.natural_results_approach ?? ""} onChange={(e) => set("natural_results_approach", e.target.value)} />
      </Field>
      <Field label="Advanced Cases They Treat">
        <TextArea rows={2} value={form.advanced_cases ?? ""} onChange={(e) => set("advanced_cases", e.target.value)} />
      </Field>
      <Field label="Other Talking Points">
        <TextArea rows={2} value={form.talking_points ?? ""} onChange={(e) => set("talking_points", e.target.value)} />
      </Field>
      <Field label="Aftercare Included">
        <TextArea rows={2} value={form.aftercare_included ?? ""} onChange={(e) => set("aftercare_included", e.target.value)} />
      </Field>
    </SlideOver>
  );
}
