import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import GetStartedModal from "../components/GetStartedModal";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import processPhoneCall from "../assets/process-phone-call.jpg";
import patientProfile from "../assets/patient-profile.jpg";
import guaranteeHandshake from "../assets/guarantee-handshake.jpg";
import postConsultCoordinator from "../assets/post-consult-coordinator.jpg";
import faqFounder from "../assets/faq-founder.jpg";
import clinicReception from "../assets/clinic-reception.jpg";

export const Route = createFileRoute("/_dashboard/pitch-deck")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "Pitch Deck" },
      { name: "description", content: "Hair transplant marketing pitch deck." },
    ],
  }),
});

const TOTAL_SLIDES = 10;

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1,
  "1 in 2": 0.5,
  "1 in 3": 0.333,
  "1 in 4": 0.25,
  "1 in 5": 0.2,
  "1 in 6": 0.167,
  "1 in 7": 0.143,
  "1 in 8": 0.125,
  "1 in 9": 0.111,
  "1 in 10": 0.1,
};

/* Pre-deck settings popup — Peter sets the headline numbers that flow through every slide */
function SettingsPopup({ onEnter }: { onEnter: (caseValue: number, convertRate: string, pricePerShow: number) => void }) {
  const [caseValue, setCaseValue] = useState("12000");
  const [pricePerShow, setPricePerShow] = useState("1100");
  const [convertRate, setConvertRate] = useState("1 in 4");
  const [appReady, setAppReady] = useState(false);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (document.readyState === 'complete') {
      setAppReady(true);
    } else {
      const handler = () => setAppReady(true);
      window.addEventListener('load', handler);
      return () => window.removeEventListener('load', handler);
    }
  }, []);

  const handleCaseValueChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    setCaseValue(isNaN(num) ? "" : String(Math.min(num, 999999)));
  };

  const handlePriceChange = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    setPricePerShow(isNaN(num) ? "" : String(Math.min(num, 99999)));
  };

  const formattedCaseValue = caseValue
    ? Number(caseValue).toLocaleString("en-US")
    : "";
  const formattedPrice = pricePerShow
    ? Number(pricePerShow).toLocaleString("en-US")
    : "";

  const isValid = parseInt(caseValue, 10) >= 1000 && parseInt(pricePerShow, 10) >= 100;

  const handleStart = () => {
    if (clicked) return;
    setClicked(true);
    onEnter(parseInt(caseValue, 10) || 12000, convertRate, parseInt(pricePerShow, 10) || 1100);
  };

  const buttonDisabled = !isValid || !appReady || clicked;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center px-6">
      <Link
        to="/"
        className="absolute top-6 left-6 p-2 rounded-lg text-[#666] hover:text-foreground hover:bg-card/60 transition-all z-10"
        aria-label="Back to dashboard"
      >
        <Home className="w-5 h-5" />
      </Link>
      <div className="max-w-md w-full">
        <h2
          className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set Your Presentation Numbers
        </h2>
        <p className="text-[#CCCCCC] text-sm mb-10">
          These flow through to every slide — pricing, ROI, packages and the guarantee.
        </p>

        <div className="space-y-5 mb-10">
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Average Procedure Value ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formattedCaseValue}
              onChange={(e) => handleCaseValueChange(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Price Per Show ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formattedPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Estimated Conversion Rate
            </label>
            <select
              value={convertRate}
              onChange={(e) => setConvertRate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              {Object.entries(CONVERT_RATES).map(([label, r]) => (
                <option key={label} value={label}>{label} ({Math.round(r * 100)}%)</option>
              ))}
            </select>
          </div>
        </div>

        <button
          disabled={buttonDisabled}
          onClick={handleStart}
          className={`w-full bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40 ${!appReady ? "animate-pulse" : ""}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {!appReady ? "Loading..." : "START PRESENTATION →"}
        </button>
        {!isValid && (caseValue !== "" || pricePerShow !== "") && (
          <p className="text-xs text-red-400 mt-2 text-center">Procedure value must be at least $1,000 and price per show at least $100.</p>
        )}
      </div>
    </div>
  );
}

function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPopup, setShowPopup] = useState(true);
  const [caseValue, setCaseValue] = useState(12000);
  const [convertRate, setConvertRate] = useState("1 in 4");
  const [pricePerShow, setPricePerShow] = useState(1100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);

  const handleEnter = (cv: number, cr: string, pps: number) => {
    setCaseValue(cv);
    setConvertRate(cr);
    setPricePerShow(pps);
    setShowPopup(false);
  };

  const goToSlide = useCallback((index: number) => {
    setActiveSlide(index);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (showPopup) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setActiveSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showPopup]);

  // Preload images after popup is dismissed
  useEffect(() => {
    if (showPopup) return;
    const imageSrcs = [
      processPhoneCall,
      patientProfile,
      guaranteeHandshake,
      postConsultCoordinator,
      faqFounder,
      clinicReception,
    ];
    imageSrcs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [showPopup]);

  /* Helpers */
  const H = ({ children }: { children: React.ReactNode }) => (
    <h2
      className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h2>
  );

  const ChapterLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
      {children}
    </p>
  );

  const subClass = "text-[#CCCCCC] text-sm md:text-base leading-relaxed";
  const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtRounded = (n: number) => "$" + (Math.round(n / 1000) * 1000).toLocaleString();

  const rate = CONVERT_RATES[convertRate] ?? 0.25;

  const packs = useMemo(() => [
    { name: "Demo", shows: 10, highlight: false },
    { name: "Starter", shows: 20, highlight: false },
    { name: "Scale", shows: 50, highlight: false },
  ], []);

  const faqItems = [
    { q: "What if a patient doesn't show?", a: "You don't pay. Simple as that. We credit or refund immediately." },
    { q: "What if you can't get me leads in time?", a: "That hasn't happened in this industry. But if it did, we'd refund your investment in full." },
    { q: "What hair transplant clients have you worked with?", a: "We've worked with clinics all over Australia. Confidentiality agreements prevent us from naming them — the same protection applies to you." },
    { q: "Can I see ad examples?", a: "Yes. Shared once you're onboard. Everything approved by you before it goes live." },
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Whose Meta account do you use?", a: "Ours. You give us page access. We carry the risk." },
  ];

  if (showPopup) {
    return <SettingsPopup onEnter={handleEnter} />;
  }

  /* Photo overlay helper — responsive to fullscreen */
  const FullBg = ({ src, alt }: { src: string; alt: string }) => (
    <div className="absolute inset-0" style={{ willChange: "transform" }}>
      <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );

  const PhotoSide = ({ src, alt }: { src: string; alt: string }) => (
    <div className={`absolute right-0 top-0 h-full hidden md:block ${isFullscreen ? "w-[25%]" : "w-[35%]"}`} style={{ willChange: "transform" }}>
      <img src={src} alt={alt} loading="lazy" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
    </div>
  );

  const slides = [
    /* ──────── SLIDE 1 — COVER ──────── */
    <div key="cover" className="deck-slide flex flex-col items-center justify-center min-h-screen w-full px-16 py-12 text-center bg-black">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
        <motion.h1
          variants={fadeIn}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          HAIR TRANSPLANT
          <br />
          <span className="text-primary">PATIENT ACQUISITION</span>
          <br />
          DONE FOR YOU
        </motion.h1>
        <motion.p variants={fadeIn} className={`${subClass} mt-8 max-w-md mx-auto`}>
          Confirmed consults delivered to your clinic — you only pay when they show.
        </motion.p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 2 — THE OPPORTUNITY ──────── */
    <div key="opportunity" className="deck-slide flex flex-col min-h-screen w-full px-16 py-12 bg-black">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex-1 flex flex-col justify-center w-full max-w-5xl mx-auto text-center">
        <motion.div variants={fadeIn}>
          <h2
            className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Where Most Clinics Lose Patients.
          </h2>
        </motion.div>
        <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          {[
            { emoji: "🪑", title: "Empty chairs cost you every day they're not booked" },
            { emoji: "⏱️", title: "Leads go cold if you don't call them within 5 minutes" },
            { emoji: "📅", title: "Undecided patients rarely come back on their own" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-4 p-8 rounded-xl bg-zinc-900 border border-white/10">
              <span className="text-5xl">{item.emoji}</span>
              <p className="text-lg md:text-xl lg:text-2xl font-extrabold text-foreground leading-snug text-center">{item.title}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 3 — OUR PROCESS (2x2 grid centered) ──────── */
    <div key="process" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      {/* Left content — 70% */}
      <div className="w-[70%] flex flex-col justify-center px-16 py-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center">
          <motion.div variants={fadeIn} className="mb-12">
            <h2
              className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Our Process
            </h2>
          </motion.div>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="grid grid-cols-2 gap-x-12 gap-y-10 max-w-4xl w-full mx-auto">
          {[
            { step: 1, title: "We Run The Ads" },
            { step: 2, title: "We Call Every Lead Within 5 Minutes" },
            { step: 3, title: "We Book Confirmed Appointments" },
            { step: 4, title: "We Follow Up After The Consult" },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-5 text-left">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/30 text-primary flex items-center justify-center font-extrabold text-2xl" style={{ color: 'hsl(217, 91%, 65%)' }}>
                {item.step}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{item.title}</p>
            </div>
          ))}
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mt-12">
          <p
            className="text-3xl md:text-5xl font-extrabold text-foreground leading-snug"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="relative inline-block pb-3">
              Pay Per Show. Not Per Click.
              <span className="absolute bottom-0 left-0 w-full h-[5px] rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
            </span>
          </p>
          <p className="text-[#CCCCCC] text-base mt-4">
            You only pay when a patient is sitting in your consult chair. Patients pay a deposit to attend the consult, which keeps our show rate around <span className="text-foreground font-bold">80%</span>.
          </p>
        </motion.div>
      </div>
      {/* Right photo panel — 30% */}
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img
          src={processPhoneCall}
          alt="Professional on a phone call"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
    </div>,

    /* ──────── SLIDE 4 — WHO WE SEND YOU (2x2 cards centered) ──────── */
    <div key="patients" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      {/* Left content — 70% */}
      <div className="w-[70%] flex flex-col justify-center px-16 py-12">
        <div className="w-full text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeIn} className="mb-4">
              <H>Who We'll Be Sending You.</H>
            </motion.div>
            <motion.p variants={fadeIn} className="text-xl md:text-2xl font-bold text-[#CCCCCC] mb-12 max-w-none mx-auto leading-snug">
              Patients who know it costs $10,000–$20,000 and have paid a deposit to attend the consult.<br />
              Not browsers — confirmed bookings.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full mx-auto">
            {[
              { title: "Financially Ready", desc: "They've done the research, know the price, and aren't shocked by the number.", emoji: "💰", highlight: true },
              { title: "Ready To Move", desc: "They've been thinking about this for years and have decided it's time.", emoji: "🎯", highlight: false },
              { title: "Wants Permanent Results", desc: "Not interested in medication or SMP. They want the transplant done properly.", emoji: "✅", highlight: false },
            ].map((card) => (
              <div
                key={card.title}
                className={`rounded-xl p-10 ${
                  card.highlight
                    ? "bg-primary/15 border border-primary"
                    : "bg-card/80 border border-border"
                }`}
              >
                <p className="text-5xl mb-4">{card.emoji}</p>
                <p className="text-2xl font-extrabold text-foreground mb-3">{card.title}</p>
                <p className="text-[#CCCCCC] text-base leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </motion.div>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-sm text-[#999] mt-8 max-w-xl text-center mx-auto">
            Other inquiries like SMP or medication consultations? We send those through as a bonus at no charge.
          </motion.p>
        </div>
      </div>
      {/* Right photo panel — 30% */}
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img
          src={patientProfile}
          alt="Confident professional man"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    </div>,

    /* ──────── SLIDE 5 — POST CONSULT (two columns) ──────── */
    <div key="post-consult" className="deck-slide flex min-h-screen w-full">
      <SlideHeader />
      {/* Left column */}
      <div className="w-[70%] bg-black flex flex-col justify-center px-16 py-12">
        <ChapterLabel>POST CONSULT</ChapterLabel>
        <h2
          className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Didn't Book On The Day?<br />
          We Stay With Them.
        </h2>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="mt-12 divide-y divide-white/10">
          {[
            { num: "1", title: "We Follow Up Until They're Ready" },
            { num: "2", title: "We Work Through Their Questions" },
            { num: "3", title: "We Keep The Relationship Intact" },
          ].map((item) => (
            <div key={item.num} className="py-6 flex items-center gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-lg">{item.num}</span>
              <p className="text-xl md:text-2xl font-extrabold text-foreground">{item.title}</p>
            </div>
          ))}
        </motion.div>
      </div>
      {/* Right column — photo 30% */}
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img src={postConsultCoordinator} alt="Patient coordinator" loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    </div>,

    /* ──────── SLIDE 6 — ROI CALCULATOR ──────── */
    <ROICalculator key="roi" caseValue={caseValue} convertRate={convertRate} pricePerShow={pricePerShow} onCaseValueChange={setCaseValue} onConvertRateChange={setConvertRate} onPricePerShowChange={setPricePerShow} />,

    /* ──────── SLIDE 7 — PACKAGES (centered) ──────── */
    <div key="packages" className="deck-slide flex flex-col items-center min-h-screen w-full px-16 py-12">
      <SlideHeader />
      <div className="flex-1" />
      <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-5xl text-center mb-8">
        <ChapterLabel>PACKAGES</ChapterLabel>
        <h2 className="text-4xl md:text-[3.2rem] font-extrabold text-foreground leading-[1.08] tracking-tight whitespace-nowrap" style={{ fontFamily: "var(--font-heading)" }}>Choose How Many Patients You Want.</h2>
      </div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {packs.map((pack) => {
          const procedures = pack.shows * rate;
          const revenue = procedures * caseValue;
          const cost = pack.shows * pricePerShow;
          return (
            <div
              key={pack.name}
              className="rounded-xl bg-zinc-900 px-10 py-12 text-center relative border border-border"
            >
              <h3 className="text-3xl font-extrabold text-foreground mb-2">{pack.name}</h3>
              <p className="text-[#CCCCCC] text-base mb-1">{pack.shows} show up appointments</p>
              <p className="text-[#CCCCCC] text-base mb-8">${pricePerShow.toLocaleString()} per appointment</p>
              <div className="border-t border-border pt-8 space-y-6">
                <div>
                  <p className="text-[10px] text-[#888] mb-1.5 uppercase tracking-wider">Est. Procedure Revenue</p>
                  <p className="font-extrabold text-primary" style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtRounded(revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#888] mb-1.5 uppercase tracking-wider">Your Investment</p>
                  <p className="text-xl font-bold text-foreground">{fmt(cost)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>
      <p className="text-xs text-[#999] italic mt-6 text-center">*Based on a {convertRate} conversion rate, in line with our existing clients in this industry.</p>

      {/* Lifetime value section — the upfront procedure isn't where the value ends */}
      <div className="w-full max-w-5xl mt-10 rounded-xl border border-border bg-zinc-900/60 px-8 py-7">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            The Numbers Above Are Just The First Procedure.
          </h3>
          <p className="text-xs text-[#999] uppercase tracking-wider">Lifetime Value</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Membership Plans", desc: "Recurring monthly aftercare and maintenance." },
            { label: "Future Procedures", desc: "Top-ups and second sessions over time." },
            { label: "Referrals", desc: "Friends and family from a happy result." },
            { label: "Take-Home Products", desc: "Shampoos, serums and ongoing add-ons." },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-black/40 px-4 py-3">
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p className="text-xs text-[#CCCCCC] mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
      <div className="flex-1" />
    </div>,

    /* ──────── SLIDE 8 — THE GUARANTEE ──────── */
    <div key="guarantee" className="deck-slide flex min-h-screen w-full">
      <SlideHeader />
      {/* Left photo panel — 30% */}
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img
          src={guaranteeHandshake}
          alt="Professional handshake"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      {/* Right content — 70% */}
      <div className="w-[70%] flex items-center justify-center px-16 py-12 bg-black">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl text-center">
          <motion.div variants={fadeIn}>
            <ChapterLabel>THE GUARANTEE</ChapterLabel>
          </motion.div>
          <motion.div variants={fadeIn} className="mb-16">
            <h2
              className="text-4xl md:text-[4rem] font-extrabold text-foreground leading-[1.08] tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              The Risk Sits With Us,
              <br />
              Not You.
            </h2>
          </motion.div>
          <motion.div variants={fadeIn} className="space-y-10 text-left max-w-2xl mx-auto">
            {[
              "No show, no charge.",
              "If your first 10 shows don't produce 2 procedures, we send 5 more at no cost.",
              "Month to month. Cancel any time.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-5">
                <span className="text-primary font-bold flex-shrink-0 text-3xl">✓</span>
                <p className="text-xl md:text-2xl lg:text-3xl font-extrabold text-foreground leading-snug">{item}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>,

    /* ──────── SLIDE 9 — FAQ (black bg, large text) ──────── */
    <div key="faq" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      {/* Left content — 70% */}
      <div className="w-[70%] flex flex-col justify-center px-16 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <ChapterLabel>QUESTIONS</ChapterLabel>
            <H>Questions I Get Asked</H>
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="divide-y divide-border w-full">
            {faqItems.map((item, i) => (
              <div key={i} className="py-5">
                <p className="text-lg md:text-xl font-bold text-foreground">{item.q}</p>
                <p className="text-base text-[#CCCCCC] mt-2 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      {/* Right photo panel — 30% */}
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img src={faqFounder} alt="Founder in conversation" loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    </div>,

    /* ──────── SLIDE 10 — CLOSE ──────── */
    <div key="close" className="deck-slide relative flex flex-col items-center justify-center min-h-screen w-full px-16 py-12 text-center bg-black">
      <SlideHeader />
      <img src={clinicReception} alt="Modern clinic reception" loading="lazy" className="absolute inset-0 w-full h-full object-cover" style={{ willChange: "transform" }} />
      <div className="absolute inset-0 bg-black/85" />
      <div className="relative z-10">
        <Link
          to="/"
          className="fixed bottom-4 right-4 z-50 p-2 rounded-lg bg-card/30 border border-border/30 text-[#666] hover:text-foreground hover:bg-card/60 transition-all"
          aria-label="Back to dashboard"
        >
          <Home className="w-4 h-4" />
        </Link>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeIn}>
            <H>Let Us Fill Your Calendar.</H>
          </motion.div>
          <motion.div variants={fadeIn} className="mt-10">
            <button
              onClick={() => setShowGetStarted(true)}
              className="inline-block bg-primary text-primary-foreground font-bold text-lg px-12 py-5 rounded-lg tracking-wide hover:opacity-90 transition-opacity cursor-pointer"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              GET STARTED →
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>,
  ];
  return (
    <div className="relative group" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Fullscreen toggle */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Toggle fullscreen"
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>

      {/* Single slide display — only mount active ±1 for performance */}
      <div ref={containerRef} className="w-full h-full">
        {slides.map((slide, i) => {
          if (Math.abs(i - activeSlide) > 1) return null;
          return (
            <div key={i} style={{ display: i === activeSlide ? "block" : "none", width: "100%", height: "100%" }}>
              {slide}
            </div>
          );
        })}
      </div>

      <GetStartedModal open={showGetStarted} onClose={() => setShowGetStarted(false)} />

      {/* Nav arrows — always visible */}
      {activeSlide > 0 && (
        <button
          onClick={() => goToSlide(activeSlide - 1)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-card/60 border border-border text-foreground opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {activeSlide < TOTAL_SLIDES - 1 && (
        <button
          onClick={() => goToSlide(activeSlide + 1)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-card/60 border border-border text-foreground opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Next slide"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Progress dots */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeSlide
                ? "bg-primary scale-125"
                : "bg-[#CCCCCC]/30 hover:bg-[#CCCCCC]/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
