import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE, sydneyTodayISO } from "@/lib/timezone";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createClinicflowQuote } from "@/lib/clinicflow-quotes.functions";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";

const DIAGNOSES = [
  "Androgenetic alopecia",
  "Traction alopecia",
  "Scar (injury/previous surgery)",
  "Telogen effluvium",
  "Alopecia areata",
  "Scarring alopecia (suspected)",
  "Diffuse unpatterned alopecia (DUPA)",
  "Other",
];
const NORWOODS = ["2", "2A", "3", "3 vertex", "4", "5", "6", "7"];

const DEFAULT_INCLUDES = `• Consultation with your doctor
• Full FUE procedure by our surgical team
• Take-home aftercare kit
• Follow-up reviews at 3, 6 and 12 months
• Direct access to your doctor if anything comes up`;

type Props = {
  clinicId: string;
  appointmentId: string;
  intakeId?: string | null;
  leadId?: string | null;
  defaultPatientName: string;
  onClose: () => void;
  onCreated: (quoteId: string) => void;
};

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

export function ClinicFlowQuoteBuilder({
  clinicId, appointmentId, intakeId, leadId, defaultPatientName, onClose, onCreated,
}: Props) {
  const createQuote = useServerFn(createClinicflowQuote);
  const today = useMemo(() => sydneyTodayISO(), []);

  const [validityDays, setValidityDays] = useState(14);
  const [defaultDeposit, setDefaultDeposit] = useState(1000);
  const [loading, setLoading] = useState(true);

  const [patientName, setPatientName] = useState(defaultPatientName);
  const [diagnosis, setDiagnosis] = useState(DIAGNOSES[0]);
  const [diagnosisOther, setDiagnosisOther] = useState("");
  const [norwood, setNorwood] = useState<string>("3");
  const [graftUnit, setGraftUnit] = useState<"grafts" | "hairs">("grafts");
  const [grafts, setGrafts] = useState<string>("2500");
  const [price, setPrice] = useState<string>("15000");
  const [deposit, setDeposit] = useState<string>("1000");
  const [description, setDescription] = useState<string>("");
  const [descriptionEdited, setDescriptionEdited] = useState(false);
  const [dateOpt1, setDateOpt1] = useState<string>("");
  const [dateOpt2, setDateOpt2] = useState<string>("");
  const [includes, setIncludes] = useState(DEFAULT_INCLUDES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (descriptionEdited) return;
    const n = Number(grafts);
    if (!grafts || Number.isNaN(n)) {
      setDescription("");
      return;
    }
    const unit = graftUnit;
    const graftsText = `${n.toLocaleString("en-AU")} ${unit}`;
    setDescription(
      `Hair restoration procedure — ${graftsText}, sapphire FUE\n\nA single-session follicular unit extraction procedure transferring ${graftsText} from your permanent donor area at the back and sides of the scalp to the hairline, mid-scalp and crown transition.\n\n- We design the hairline with you before the day of surgery, taking into account your facial proportions, hair calibre, existing density and how your hair loss is likely to progress.\n- On the day, we perform the extraction and create each recipient site at the correct angle and direction, and place every graft along the frontal edge.\n- ${unit === "hairs" ? "Hairs" : "Grafts"} are counted during the procedure and the count is shown to you before you leave.\n\n- The plan is built around your lifetime donor supply. You have a finite number of usable ${unit}, and how the first procedure is planned determines what remains available to you later.\n- This procedure uses ${graftsText} and holds the balance in reserve.`
    );
  }, [grafts, graftUnit, descriptionEdited]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clinicflow_clinic_settings")
        .select("default_deposit_amount, quote_validity_days")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (data) {
        const dep = Number(data.default_deposit_amount ?? 1000);
        setDefaultDeposit(dep);
        setDeposit(String(Math.round(dep)));
        setValidityDays(Number(data.quote_validity_days ?? 14));
      }
      setLoading(false);
    })();
  }, [clinicId]);

  const validUntil = addDaysISO(today, validityDays);

  async function submit() {
    const finalDiagnosis = diagnosis === "Other" ? diagnosisOther.trim() : diagnosis;
    if (!finalDiagnosis) { toast.error("Enter a diagnosis"); return; }
    if (!patientName.trim()) { toast.error("Patient name required"); return; }
    const priceNum = Number(price);
    const depositNum = Number(deposit);
    if (!priceNum || priceNum <= 0) { toast.error("Enter a price"); return; }
    if (Number.isNaN(depositNum) || depositNum < 0) { toast.error("Enter a deposit"); return; }

    setSaving(true);
    try {
      const res = await createQuote({
        data: {
          clinicId, appointmentId,
          intakeId: intakeId ?? null,
          leadId: leadId ?? null,
          patientName: patientName.trim(),
          diagnosis: finalDiagnosis,
          norwood,
          grafts: grafts ? Number(grafts) : null,
          price: priceNum,
          depositAmount: depositNum,
          description: description.trim() || null,
          includesText: includes.trim() || null,
          dateOption1: dateOpt1 || null,
          dateOption2: dateOpt2 || null,
          validUntil,
        },
      });
      toast.success("Quote created");
      onCreated(res.quoteId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 60, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "24px 12px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,0.25)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>Create quote</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: GREY, cursor: "pointer", padding: 4 }}><X size={20} /></button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: GREY }}>Loading…</div>
        ) : (
          <div style={{ padding: 22, display: "grid", gap: 16 }}>
            <Field label="Patient name">
              <TextInput value={patientName} onChange={setPatientName} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Diagnosis">
                <Select value={diagnosis} onChange={setDiagnosis} options={DIAGNOSES} />
              </Field>
              <Field label="Norwood">
                <Select value={norwood} onChange={setNorwood} options={NORWOODS} />
              </Field>
            </div>
            {diagnosis === "Other" && (
              <Field label="Diagnosis (specify)">
                <TextInput value={diagnosisOther} onChange={setDiagnosisOther} />
              </Field>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Grafts">
                <TextInput value={grafts} onChange={setGrafts} inputMode="numeric" />
              </Field>
              <Field label="Price (AUD)">
                <TextInput value={price} onChange={setPrice} inputMode="decimal" />
              </Field>
              <Field label={`Deposit (default $${defaultDeposit})`}>
                <TextInput value={deposit} onChange={setDeposit} inputMode="decimal" />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Procedure date · option 1">
                <TextInput type="date" value={dateOpt1} onChange={setDateOpt1} />
              </Field>
              <Field label="Procedure date · option 2">
                <TextInput type="date" value={dateOpt2} onChange={setDateOpt2} />
              </Field>
            </div>

            <div style={{ fontSize: 12, color: GREY }}>
              Valid until <strong style={{ color: NAVY }}>{new Date(validUntil + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong> ({validityDays} days)
            </div>

            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setDescriptionEdited(true); }}
                rows={10}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 11, color: GREY, marginTop: 4 }}>Auto-fills from the graft count. You can edit it.</p>
            </Field>

            <Field label="What's included">
              <textarea
                value={includes}
                onChange={(e) => setIncludes(e.target.value)}
                rows={6}
                style={{ width: "100%", padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
            </Field>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 22, borderTop: `1px solid ${LINE}` }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${LINE}`, color: NAVY, padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => void submit()} disabled={saving || loading} style={{ background: NAVY, color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Generating…" : "Generate quote"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: GREY, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, type = "text", inputMode }: { value: string; onChange: (v: string) => void; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <input
      type={type}
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "12px 14px", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 15, background: "#fff", fontFamily: "inherit", boxSizing: "border-box" }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
