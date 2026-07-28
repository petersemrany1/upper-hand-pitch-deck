import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { APP_TIMEZONE } from "@/lib/timezone";
import { toast } from "sonner";
import { MoreVertical, ChevronLeft, MessageCircle, Mail, CheckCircle2, Clock, Images } from "lucide-react";
import { clinicflowSignLogoUrl } from "@/utils/clinicflow.functions";
import {
  bookClinicflowQuoteDate,
  recordClinicflowQuoteDeposit,
  sendClinicflowQuoteEmail,
} from "@/lib/clinicflow-quotes.functions";
import { getClinicflowPhotosForQuote } from "@/lib/clinicflow-phase4.functions";
import { ClinicFlowTimelineGallery, type GalleryPhoto } from "@/components/ClinicFlowTimelineGallery";

export const Route = createFileRoute("/clinic-quote/$quoteId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Consult quote" }] }),
  component: QuotePage,
});

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";
const GREEN = "#15803d";
const GREEN_BG = "#dcfce7";
const AMBER_BG = "#fff7ed";
const AMBER_FG = "#9a3412";

type Quote = {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_name: string;
  diagnosis: string;
  norwood: string | null;
  grafts: number | null;
  price: number;
  deposit_amount: number;
  includes_text: string | null;
  valid_until: string;
  date_option_1: string | null;
  date_option_2: string | null;
  status: "draft" | "presented" | "booked" | "deposit_recorded" | "expired";
  booked_date: string | null;
  deposit_recorded_at: string | null;
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIMEZONE });
}
function fmt$(n: number | null | undefined) {
  return typeof n === "number" ? "$" + Math.round(n).toLocaleString() : "";
}

function QuotePage() {
  const { quoteId } = useParams({ from: "/clinic-quote/$quoteId" });
  const navigate = useNavigate();
  const signLogo = useServerFn(clinicflowSignLogoUrl);
  const bookDate = useServerFn(bookClinicflowQuoteDate);
  const recordDep = useServerFn(recordClinicflowQuoteDeposit);
  const sendEmail = useServerFn(sendClinicflowQuoteEmail);
  const fetchPhotos = useServerFn(getClinicflowPhotosForQuote);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookModal, setBookModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[] | null>(null);

  const refresh = async () => {
    const { data: q, error } = await supabase
      .from("clinicflow_quotes").select("*").eq("id", quoteId).maybeSingle();
    if (error || !q) { toast.error(error?.message ?? "Quote not found"); setLoading(false); return; }
    setQuote(q as Quote);

    const [{ data: clinic }, { data: settings }, { data: appt }] = await Promise.all([
      supabase.from("partner_clinics").select("clinic_name").eq("id", (q as Quote).clinic_id).maybeSingle(),
      supabase.from("clinicflow_clinic_settings").select("logo_url, whatsapp_number").eq("clinic_id", (q as Quote).clinic_id).maybeSingle(),
      supabase.from("clinic_appointments").select("patient_phone, patient_email").eq("id", (q as Quote).appointment_id).maybeSingle(),
    ]);
    if (clinic) setClinicName(clinic.clinic_name as string);
    setWhatsappNumber((settings?.whatsapp_number as string | null) ?? null);
    setPatientPhone((appt?.patient_phone as string | null) ?? null);
    setPatientEmail((appt?.patient_email as string | null) ?? null);

    if (settings?.logo_url) {
      try {
        const res = await signLogo({ data: { clinicId: (q as Quote).clinic_id, path: settings.logo_url as string } });
        setLogoUrl(res.url);
      } catch { setLogoUrl(null); }
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [quoteId]);

  const isExpired = useMemo(() => {
    if (!quote) return false;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
    return quote.status === "presented" && quote.valid_until < today;
  }, [quote]);

  const statusLabel = useMemo(() => {
    if (!quote) return "";
    if (quote.status === "deposit_recorded") return "Deposit received";
    if (quote.status === "booked") return "Date booked";
    if (quote.status === "expired" || isExpired) return "Expired";
    return "Quoted";
  }, [quote, isExpired]);

  const openGallery = async () => {
    setGalleryOpen(true);
    if (galleryPhotos === null) {
      try {
        const res = await fetchPhotos({ data: { quoteId } });
        setGalleryPhotos((res.photos ?? []) as GalleryPhoto[]);
      } catch {
        setGalleryPhotos([]);
      }
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: GREY, fontFamily: "system-ui" }}>Loading…</div>;
  if (!quote) return <div style={{ padding: 60, textAlign: "center", color: GREY, fontFamily: "system-ui" }}>Quote not found.</div>;

  function waLink() {
    if (!quote) return "#";
    const num = (patientPhone ?? "").replace(/[^0-9]/g, "");
    // convert 04xx to 614xx
    const intl = num.startsWith("0") ? "61" + num.slice(1) : num;
    const bookLine = quote.booked_date
      ? `\nYour procedure date: ${fmtDate(quote.booked_date)}`
      : (quote.date_option_1 || quote.date_option_2)
        ? `\nNext available dates:\n${[quote.date_option_1, quote.date_option_2].filter(Boolean).map((d) => fmtDate(d!)).join("\n")}`
        : "";
    const msg =
`Hi ${quote.patient_name.split(" ")[0]}, thanks for coming in today at ${clinicName}.

Diagnosis: ${quote.diagnosis}
Recommended plan: FUE hair transplant${quote.norwood ? ` · Norwood ${quote.norwood}` : ""}
${quote.grafts ? `Grafts: ${quote.grafts}\n` : ""}Price: ${fmt$(quote.price)} AUD

Ways people pay: in full · deposit + balance before procedure day · finance options available.

Quote valid until ${fmtDate(quote.valid_until)}${bookLine}

Any questions, just message back.`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  }

  async function onSendEmail() {
    if (!patientEmail) { toast.error("No patient email on file"); return; }
    const res = await sendEmail({ data: { quoteId: quote!.id, to: patientEmail } });
    if (res.success) toast.success("Email sent"); else toast.error(res.error ?? "Failed");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", position: "relative" }}>
      {/* Discreet doctor controls (top-right small dot) */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 20 }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More"
          style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.9)", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: GREY }}
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div style={{ position: "absolute", right: 0, top: 44, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", minWidth: 220, overflow: "hidden" }}>
            <MenuBtn onClick={() => { setMenuOpen(false); navigate({ to: "/partner-clinics" }); }} label="Back to portal" icon={<ChevronLeft size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); window.open(waLink(), "_blank"); }} label="Send via WhatsApp" icon={<MessageCircle size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); void onSendEmail(); }} label="Send via email" icon={<Mail size={14} />} />
            <div style={{ borderTop: `1px solid ${LINE}`, margin: "4px 0" }} />
            <MenuBtn onClick={() => { setMenuOpen(false); setBookModal(true); }} label="Book date" icon={<Clock size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); setDepositModal(true); }} label="Record deposit" icon={<CheckCircle2 size={14} />} />
            {/* Stripe payment button placeholder — DO NOT implement in Phase 3.
                Future: render a "Pay deposit with card" button here that opens
                a Stripe Checkout / embedded element and, on success, moves
                quote.status → 'deposit_recorded'. */}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {logoUrl ? (
            <img src={logoUrl} alt={clinicName} style={{ maxHeight: 72, maxWidth: 220, objectFit: "contain" }} />
          ) : (
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY }}>{clinicName}</div>
          )}
        </div>

        {/* Status chip */}
        {(quote.status === "booked" || quote.status === "deposit_recorded") && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ background: GREEN_BG, color: GREEN, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {statusLabel}
            </span>
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${LINE}`, padding: 32, boxShadow: "0 1px 4px rgba(26,58,107,0.06)" }}>
          <Row label="Patient" value={quote.patient_name} />
          <Row label="Diagnosis" value={quote.diagnosis} />
          {(() => {
            const d = (quote.diagnosis || "").toLowerCase();
            const flag =
              d.includes("telogen effluvium") ||
              d.includes("alopecia areata") ||
              d.includes("scarring alopecia") ||
              d.includes("dupa") ||
              d.includes("diffuse unpatterned");
            if (!flag) return null;
            return (
              <div style={{ marginTop: 12, marginBottom: 4, padding: "12px 14px", background: "#fff8e6", border: "1px solid #f5c86b", borderRadius: 10, fontSize: 13, color: "#78530a", lineHeight: 1.5 }}>
                Transplant usually not suitable for this diagnosis — consider treatment or specialist referral first.
              </div>
            );
          })()}
          <Row label="Recommended plan" value={`FUE hair transplant${quote.norwood ? ` · Norwood ${quote.norwood}` : ""}`} />
          {quote.grafts != null && <Row label="Grafts" value={String(quote.grafts)} />}

          {quote.includes_text && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: NAVY, marginBottom: 10 }}>What's included</div>
              <div style={{ fontSize: 15, color: "#111", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>{quote.includes_text}</div>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${LINE}`, textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>Price</div>
            <div style={{ fontSize: 44, fontWeight: 800, color: NAVY, lineHeight: 1.1, marginTop: 6 }}>{fmt$(quote.price)}</div>
            <div style={{ fontSize: 12, color: GREY, marginTop: 4 }}>AUD, inclusive of everything above</div>
          </div>

          <div style={{ marginTop: 24, padding: "16px 18px", background: "#f7f8fa", borderRadius: 12, fontSize: 13, color: "#334155", lineHeight: 1.6, textAlign: "center" }}>
            <strong style={{ color: NAVY }}>Ways people pay:</strong> in full · deposit + balance before procedure day · finance options available.
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${LINE}`, display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>Quote valid until</div>
              <div style={{ fontSize: 15, color: "#111", marginTop: 4 }}>{fmtDate(quote.valid_until)}</div>
            </div>

            {quote.booked_date ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>Your procedure date</div>
                <div style={{ fontSize: 15, color: "#111", marginTop: 4 }}>{fmtDate(quote.booked_date)}</div>
              </div>
            ) : (quote.date_option_1 || quote.date_option_2) ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>Next available dates</div>
                <div style={{ fontSize: 15, color: "#111", marginTop: 4, lineHeight: 1.6 }}>
                  {quote.date_option_1 && <div>{fmtDate(quote.date_option_1)}</div>}
                  {quote.date_option_2 && <div>{fmtDate(quote.date_option_2)}</div>}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Send row visible to doctor/patient */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
          <button onClick={() => window.open(waLink(), "_blank")} disabled={!patientPhone}
            style={{ background: "#25D366", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: patientPhone ? "pointer" : "not-allowed", opacity: patientPhone ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MessageCircle size={16} /> Send via WhatsApp
          </button>
          <button onClick={() => void onSendEmail()} disabled={!patientEmail}
            style={{ background: NAVY, color: "#fff", border: "none", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: patientEmail ? "pointer" : "not-allowed", opacity: patientEmail ? 1 : 0.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Mail size={16} /> Send via email
          </button>
        </div>
      </div>

      {bookModal && (
        <BookDateModal
          quote={quote}
          onClose={() => setBookModal(false)}
          onDone={async (d) => {
            try {
              await bookDate({ data: { quoteId: quote.id, bookedDate: d } });
              toast.success("Date booked");
              setBookModal(false);
              await refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        />
      )}

      {depositModal && (
        <RecordDepositModal
          quote={quote}
          onClose={() => setDepositModal(false)}
          onDone={async (amt) => {
            try {
              await recordDep({ data: { quoteId: quote.id, depositAmount: amt, method: "manual" } });
              toast.success("Deposit recorded");
              setDepositModal(false);
              await refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            }
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, padding: "10px 0", borderBottom: `1px solid ${LINE}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: GREY }}>{label}</div>
      <div style={{ fontSize: 15, color: "#111" }}>{value}</div>
    </div>
  );
}

function MenuBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "#111", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: GREY }}>{icon}</span> {label}
    </button>
  );
}

function BookDateModal({ quote, onClose, onDone }: { quote: Quote; onClose: () => void; onDone: (d: string) => void }) {
  const [choice, setChoice] = useState<"1" | "2" | "custom">(quote.date_option_1 ? "1" : quote.date_option_2 ? "2" : "custom");
  const [custom, setCustom] = useState<string>("");
  const submit = () => {
    let d = "";
    if (choice === "1") d = quote.date_option_1 ?? "";
    else if (choice === "2") d = quote.date_option_2 ?? "";
    else d = custom;
    if (!d) { toast.error("Pick a date"); return; }
    onDone(d);
  };
  return (
    <ModalShell title="Book procedure date" onClose={onClose}>
      <div style={{ display: "grid", gap: 8 }}>
        {quote.date_option_1 && <RadioRow checked={choice === "1"} onChange={() => setChoice("1")} label={`Option 1 · ${fmtDate(quote.date_option_1)}`} />}
        {quote.date_option_2 && <RadioRow checked={choice === "2"} onChange={() => setChoice("2")} label={`Option 2 · ${fmtDate(quote.date_option_2)}`} />}
        <RadioRow checked={choice === "custom"} onChange={() => setChoice("custom")} label="Custom date" />
        {choice === "custom" && (
          <input type="date" value={custom} onChange={(e) => setCustom(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${LINE}`, color: NAVY, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={submit} style={{ background: NAVY, color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Book</button>
      </div>
    </ModalShell>
  );
}

function RecordDepositModal({ quote, onClose, onDone }: { quote: Quote; onClose: () => void; onDone: (amt: number) => void }) {
  const [amt, setAmt] = useState(String(Math.round(quote.deposit_amount)));
  const submit = () => {
    const n = Number(amt);
    if (!n || n <= 0) { toast.error("Enter an amount"); return; }
    onDone(n);
  };
  return (
    <ModalShell title="Record deposit" onClose={onClose}>
      <div style={{ fontSize: 13, color: GREY, marginBottom: 12 }}>Manual entry — bank transfer / EFTPOS at the clinic.</div>
      <label style={{ display: "block" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: GREY, marginBottom: 6 }}>Amount (AUD)</div>
        <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} />
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${LINE}`, color: NAVY, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={submit} style={{ background: GREEN, color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 40, display: "flex", justifyContent: "center", alignItems: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: NAVY }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: GREY, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RadioRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${checked ? NAVY : LINE}`, borderRadius: 8, cursor: "pointer", background: checked ? "#edf2f9" : "#fff" }}>
      <input type="radio" checked={checked} onChange={onChange} />
      <span style={{ fontSize: 14, color: "#111" }}>{label}</span>
    </label>
  );
}
