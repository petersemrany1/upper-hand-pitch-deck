// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import { PatientSlide, PostConsultSlide, PackagesSlide, FaqSlide, RiskSlide } from "../components/PitchPresentationSlides";
import { CONVERSION_OPTIONS } from "../lib/clinic-roi";
import GetStartedModal from "../components/GetStartedModal";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Home, Megaphone, Phone, Wallet, CalendarCheck, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { loadDeckSettings, DEFAULT_SETTINGS } from "./_dashboard.settings";
import clinicPhoto from "../assets/pitch/clinic.jpg";

const DECK_PHOTOS = [clinicPhoto];

// Kick off image preloading the moment this module is imported (i.e. as soon
// as the user navigates to /pitch-deck and the setup screen mounts) so every
// deck photo is fully cached before any slide is reached. Runs once.
if (typeof window !== "undefined") {
  DECK_PHOTOS.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    // Trigger decode pipeline early so the bitmap is ready, not just the bytes.
    if (typeof img.decode === "function") {
      img.decode().catch(() => {});
    }
  });
}

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

const CONVERT_RATES: Record<string, number> = Object.fromEntries(
  CONVERSION_OPTIONS.map(({ label, value }) => [label, value]),
);

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
  const [roiPackSize, setRoiPackSize] = useState(10);

  // Local setup-screen inputs (string-formatted for typing)
  const [setupCaseValue, setSetupCaseValue] = useState(String(initial.caseValue));
  const [setupPricePerShow, setSetupPricePerShow] = useState(String(initial.pricePerShow));
  const [setupConvertRate, setSetupConvertRate] = useState(initial.convertRate);
  const [includeDerisk, setIncludeDerisk] = useState(initial.includeDerisk);

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


  const rate = CONVERT_RATES[convertRate] ?? 0.25;

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
    <div key="process" className="deck-slide flex flex-col min-h-screen w-full bg-black px-6 md:px-16 py-12">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-8 mt-4">
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
        <div className="relative w-full mx-auto">
          {/* Connecting line */}
          <div className="absolute top-[clamp(3.5rem,5vw,5rem)] left-[12.5%] right-[12.5%] h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 hidden md:block" />

          <div className="hidden md:grid grid-cols-4 gap-6 relative">
            {[
              { icon: Megaphone, label: "We Run The Ads", sub: "Proven creative. We cover the spend." },
              { icon: Phone, label: "We Call Every Lead", sub: "Selling them on YOUR clinic." },
              { icon: Wallet, label: "We Finance Check", sub: "Discuss how they'll fund it." },
              { icon: CalendarCheck, label: "Deposit & Booked", sub: "In your calendar, ready to attend." },
            ].map((step, i, arr) => (
              <div key={step.label} className="relative min-w-0">
                <motion.div
                  variants={fadeIn}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative z-10 size-[clamp(7rem,10vw,10rem)] rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-8 ring-black">
                    <step.icon className="size-[clamp(3rem,4.5vw,4.5rem)]" strokeWidth={2} />
                  </div>
                  <div className="mt-6 w-full">
                    <p className="text-[clamp(1.125rem,1.7vw,1.75rem)] font-bold tracking-widest text-primary uppercase mb-3">Step {i + 1}</p>
                    <p className="text-[clamp(1.375rem,2.3vw,2.5rem)] font-extrabold text-foreground leading-tight mb-4 min-h-[2.5em]">{step.label}</p>
                    <p className="text-[clamp(1.125rem,1.65vw,1.75rem)] text-[#DDD] leading-snug mx-auto">{step.sub}</p>
                  </div>
                </motion.div>
                {i < arr.length - 1 && (
                  <motion.div variants={fadeIn} className="absolute top-[clamp(3.5rem,5vw,5rem)] -right-3 translate-x-1/2 -translate-y-1/2 z-10 bg-black">
                    <ArrowRight className="w-9 h-9 text-primary" strokeWidth={2.5} />
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
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold tracking-widest text-primary uppercase">Step {i + 1}</p>
                  <p className="text-xl font-extrabold text-foreground">{step.label}</p>
                  <p className="text-base text-[#DDD]">{step.sub}</p>
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

    <PatientSlide key="patients" />,
    <PostConsultSlide key="post-consult" />,
    <PackagesSlide key="packages" caseValue={caseValue} rate={rate} convertRate={convertRate} pricePerShow={pricePerShow} />,

    includeDerisk ? <RiskSlide key="derisk" caseValue={caseValue} pricePerShow={pricePerShow} /> : null,

    /* ──────── SLIDE 6 — YOUR NUMBERS (ROI) ──────── */
    <ROICalculator key="roi" caseValue={caseValue} convertRate={convertRate} pricePerShow={pricePerShow} packSize={roiPackSize} onCaseValueChange={setCaseValue} onConvertRateChange={setConvertRate} onPricePerShowChange={setPricePerShow} onPackSizeChange={setRoiPackSize} />,

    <FaqSlide key="faq" />,

    /* ──────── SLIDE 8 — CLOSE ──────── */
    <div key="close" className="deck-slide relative flex min-h-screen w-full bg-black overflow-hidden">
      <SlideHeader />
      <img
        src={clinicPhoto}
        alt="A busy, premium Australian cosmetic clinic reception with happy staff and patients in warm natural light"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55),rgba(0,0,0,0.78))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,107,228,0.12),transparent_55%)]" />
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-16 py-12 text-center">
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
              className="inline-block bg-primary text-primary-foreground font-bold text-2xl px-12 py-5 rounded-lg tracking-wide hover:opacity-90 transition-opacity cursor-pointer"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              GET STARTED →
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>,
  ].filter(Boolean);

  const TOTAL_SLIDES = slides.length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started || (e.target instanceof HTMLElement && e.target.closest("input, select, textarea, [contenteditable=true], [role=dialog]"))) return;
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
  }, [TOTAL_SLIDES, started]);

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
        includeDerisk,
      };
      try { window.localStorage.setItem("pitch-deck-settings", JSON.stringify(payload)); } catch {}
      setCaseValue(payload.caseValue);
      setPricePerShow(payload.pricePerShow);
      setConvertRate(payload.convertRate);
      setStarted(true);
    };

    return (
      <div className="relative min-h-screen w-full px-6 py-12 flex items-start justify-center bg-black">
        <Link
          to="/"
          aria-label="Back to dashboard"
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
        </Link>
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

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Include "Risk Sits With Us" slide</p>
                <p className="text-xs text-[#999] mt-0.5">Adds the de-risk / safety-net slide to the deck.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeDerisk}
                onClick={() => setIncludeDerisk((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${includeDerisk ? "bg-primary" : "bg-white/15"}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${includeDerisk ? "translate-x-5" : "translate-x-0.5"}`}
                />
              </button>
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
        onClick={() => {
          setSetupCaseValue(String(caseValue));
          setSetupPricePerShow(String(pricePerShow));
          setSetupConvertRate(convertRate);
          setStarted(false);
        }}
        className="fixed bottom-4 left-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
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

      <GetStartedModal open={showGetStarted} onClose={() => setShowGetStarted(false)} pricePerShow={pricePerShow} />

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
