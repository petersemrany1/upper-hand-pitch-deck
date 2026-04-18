import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import GetStartedModal from "../components/GetStartedModal";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Home, Megaphone, Phone, Wallet, CalendarCheck, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { loadDeckSettings, DEFAULT_SETTINGS } from "./_dashboard.settings";
import patientPhoto from "../assets/pitch/patient.jpg";
import teamPhoto from "../assets/pitch/team.jpg";
import hairPhoto from "../assets/pitch/hair.jpg";
import clinicPhoto from "../assets/pitch/clinic.jpg";

const DECK_PHOTOS = [patientPhoto, teamPhoto, hairPhoto, clinicPhoto];

export const Route = createFileRoute("/_dashboard/pitch-deck")({
  component: PitchDeck,
  head: () => ({
    meta: [
      { title: "Pitch Deck" },
      { name: "description", content: "Hair transplant marketing pitch deck." },
    ],
  }),
});

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const CONVERT_RATES: Record<string, number> = {
  "1 in 1": 1,
  "3 in 4": 0.75,
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

function PitchDeck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const initial = loadDeckSettings();
  const [caseValue, setCaseValue] = useState(initial.caseValue);
  const [convertRate, setConvertRate] = useState(initial.convertRate);
  const [pricePerShow, setPricePerShow] = useState(initial.pricePerShow);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [started, setStarted] = useState(false);

  // Local setup-screen inputs (string-formatted for typing)
  const [setupCaseValue, setSetupCaseValue] = useState(String(initial.caseValue));
  const [setupPricePerShow, setSetupPricePerShow] = useState(String(initial.pricePerShow));
  const [setupConvertRate, setSetupConvertRate] = useState(initial.convertRate);

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
  // Eager-preload every deck photo before any slide renders an <img>.
  useEffect(() => {
    DECK_PHOTOS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);


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
    { q: "What if a patient doesn't show?", a: "You don't pay. We credit or refund immediately." },
    { q: "What if you can't get me leads in time?", a: "That hasn't been an issue in this industry. If it happened, we'd refund your investment in full." },
    { q: "What hair transplant clients have you worked with?", a: "We've worked with clinics across Australia. Confidentiality agreements prevent us from naming them — the same protection applies to you." },
    { q: "Can I see ad examples?", a: "Yes, shared once you're onboard. Everything is approved by you before it goes live." },
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Whose Meta account do you use?", a: "Ours. You give us page access. We carry the risk." },
  ];

  const slides = [
    /* ──────── SLIDE 1 — COVER (hero statement) ──────── */
    <div key="cover" className="deck-slide flex flex-col justify-center min-h-screen w-full px-[5vw] py-[6vh] bg-black overflow-hidden">
      <SlideHeader />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="w-full flex flex-col justify-center"
        style={{ gap: "clamp(0.75rem, 2.5vh, 2.5rem)" }}
      >
        <motion.p
          variants={fadeIn}
          className="font-light text-white tracking-tight"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.75rem, 5vw, 5rem)",
            lineHeight: 1.05,
            whiteSpace: "nowrap",
          }}
        >
          Guarantee someone arriving at your clinic
        </motion.p>
        <motion.p
          variants={fadeIn}
          className="font-black tracking-tight"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#2D6BE4",
            fontSize: "clamp(3rem, 11vw, 11rem)",
            lineHeight: 0.95,
            whiteSpace: "nowrap",
          }}
        >
          knowing the price
        </motion.p>
        <motion.p
          variants={fadeIn}
          className="font-black tracking-tight"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#2D6BE4",
            fontSize: "clamp(3rem, 11vw, 11rem)",
            lineHeight: 0.95,
            whiteSpace: "nowrap",
          }}
        >
          with a deposit.
        </motion.p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 2 — OUR PROCESS (visual journey) ──────── */
    <div key="process" className="deck-slide flex flex-col min-h-screen w-full bg-black px-16 py-12">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14 mt-4">
        <motion.div variants={fadeIn}>
          <ChapterLabel>HOW IT WORKS</ChapterLabel>
          <H>The Patient Journey</H>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="flex-1 flex items-center justify-center w-full"
      >
        <div className="relative w-full max-w-6xl mx-auto">
          {/* Connecting line */}
          <div className="absolute top-12 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-primary/20 via-primary to-primary/20 hidden md:block" />

          <div className="hidden md:flex items-start justify-between gap-2 relative">
            {[
              { icon: Megaphone, label: "We Run The Ads", sub: "Proven creative. We cover the spend." },
              { icon: Phone, label: "We Call Every Lead", sub: "Selling them on YOUR clinic." },
              { icon: Wallet, label: "We Finance Check", sub: "Discuss how they'll fund it." },
              { icon: CalendarCheck, label: "Deposit & Booked", sub: "In your calendar, ready to attend." },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-start flex-1">
                <motion.div
                  variants={fadeIn}
                  className="flex flex-col items-center text-center flex-1 px-2"
                >
                  <div className="relative z-10 w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-8 ring-black">
                    <step.icon className="w-10 h-10" strokeWidth={2} />
                  </div>
                  <div className="mt-5">
                    <p className="text-xs font-bold tracking-widest text-primary uppercase mb-2">Step {i + 1}</p>
                    <p className="text-base md:text-lg font-extrabold text-foreground leading-tight mb-2">{step.label}</p>
                    <p className="text-xs text-[#AAA] leading-snug max-w-[180px] mx-auto">{step.sub}</p>
                  </div>
                </motion.div>
                {i < arr.length - 1 && (
                  <motion.div variants={fadeIn} className="flex items-center justify-center pt-9 -mx-2 z-10">
                    <ArrowRight className="w-7 h-7 text-primary" strokeWidth={2.5} />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile fallback */}
          <div className="md:hidden flex flex-col gap-4">
            {[
              { icon: Megaphone, label: "We Run The Ads", sub: "Proven creative. We cover the spend." },
              { icon: Phone, label: "We Call Every Lead", sub: "Selling them on YOUR clinic." },
              { icon: Wallet, label: "We Finance Check", sub: "Discuss how they'll fund it." },
              { icon: CalendarCheck, label: "Deposit & Booked", sub: "In your calendar, ready to attend." },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-4 bg-zinc-900/60 border border-white/10 rounded-xl p-4">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest text-primary uppercase">Step {i + 1}</p>
                  <p className="text-base font-extrabold text-foreground">{step.label}</p>
                  <p className="text-xs text-[#AAA]">{step.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <motion.div variants={fadeIn} className="mt-14 text-center">
            <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-full px-6 py-3">
              <CalendarCheck className="w-5 h-5 text-primary" />
              <p className="text-sm md:text-base font-bold text-foreground">A qualified, paid-deposit patient sitting in your consult chair.</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 3 — WHO WE SEND YOU ──────── */
    <div key="patients" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      <div className="w-[65%] flex flex-col justify-center px-16 py-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeIn} className="mb-10">
            <ChapterLabel>THE PATIENT</ChapterLabel>
            <H>Who We'll Be Sending You.</H>
          </motion.div>

          <motion.div variants={fadeIn} className="grid grid-cols-1 gap-5 max-w-2xl">
            {[
              { title: "Financially Ready", desc: "Knows the price. Not shocked by it.", emoji: "💰" },
              { title: "Ready To Move", desc: "Paid a deposit to attend the consult.", emoji: "🎯" },
              { title: "Decided It's Time", desc: "We've uncovered their reason. We'll share it with you.", emoji: "🔑" },
            ].map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-5 rounded-xl px-6 py-5 bg-zinc-900/60 border border-white/10 hover:border-primary/40 transition-colors"
              >
                <div className="flex-shrink-0 text-3xl">{card.emoji}</div>
                <div className="flex-1">
                  <p className="text-xl md:text-2xl font-extrabold text-foreground leading-tight mb-1">{card.title}</p>
                  <p className="text-sm md:text-base text-[#CCCCCC] leading-snug">{card.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
      <div className="w-[35%] relative overflow-hidden bg-black">
        <img
          src={patientPhoto}
          alt="A man in his 40s sitting at a cafe in natural light, looking thoughtful"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>
    </div>,

    /* ──────── SLIDE 4 — POST CONSULT ──────── */
    <div key="post-consult" className="deck-slide flex min-h-screen w-full">
      <SlideHeader />
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
            { num: "1", title: "We follow up until they're ready" },
            { num: "2", title: "We work through their questions" },
            { num: "3", title: "We keep the relationship intact" },
          ].map((item) => (
            <div key={item.num} className="py-6 flex items-center gap-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-lg">{item.num}</span>
              <p className="text-xl md:text-2xl font-extrabold text-foreground">{item.title}</p>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="w-[30%] relative overflow-hidden bg-black" style={{ willChange: "transform" }}>
        <img
          src={teamPhoto}
          alt="Two people on phones at a desk in a small office, both smiling and engaged"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>
    </div>,

    /* ──────── SLIDE 5 — PACKAGES (now before Numbers) ──────── */
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
      </div>
      <div className="flex-1" />
    </div>,

    /* ──────── SLIDE 6 — YOUR NUMBERS (ROI) ──────── */
    <ROICalculator key="roi" caseValue={caseValue} convertRate={convertRate} pricePerShow={pricePerShow} onCaseValueChange={setCaseValue} onConvertRateChange={setConvertRate} onPricePerShowChange={setPricePerShow} />,

    /* ──────── SLIDE 7 — FAQ ──────── */
    <div key="faq" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
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
      <div className="w-[30%] relative overflow-hidden bg-black" style={{ willChange: "transform" }}>
        <img
          src={hairPhoto}
          alt="A confident man with a thick, full head of hair in natural light"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>
    </div>,

    /* ──────── SLIDE 8 — CLOSE ──────── */
    <div key="close" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      <div className="w-[70%] relative flex flex-col items-center justify-center px-16 py-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(198,255,0,0.18),transparent_32%),linear-gradient(180deg,rgba(18,18,18,0.45),rgba(0,0,0,0.94))]" />
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
      </div>
      <div className="w-[30%] relative overflow-hidden bg-black">
        <img
          src={clinicPhoto}
          alt="A modern, clean cosmetic clinic reception desk with bright contemporary interior"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>
    </div>,
  ];

  const TOTAL_SLIDES = slides.length;

  useEffect(() => {
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
  }, [TOTAL_SLIDES]);

  if (!started) {
    const handleCaseChange = (val: string) => {
      const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
      setSetupCaseValue(isNaN(num) ? "" : String(Math.min(num, 999999)));
    };
    const handlePriceChange = (val: string) => {
      const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
      setSetupPricePerShow(isNaN(num) ? "" : String(Math.min(num, 99999)));
    };
    const fmtCase = setupCaseValue ? Number(setupCaseValue).toLocaleString("en-US") : "";
    const fmtPrice = setupPricePerShow ? Number(setupPricePerShow).toLocaleString("en-US") : "";
    const setupValid = parseInt(setupCaseValue, 10) >= 1000 && parseInt(setupPricePerShow, 10) >= 100;

    const handleStart = () => {
      const payload = {
        caseValue: parseInt(setupCaseValue, 10) || DEFAULT_SETTINGS.caseValue,
        pricePerShow: parseInt(setupPricePerShow, 10) || DEFAULT_SETTINGS.pricePerShow,
        convertRate: setupConvertRate,
      };
      try { window.localStorage.setItem("pitch-deck-settings", JSON.stringify(payload)); } catch {}
      setCaseValue(payload.caseValue);
      setPricePerShow(payload.pricePerShow);
      setConvertRate(payload.convertRate);
      setStarted(true);
    };

    return (
      <div className="min-h-screen w-full px-6 py-12 flex items-start justify-center bg-black">
        <div className="max-w-md w-full">
          <h1
            className="text-3xl md:text-4xl font-extrabold text-foreground mb-10 tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Set Your Presentation Numbers
          </h1>

          <div className="space-y-5 mb-8">
            <div>
              <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
                Average Procedure Value ($)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={fmtCase}
                onChange={(e) => handleCaseChange(e.target.value)}
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
                value={fmtPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
                Estimated Conversion Rate
              </label>
              <select
                value={setupConvertRate}
                onChange={(e) => setSetupConvertRate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                {Object.entries(CONVERT_RATES).map(([label, r]) => (
                  <option key={label} value={label}>{label} ({Math.round(r * 100)}%)</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!setupValid}
            className="w-full bg-primary text-primary-foreground font-bold text-base px-6 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            START PRESENTATION →
          </button>
          {!setupValid && (setupCaseValue !== "" || setupPricePerShow !== "") && (
            <p className="text-xs text-red-400 mt-3 text-center">Procedure value must be at least $1,000 and price per show at least $100.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <button
        onClick={() => setStarted(false)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit presentation numbers"
      >
        <Home className="w-5 h-5" />
      </button>
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
