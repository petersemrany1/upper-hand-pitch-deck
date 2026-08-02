import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { APP_TIMEZONE } from "@/lib/timezone";
import { toast } from "sonner";
import { MoreVertical, ChevronLeft, MessageCircle, Mail, CheckCircle2, Clock, Images, Lock } from "lucide-react";
import {
  bookClinicflowQuoteDate,
  getPublicClinicflowQuote,
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


function QuotePage() {
  const { quoteId } = useParams({ from: "/clinic-quote/$quoteId" });
  const navigate = useNavigate();
  const getQuote = useServerFn(getPublicClinicflowQuote);
  const bookDate = useServerFn(bookClinicflowQuoteDate);
  const recordDep = useServerFn(recordClinicflowQuoteDeposit);
  const sendEmail = useServerFn(sendClinicflowQuoteEmail);
  const fetchPhotos = useServerFn(getClinicflowPhotosForQuote);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
  const [clinicCity, setClinicCity] = useState<string | null>(null);
  const [patientPhone, setPatientPhone] = useState<string | null>(null);
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [coolingOffDays, setCoolingOffDays] = useState<number>(7);

  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookModal, setBookModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [ctaSubmitting, setCtaSubmitting] = useState(false);

  const refresh = async () => {
    try {
      const result = await getQuote({ data: { quoteId } });
      if (!result.quote) {
        toast.error("Quote not found");
        setQuote(null);
        setLoading(false);
        return;
      }

      setQuote(result.quote as Quote);
      setClinicName(result.clinic?.name ?? "");
      setClinicCity(result.clinic?.city ?? null);
      setPatientPhone(result.patient.phone);
      setPatientEmail(result.patient.email);
      setDoctorName(result.settings.doctorName);
      setCoolingOffDays(result.settings.coolingOffDays);
      setLogoUrl(result.settings.logoUrl);
      setLoading(false);
    } catch (error) {
      setQuote(null);
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Could not load quote");
    }
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
    if (!quote) return "#";
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
${quote.grafts ? `${quote.graft_unit === "hairs" ? "Hairs" : "Grafts"}: ${quote.grafts}\n` : ""}Price: ${fmt$(quote.price)} AUD
${quote.description ? `\n${quote.description}\n` : ""}
Ways people pay: in full · deposit + balance before procedure day · finance options available.

Quote valid until ${fmtDate(quote.valid_until)}${bookLine}

Any questions, just message back.`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  }

  async function onSendEmail(to?: string) {
    const recipient = (to ?? patientEmail ?? "").trim();
    if (!recipient) {
      toast.error("No patient email on file");
      return;
    }
    const res = await sendEmail({ data: { quoteId: quote!.id, to: recipient } });
    if (res.success) toast.success("Email sent");
    else toast.error(res.error ?? "Failed");
  }


  const showWarning = transplantWarning(quote.diagnosis);
  const firstName = quote.patient_name.split(" ")[0];
  const docName = doctorName?.trim() || "your surgeon";
  const unitLabel = quote.graft_unit === "hairs" ? "Hairs" : "Grafts";
  const dateOptions = [quote.date_option_1, quote.date_option_2].filter(Boolean) as string[];
  const weekly = quote.price > 0 ? Math.ceil(quote.price / (5 * 52) / 5) * 5 : 0;
  const deposit = Math.round(quote.deposit_amount || 0);
  const activeDate = quote.booked_date ?? selectedDate;
  const ctaLabel = deposit > 0
    ? `Secure my surgery date — ${fmt$(deposit)} deposit`
    : "Secure my surgery date";



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
                {clinicCity && <p className="text-[11px] text-clinical-muted">{clinicCity}</p>}
              </div>
            </div>
          </div>

          {/* Headline + assessment at a glance */}
          <div className="px-6 pt-6 pb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-clinical-text font-clinic-heading">
              {firstName}, your treatment plan
            </h2>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <SummaryTile label="Diagnosis" value={quote.diagnosis} />
              <SummaryTile label="Norwood" value={quote.norwood ?? "—"} />
              <SummaryTile
                label={unitLabel}
                value={quote.grafts != null ? quote.grafts.toLocaleString() : "TBC"}
              />
            </div>

            {showWarning && (
              <div className="mt-4 p-3 border rounded-sm bg-clinical-amber-fill border-clinical-amber/20">
                <p className="text-xs text-clinical-amber leading-relaxed">
                  Transplant usually not suitable for this diagnosis — consider treatment or specialist referral first.
                </p>
              </div>
            )}
          </div>

          {/* Investment + finance + deposit */}
          <div className="px-6 py-6 border-t border-clinical-line bg-slate-50/60">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase text-clinical-muted font-semibold">Total price</p>
                <p className="text-3xl font-semibold text-clinical-text tracking-tight mt-1">{fmt$(quote.price)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10px] uppercase text-clinical-muted font-semibold mb-2">Funding options</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="bg-white border border-clinical-line rounded-sm p-3">
                  <p className="text-[11px] uppercase tracking-wide text-clinical-muted font-semibold">Upfront</p>
                  <p className="text-sm font-semibold text-clinical-text mt-1">{fmt$(quote.price)}</p>
                  <p className="text-[11px] text-clinical-muted mt-0.5">Paid in full before surgery day.</p>
                </div>
                <div className="bg-white border border-clinical-line rounded-sm p-3">
                  <p className="text-[11px] uppercase tracking-wide text-clinical-muted font-semibold">Payment plan</p>
                  <p className="text-sm font-semibold text-clinical-text mt-1">
                    {weekly > 0 ? `from ${fmt$(weekly)}/week` : "Available"}
                  </p>
                  <p className="text-[11px] text-clinical-muted mt-0.5">5-year plan, subject to approval.</p>
                </div>
              </div>
            </div>




            {(quote.status === "booked" || quote.status === "deposit_recorded") && (
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: GREEN_BG, color: GREEN }}>
                  <CheckCircle2 size={14} /> {statusLabel}
                </span>
              </div>
            )}
          </div>

          {/* What's included — above the CTA */}
          <div className="px-6 py-5 border-t border-clinical-line bg-white">
            <h3 className="text-sm font-semibold text-clinical-text font-clinic-heading mb-2">What's included</h3>
            <ul className="text-xs text-clinical-muted space-y-1.5">
              {[
                `Hairline design session with ${docName} before surgery day`,
                `Full sapphire FUE procedure led by ${docName}`,
                "Take-home aftercare kit",
                "Follow-up reviews at 3, 6 and 12 months",
                `Direct access to ${docName} if anything comes up`,
              ].map((line, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-clinical-accent" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Date selection + CTA */}
          <div className="px-6 py-6 border-t border-clinical-line">
            {quote.status === "booked" || quote.status === "deposit_recorded" ? (
              <div
                className="p-4 rounded-sm border text-center"
                style={{ background: GREEN_BG, borderColor: GREEN, color: GREEN }}
              >
                <p className="text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  You're booked{quote.booked_date ? ` for ${fmtDate(quote.booked_date)}` : ""} — {clinicName || "the clinic"} will confirm within one business day.
                </p>
              </div>
            ) : (
              <>
                {dateOptions.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] uppercase text-clinical-muted font-semibold">Choose your surgery date</p>
                      <span className="text-[10px] font-bold uppercase text-clinical-amber bg-clinical-amber-fill px-2 py-0.5 rounded-full">
                        Only {dateOptions.length} {dateOptions.length === 1 ? "date" : "dates"} left
                      </span>
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${dateOptions.length}, minmax(0, 1fr))` }}>
                      {dateOptions.map((d) => {
                        const on = selectedDate === d;
                        return (
                          <button
                            key={d}
                            onClick={() => setSelectedDate(on ? null : d)}
                            className={`py-3 px-2 rounded-sm border text-sm font-semibold transition-colors ${
                              on
                                ? "border-clinical-text bg-clinical-accent-fill text-clinical-text"
                                : "border-clinical-line bg-white text-clinical-text hover:bg-slate-50"
                            }`}
                          >
                            <span className="block">{fmtDateCompact(d)}</span>
                            <span className="block text-[10px] font-normal text-clinical-muted">
                              {new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", timeZone: APP_TIMEZONE })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                <p className="text-xs text-clinical-muted text-center mt-4">
                  Pay your deposit and {clinicName || "the clinic"} will confirm your surgery date within one business day.
                </p>

                <button
                  onClick={async () => {
                    if (quote.status === "expired" || isExpired) {
                      toast.error("This quote has expired — ask the clinic to re-issue it");
                      return;
                    }
                    if (dateOptions.length > 0 && !selectedDate) {
                      toast.error("Pick a date first");
                      return;
                    }
                    setCtaSubmitting(true);
                    try {
                      await bookDate({ data: { quoteId: quote.id, bookedDate: selectedDate as string } });
                      toast.success("Date locked in");
                      await refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Could not book this date");
                    } finally {
                      setCtaSubmitting(false);
                    }
                  }}
                  disabled={ctaSubmitting}
                  className="w-full bg-clinical-text text-white py-4 rounded-sm text-sm font-semibold tracking-wide hover:bg-slate-800 transition-colors mt-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock size={16} /> {ctaSubmitting ? "Booking…" : ctaLabel}
                </button>
              </>
            )}

            <p className="text-[11px] text-clinical-muted text-center mt-4 flex items-center justify-center gap-1.5">
              <Clock size={12} />
              {quote.status === "expired" || isExpired
                ? "This quote has expired — message the clinic to have it re-issued."
                : `This quote is valid until ${fmtDate(quote.valid_until)}.`}
            </p>
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-clinical-line rounded-sm p-3 bg-white">
      <p className="text-[10px] uppercase text-clinical-muted font-semibold">{label}</p>
      <p className="text-[13px] font-medium text-clinical-text leading-snug mt-0.5">{value}</p>
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
  graft_unit?: string | null;
  price: number;
  deposit_amount: number;
  description: string | null;
  includes_text: string | null;
  valid_until: string;
  date_option_1: string | null;
  date_option_2: string | null;
  status: "draft" | "presented" | "booked" | "deposit_recorded" | "expired";
  booked_date: string | null;
  deposit_recorded_at?: string | null;
};
