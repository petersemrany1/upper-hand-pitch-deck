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
  head: () => ({
    meta: [
      { title: "ClinicFlow Treatment Recommendation" },
      { name: "description", content: "Your personalised medical consultation summary and treatment recommendation from ClinicFlow." },
      { property: "og:title", content: "ClinicFlow Treatment Recommendation" },
      { property: "og:description", content: "Your personalised medical consultation summary and treatment recommendation from ClinicFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotePage,
});

const LINE = "#e2e8f0";
const GREY = "#64748b";
const GREEN = "#15803d";
const GREEN_BG = "#f0fdf4";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });
}
function fmtDateCompact(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: APP_TIMEZONE,
  });
}
function fmt$(n: number | null | undefined) {
  return typeof n === "number" ? "$" + Math.round(n).toLocaleString() : "";
}

function quoteRef(id: string) {
  return "CF-" + id.slice(-6).toUpperCase();
}

function todayAU() {
  return new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  });
}

function transplantWarning(diagnosis: string) {
  const d = (diagnosis || "").toLowerCase();
  return (
    d.includes("telogen effluvium") ||
    d.includes("alopecia areata") ||
    d.includes("scarring alopecia") ||
    d.includes("dupa") ||
    d.includes("diffuse unpatterned")
  );
}

function parseIncludes(text: string | null) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, ""));
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
      .from("clinicflow_quotes")
      .select("*")
      .eq("id", quoteId)
      .maybeSingle();
    if (error || !q) {
      toast.error(error?.message ?? "Quote not found");
      setLoading(false);
      return;
    }
    setQuote(q as Quote);

    const [{ data: clinic }, { data: settings }, { data: appt }] = await Promise.all([
      supabase.from("partner_clinics").select("clinic_name").eq("id", (q as Quote).clinic_id).maybeSingle(),
      supabase.from("clinicflow_clinic_settings").select("logo_url, whatsapp_number").eq("clinic_id", (q as Quote).clinic_id).maybeSingle(),
      supabase.from("clinic_appointments").select("patient_phone, patient_email").eq("id", (q as Quote).appointment_id).maybeSingle(),
    ]);
    if (clinic) setClinicName(clinic.clinic_name as string);
    if (settings) {
      setWhatsappNumber((settings.whatsapp_number as string | null) ?? null);
    }
    if (appt) {
      setPatientPhone((appt.patient_phone as string | null) ?? null);
      setPatientEmail((appt.patient_email as string | null) ?? null);
    }

    if (settings?.logo_url) {
      try {
        const res = await signLogo({ data: { clinicId: (q as Quote).clinic_id, path: settings.logo_url as string } });
        setLogoUrl(res.url);
      } catch {
        setLogoUrl(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [quoteId]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center text-clinical-muted font-clinic-body">
        <div className="text-sm">Loading your consultation summary…</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-clinical-bg flex items-center justify-center text-clinical-muted font-clinic-body">
        <div className="text-sm">Quote not found.</div>
      </div>
    );
  }

  function waLink() {
    const num = (patientPhone ?? "").replace(/[^0-9]/g, "");
    const intl = num.startsWith("0") ? "61" + num.slice(1) : num;
    const bookLine = quote.booked_date
      ? `\nYour procedure date: ${fmtDate(quote.booked_date)}`
      : quote.date_option_1 || quote.date_option_2
        ? `\nNext available dates:\n${[quote.date_option_1, quote.date_option_2].filter(Boolean).map((d) => fmtDate(d!)).join("\n")}`
        : "";
    const msg = `Hi ${quote.patient_name.split(" ")[0]}, thanks for coming in today at ${clinicName}.

Diagnosis: ${quote.diagnosis}
Recommended plan: FUE hair transplant${quote.norwood ? ` · Norwood ${quote.norwood}` : ""}
${quote.grafts ? `Grafts: ${quote.grafts}\n` : ""}Price: ${fmt$(quote.price)} AUD

Ways people pay: in full · deposit + balance before procedure day · finance options available.

Quote valid until ${fmtDate(quote.valid_until)}${bookLine}

Any questions, just message back.`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  }

  async function onSendEmail() {
    if (!patientEmail) {
      toast.error("No patient email on file");
      return;
    }
    const res = await sendEmail({ data: { quoteId: quote!.id, to: patientEmail } });
    if (res.success) toast.success("Email sent");
    else toast.error(res.error ?? "Failed");
  }

  const showWarning = transplantWarning(quote.diagnosis);
  const includes = parseIncludes(quote.includes_text);

  return (
    <div className="min-h-screen bg-clinical-bg font-clinic-body relative">
      {/* Discreet doctor controls (top-right dot) */}
      <div className="fixed top-3 right-3 z-20">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More"
          className="w-9 h-9 rounded-full bg-white/90 border border-clinical-line flex items-center justify-center text-clinical-muted hover:text-clinical-text transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-11 bg-white border border-clinical-line rounded-xl shadow-xl min-w-[220px] overflow-hidden">
            <MenuBtn onClick={() => { setMenuOpen(false); navigate({ to: "/partner-clinics" }); }} label="Back to portal" icon={<ChevronLeft size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); window.open(waLink(), "_blank"); }} label="Send via WhatsApp" icon={<MessageCircle size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); void onSendEmail(); }} label="Send via email" icon={<Mail size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); void openGallery(); }} label="Timeline photos" icon={<Images size={14} />} />
            <div className="border-t border-clinical-line my-1" />
            <MenuBtn onClick={() => { setMenuOpen(false); setBookModal(true); }} label="Book date" icon={<Clock size={14} />} />
            <MenuBtn onClick={() => { setMenuOpen(false); setDepositModal(true); }} label="Record deposit" icon={<CheckCircle2 size={14} />} />
          </div>
        )}
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div
          className="bg-white border border-clinical-line overflow-hidden flex flex-col"
          style={{ boxShadow: "0 20px 50px -12px rgba(15, 23, 42, 0.08)" }}
        >
          {/* Document Header */}
          <div className="p-6 border-b border-clinical-line">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                {logoUrl ? (
                  <img src={logoUrl} alt={clinicName} className="max-h-12 max-w-[180px] object-contain" />
                ) : (
                  <h1 className="text-xl tracking-tight font-semibold text-clinical-text font-clinic-body">{clinicName}</h1>
                )}
                <p className="text-[10px] uppercase tracking-widest text-clinical-muted font-medium">Medical Consultation Summary</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-clinical-muted">Ref: {quoteRef(quote.id)}</p>
                <p className="text-[11px] text-clinical-muted">{todayAU()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-clinical-line/50">
              <div>
                <p className="text-[10px] uppercase text-clinical-muted font-semibold">Patient</p>
                <p className="text-sm font-medium text-clinical-text">{quote.patient_name}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-clinical-muted font-semibold">Clinic</p>
                <p className="text-sm font-medium text-clinical-text">{clinicName}</p>
              </div>
            </div>
          </div>

          {/* Clinical Assessment */}
          <div className="p-6 bg-slate-50/50">
            <h2 className="text-base font-semibold text-clinical-text mb-2 font-clinic-heading">Clinical Assessment</h2>
            <div className="bg-white border border-clinical-line p-3 rounded-sm">
              <p className="text-xs text-clinical-muted leading-relaxed">
                {quote.diagnosis}
                {quote.norwood ? ` · Norwood ${quote.norwood}` : ""}
              </p>
            </div>
            {showWarning && (
              <div className="mt-3 p-3 border rounded-sm bg-clinical-amber-fill border-clinical-amber/20">
                <p className="text-xs text-clinical-amber leading-relaxed">
                  Transplant usually not suitable for this diagnosis — consider treatment or specialist referral first.
                </p>
              </div>
            )}
          </div>

          {/* Recommended Plan */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-end border-b border-clinical-line pb-2">
              <h2 className="text-base font-semibold text-clinical-text font-clinic-heading">Recommended Plan</h2>
              <span className="text-[10px] font-bold text-clinical-accent bg-clinical-accent-fill px-2 py-0.5 rounded-full uppercase">FUE Procedure</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-clinical-muted">Estimated Graft Count</span>
              <span className="text-sm font-semibold text-clinical-text">
                {quote.grafts != null ? `${quote.grafts.toLocaleString()} Grafts` : "To be confirmed at consult"}
              </span>
            </div>

            {quote.norwood && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-clinical-muted">Norwood Scale</span>
                <span className="text-sm font-semibold text-clinical-text">{quote.norwood}</span>
              </div>
            )}

            {includes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase text-clinical-muted font-semibold">Clinical Inclusions</p>
                <ul className="text-xs text-clinical-muted space-y-1.5">
                  {includes.map((line, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-clinical-accent" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Investment & Scheduling */}
          <div className="mt-auto border-t-2 border-clinical-line">
            <div className="p-6 bg-white">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-medium text-clinical-muted">Treatment Investment</span>
                <span className="text-xl font-semibold text-clinical-text">{fmt$(quote.price)}</span>
              </div>

              {(quote.status === "booked" || quote.status === "deposit_recorded") && (
                <div className="mb-5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: GREEN_BG, color: GREEN }}>
                    <CheckCircle2 size={14} /> {statusLabel}
                  </span>
                </div>
              )}
              {(quote.status === "expired" || isExpired) && (
                <div className="mb-5 text-center">
                  <span className="inline-flex items-center gap-1.5 bg-clinical-amber-fill text-clinical-amber px-3 py-1.5 rounded-full text-xs font-semibold">
                    <Clock size={14} /> Expired
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] uppercase text-clinical-muted font-semibold text-center">
                  Quote valid until {fmtDate(quote.valid_until)}
                </p>

                {!quote.booked_date && (quote.date_option_1 || quote.date_option_2) && (
                  <>
                    <p className="text-[10px] uppercase text-clinical-muted font-semibold text-center">Next Available Clinical Slots</p>
                    <div className="flex gap-2 justify-center">
                      {quote.date_option_1 && (
                        <button
                          onClick={() => setBookModal(true)}
                          className="flex-1 py-2 px-1 border border-clinical-line rounded text-[11px] font-medium text-clinical-text hover:bg-slate-50 transition-colors"
                        >
                          {fmtDateCompact(quote.date_option_1)}
                        </button>
                      )}
                      {quote.date_option_2 && (
                        <button
                          onClick={() => setBookModal(true)}
                          className="flex-1 py-2 px-1 border border-clinical-line rounded text-[11px] font-medium text-clinical-text hover:bg-slate-50 transition-colors"
                        >
                          {fmtDateCompact(quote.date_option_2)}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {quote.booked_date && (
                  <div className="text-center p-2 bg-slate-50 rounded">
                    <p className="text-[10px] uppercase text-clinical-muted font-semibold">Your procedure date</p>
                    <p className="text-sm font-medium text-clinical-text">{fmtDate(quote.booked_date)}</p>
                  </div>
                )}

                <button
                  onClick={() => (patientPhone ? window.open(waLink(), "_blank") : toast.error("No patient phone on file"))}
                  disabled={!patientPhone}
                  className="w-full bg-clinical-text text-white py-3.5 rounded-sm text-sm font-semibold tracking-wide hover:bg-slate-800 transition-colors mt-2 uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={16} /> Secure Treatment Plan
                </button>

                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => void onSendEmail()}
                    disabled={!patientEmail}
                    className="flex-1 py-2 px-3 border border-clinical-line rounded text-[11px] font-medium text-clinical-text hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                  >
                    <Mail size={14} /> Send via email
                  </button>
                  <button
                    onClick={() => void openGallery()}
                    className="flex-1 py-2 px-3 border border-clinical-line rounded text-[11px] font-medium text-clinical-text hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Images size={14} /> Timeline
                  </button>
                </div>

                <p className="text-[10px] text-clinical-muted text-center">
                  Deposit required to confirm clinical space. Ways to pay: in full · deposit + balance · finance options available.
                </p>
              </div>
            </div>
          </div>
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

      {galleryOpen && (
        <ClinicFlowTimelineGallery
          photos={galleryPhotos ?? []}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}

function MenuBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-transparent border-none px-3.5 py-2.5 text-[13px] text-clinical-text flex items-center gap-2 hover:bg-slate-50 transition-colors"
    >
      <span className="text-clinical-muted">{icon}</span> {label}
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
    if (!d) {
      toast.error("Pick a date");
      return;
    }
    onDone(d);
  };
  return (
    <ModalShell title="Book procedure date" onClose={onClose}>
      <div className="grid gap-2">
        {quote.date_option_1 && <RadioRow checked={choice === "1"} onChange={() => setChoice("1")} label={`Option 1 · ${fmtDate(quote.date_option_1)}`} />}
        {quote.date_option_2 && <RadioRow checked={choice === "2"} onChange={() => setChoice("2")} label={`Option 2 · ${fmtDate(quote.date_option_2)}`} />}
        <RadioRow checked={choice === "custom"} onChange={() => setChoice("custom")} label="Custom date" />
        {choice === "custom" && (
          <input
            type="date"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full px-3 py-2.5 border border-clinical-line rounded-lg text-sm"
          />
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-clinical-line rounded-lg text-[13px] font-semibold text-clinical-text hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="px-5 py-2 bg-clinical-text text-white rounded-lg text-[13px] font-bold hover:bg-slate-800"
        >
          Book
        </button>
      </div>
    </ModalShell>
  );
}

function RecordDepositModal({ quote, onClose, onDone }: { quote: Quote; onClose: () => void; onDone: (amt: number) => void }) {
  const [amt, setAmt] = useState(String(Math.round(quote.deposit_amount)));
  const submit = () => {
    const n = Number(amt);
    if (!n || n <= 0) {
      toast.error("Enter an amount");
      return;
    }
    onDone(n);
  };
  return (
    <ModalShell title="Record deposit" onClose={onClose}>
      <div className="text-[13px] text-clinical-muted mb-3">Manual entry — bank transfer / EFTPOS at the clinic.</div>
      <label className="block">
        <div className="text-xs font-semibold text-clinical-muted mb-1.5">Amount (AUD)</div>
        <input
          inputMode="decimal"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          className="w-full px-3 py-2.5 border border-clinical-line rounded-lg text-[15px]"
        />
      </label>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-clinical-line rounded-lg text-[13px] font-semibold text-clinical-text hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="px-5 py-2 bg-green-700 text-white rounded-lg text-[13px] font-bold hover:bg-green-800"
        >
          Confirm
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/55 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="text-[17px] font-bold text-clinical-text">{title}</div>
          <button onClick={onClose} className="bg-transparent border-none text-clinical-muted hover:text-clinical-text">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RadioRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label
      className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors ${
        checked ? "border-clinical-text bg-clinical-accent-fill" : "border-clinical-line bg-white"
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      <span className="text-sm text-clinical-text">{label}</span>
    </label>
  );
}

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

function setWhatsappNumber(_: string | null) {
  // retained for backwards compatibility if needed elsewhere
}
