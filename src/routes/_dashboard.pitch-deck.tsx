import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import GetStartedModal from "../components/GetStartedModal";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

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
const COST_PER_SHOW = 1100;

/* Pre-deck settings popup */
function SettingsPopup({ onEnter }: { onEnter: (caseValue: number, convertRate: string) => void }) {
  const [caseValue, setCaseValue] = useState("12000");
  const [convertRate, setConvertRate] = useState("1 in 4");

  const handleCaseValueChange = (val: string) => {
    setCaseValue(val.replace(/[^0-9]/g, ""));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h2
          className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set Your Presentation Numbers
        </h2>
        <p className="text-[#CCCCCC] text-sm mb-10">
          These values personalise the ROI, packages, and guarantee slides.
        </p>

        <div className="space-y-6 mb-10">
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Average Case Value ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={caseValue}
              onChange={(e) => handleCaseValueChange(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-[#CCCCCC] block mb-2 font-medium tracking-wide uppercase">
              Conversion Rate
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
          onClick={() => onEnter(parseInt(caseValue, 10) || 12000, convertRate)}
          className="w-full bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          START PRESENTATION →
        </button>
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);

  const handleEnter = (cv: number, cr: string) => {
    setCaseValue(cv);
    setConvertRate(cr);
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

  const rate = CONVERT_RATES[convertRate] ?? 0.25;

  const packs = useMemo(() => [
    { name: "Demo", shows: 10, highlight: false },
    { name: "Starter", shows: 20, highlight: false },
    { name: "Scale", shows: 50, highlight: false },
  ], []);

  const faqItems = [
    { q: "What if a patient doesn't show?", a: "You don't pay. Simple as that. We credit or refund immediately." },
    { q: "What if you can't get me leads in time?", a: "That hasn't happened in this industry. But if it did, we'd refund your investment in full." },
    { q: "What dental implant clients have you worked with?", a: "We've worked with clinics all over Australia. Confidentiality agreements prevent us from naming them — the same protection applies to you." },
    { q: "Can I see ad examples?", a: "Yes. Shared once you're onboard. Everything approved by you before it goes live." },
    { q: "Where is your team?", a: "Sydney, Australia." },
    { q: "Whose Meta account do you use?", a: "Ours. You give us page access. We carry the risk." },
  ];

  if (showPopup) {
    return <SettingsPopup onEnter={handleEnter} />;
  }

  /* Photo overlay helper — responsive to fullscreen */
  const PhotoSide = ({ src, alt }: { src: string; alt: string }) => (
    <div className={`absolute right-0 top-0 h-full hidden md:block ${isFullscreen ? "w-[25%]" : "w-[35%]"}`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
    </div>
  );

  const slides = [
    /* ──────── SLIDE 1 — COVER ──────── */
    <div key="cover" className="deck-slide flex flex-col items-center justify-center text-center px-6">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
        <motion.h1
          variants={fadeIn}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          HAIR TRANSPLANT
          <br />
          <span className="text-primary">MARKETING</span>
          <br />
          THAT WORKS
        </motion.h1>
        <motion.p variants={fadeIn} className={`${subClass} mt-8 max-w-md mx-auto`}>
          A done-for-you patient acquisition system.
        </motion.p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 2 — THE OPPORTUNITY ──────── */
    <div key="opportunity" className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="w-full max-w-4xl">
        <motion.div variants={fadeIn}>
          <ChapterLabel>THE OPPORTUNITY</ChapterLabel>
        </motion.div>
        <motion.div variants={fadeIn} className="mb-16">
          <H>You're Spending Money On People Who Were Never Going To Buy.</H>
        </motion.div>
        <motion.div variants={fadeIn} className="w-full">
          {[
            { title: "Your surgeon's chair costs $15,000 a day to leave empty.", sub: "Every no-show and wrong patient is money gone." },
            { title: "Leads go cold in 5 minutes.", sub: "If you're not calling first, someone else is." },
            { title: "Price shoppers and tyre kickers are killing your conversion.", sub: "Wrong people waste your best resource — surgeon time." },
            { title: "Patients who don't book on the day never come back.", sub: "There's no system bringing them back. Until now." },
          ].map((item, i, arr) => (
            <div key={item.title}>
              <div className="py-8">
                <p className="text-xl md:text-2xl lg:text-3xl font-extrabold text-foreground leading-snug">{item.title}</p>
                <p className="text-[#CCCCCC] text-sm md:text-base mt-3">{item.sub}</p>
              </div>
              {i < arr.length - 1 && <div className="border-t border-border" />}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 3 — OUR PROCESS ──────── */
    <div key="process" className="deck-slide flex flex-col justify-between px-8 md:px-16 lg:px-24 py-16">
      <div>
        <SlideHeader />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
          <motion.div variants={fadeIn}>
            <ChapterLabel>OUR PROCESS</ChapterLabel>
          </motion.div>
          <motion.div variants={fadeIn} className="mb-14">
            <H>Here's How We Work.</H>
          </motion.div>
          <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl">
            {[
              { step: 1, title: "We Run The Ads", desc: "Targeted creative built around your ideal patient. AHPRA compliant. Nothing goes live without your approval." },
              { step: 2, title: "We Call Every Lead Within 5 Minutes", desc: "Every inquiry qualified on the phone. Budget, motivation, and transplant intent confirmed before anyone touches your calendar." },
              { step: 3, title: "We Book Confirmed Appointments", desc: "Only vetted, ready-to-buy patients land in your diary. No tyre kickers. No price shoppers." },
              { step: 4, title: "We Follow Up After The Consult", desc: "Didn't book on the day? We bring them back. Structured follow-up without burning the relationship." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-lg">
                  {item.step}
                </div>
                <div>
                  <p className="text-base md:text-lg font-bold text-foreground mb-1.5">{item.title}</p>
                  <p className="text-[#CCCCCC] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
      {/* Pay Per Show — centered, full width bottom section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="w-full text-center mt-auto pt-12"
      >
        <p
          className={`font-extrabold text-foreground leading-snug ${isFullscreen ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl"}`}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pay Per Show. Not Per Click.
        </p>
        <p className="text-[#CCCCCC] text-sm md:text-base mt-4">
          You only pay when a qualified patient is sitting in your chair.
        </p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 4 — WHO WE SEND YOU ──────── */
    <div key="patients" className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <PhotoSide src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80" alt="Confident man" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className={`relative z-10 ${isFullscreen ? "max-w-[70%]" : "max-w-4xl"}`}>
        <motion.div variants={fadeIn} className="mb-12">
          <H>Who We'll Be Sending You.</H>
          <p className={`${subClass} mt-4 max-w-xl`}>
            Patients who know it costs between $10,000–$20,000 and want the surgery. Not a consultation about maybe.
          </p>
        </motion.div>
        <motion.div variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { title: "Financially Ready", desc: "They've done the research. They know the price. They're not shocked by the number.", emoji: "💰", highlight: true },
            { title: "Pain Driven", desc: "They've been sitting on this for years. They're ready to stop waiting.", emoji: "🎯", highlight: false },
            { title: "Wants Permanent Results", desc: "Not interested in medications or SMP. They want the transplant done right.", emoji: "✅", highlight: false },
            { title: "Not Going To Turkey", desc: "Pre-qualified against overseas. They want local, accountable, quality care.", emoji: "🇦🇺", highlight: false },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-xl p-8 ${
                card.highlight
                  ? "bg-primary/10 border border-primary"
                  : "bg-card border border-border"
              }`}
            >
              <p className="text-3xl mb-3">{card.emoji}</p>
              <p className="text-xl font-extrabold text-foreground mb-2">{card.title}</p>
              <p className="text-[#CCCCCC] text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </motion.div>
        <motion.p variants={fadeIn} className="text-xs text-[#999] mt-10 max-w-xl">
          Other inquiries like SMP or medication consultations? We send those through as a bonus at no charge.
        </motion.p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 5 — POST CONSULT ──────── */
    <div key="post-consult" className="deck-slide relative flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <PhotoSide src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80" alt="Professional conversation" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className={`relative z-10 ${isFullscreen ? "max-w-[70%]" : "max-w-4xl"}`}>
        <motion.div variants={fadeIn}>
          <ChapterLabel>POST CONSULT</ChapterLabel>
        </motion.div>
        <motion.div variants={fadeIn} className="mb-12">
          <H>Not Booked On The Day? We're Not Done.</H>
        </motion.div>
        <motion.div variants={fadeIn} className="space-y-10 max-w-xl">
          <div>
            <p className="text-lg font-bold text-foreground mb-1.5">We Bring Them Back</p>
            <p className="text-[#CCCCCC] text-sm leading-relaxed">Undecided patients get a structured follow-up sequence. Not aggressive. Just consistent.</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground mb-1.5">Objection Handling</p>
            <p className="text-[#CCCCCC] text-sm leading-relaxed">We know the objections before they say them. Price, timing, Turkey. All handled.</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground mb-1.5">We Protect Your Reputation</p>
            <p className="text-[#CCCCCC] text-sm leading-relaxed">We don't push patients to the point of frustration. No one leaves angry and no one leaves a review before they've given you a fair shot.</p>
          </div>
        </motion.div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 6 — ROI CALCULATOR ──────── */
    <ROICalculator key="roi" caseValue={caseValue} convertRate={convertRate} />,

    /* ──────── SLIDE 7 — PACKAGES ──────── */
    <div key="packages" className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl w-full">
        <motion.div variants={fadeIn}>
          <ChapterLabel>PACKAGES</ChapterLabel>
        </motion.div>
        <motion.div variants={fadeIn} className="mb-12">
          <H>Choose How Many Patients You Want.</H>
        </motion.div>
        <motion.div variants={fadeIn} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packs.map((pack) => {
            const procedures = pack.shows * rate;
            const revenue = procedures * caseValue;
            const cost = pack.shows * COST_PER_SHOW;
            return (
              <div
                key={pack.name}
                className="rounded-xl border border-border bg-card p-8"
              >
                <h3 className="text-2xl font-extrabold text-foreground mb-2">{pack.name}</h3>
                <p className="text-[#CCCCCC] text-sm mb-1">{pack.shows} qualified patients</p>
                <p className="text-[#CCCCCC] text-sm mb-6">${COST_PER_SHOW.toLocaleString()} per patient inc GST</p>
                <div className="border-t border-border pt-5 space-y-4">
                  <div>
                    <p className="text-xs text-[#CCCCCC] mb-1">Est. Revenue</p>
                    <p className="text-3xl font-extrabold text-primary">{fmt(revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#CCCCCC] mb-1">Your Investment</p>
                    <p className="text-lg font-bold text-foreground">{fmt(cost)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 8 — THE GUARANTEE ──────── */
    <div key="guarantee" className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl">
        <motion.div variants={fadeIn}>
          <ChapterLabel>THE GUARANTEE</ChapterLabel>
        </motion.div>
        <motion.div variants={fadeIn} className="mb-16">
          <H>If We Don't Deliver, You Don't Lose.</H>
        </motion.div>
        <motion.div variants={fadeIn} className="space-y-12 mb-12">
          {[
            "No show = no charge. Ever.",
            "Don't get 2 procedures from your first 10 shows? We give you 5 more free.",
            "No lock in. Cancel any time.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-5">
              <span className={`text-primary font-bold flex-shrink-0 ${isFullscreen ? "text-4xl" : "text-2xl"}`}>✓</span>
              <p className={`font-extrabold text-foreground leading-snug ${isFullscreen ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"}`}>{item}</p>
            </div>
          ))}
        </motion.div>
        <motion.p variants={fadeIn} className="text-sm text-[#AAAAAA]">
          At {fmt(caseValue)} per procedure, 2 conversions covers your full investment.
        </motion.p>
      </motion.div>
    </div>,

    /* ──────── SLIDE 9 — FAQ ──────── */
    <div key="faq" className="deck-slide flex flex-col justify-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-3xl">
        <motion.div variants={fadeIn}>
          <ChapterLabel>FAQ</ChapterLabel>
        </motion.div>
        <motion.div variants={fadeIn} className="mb-10">
          <H>Questions I Get Asked.</H>
        </motion.div>
        <motion.div variants={fadeIn} className="divide-y divide-border">
          {faqItems.map((item, i) => (
            <div key={i} className="py-5">
              <p className="text-base font-semibold text-foreground">{item.q}</p>
              <p className="text-sm text-[#CCCCCC] mt-1.5">{item.a}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>,

    /* ──────── SLIDE 10 — CLOSE ──────── */
    <div key="close" className="deck-slide relative flex flex-col items-center justify-center text-center px-8 md:px-16 lg:px-24 py-16">
      <SlideHeader />
      <PhotoSide src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80" alt="Sydney aerial view" />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="relative z-10">
        <motion.div variants={fadeIn}>
          <H>Let Us Fill Your Calendar.</H>
        </motion.div>
        <motion.p variants={fadeIn} className={`${subClass} mt-4 mb-10`}>
          One clinic per city. Spots are limited.
        </motion.p>
        <motion.div variants={fadeIn}>
          <button
            onClick={() => setShowGetStarted(true)}
            className="inline-block bg-primary text-primary-foreground font-bold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity cursor-pointer"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            GET STARTED →
          </button>
        </motion.div>
      </motion.div>
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

      {/* Single slide display — no scroll */}
      <div ref={containerRef} className="w-full h-full">
        {slides[activeSlide]}
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
