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
import postConsultCoordinator from "../assets/post-consult-coordinator.jpg";
import faqFounder from "../assets/faq-founder.jpg";
import clinicReception from "../assets/clinic-reception.jpg";
import { loadDeckSettings } from "./_dashboard.settings";

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
    <div key="cover" className="deck-slide flex flex-col items-center justify-center min-h-screen w-full px-12 md:px-20 py-12 text-center bg-black">
      <SlideHeader />
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-6xl">
        <motion.h1
          variants={fadeIn}
          className="text-[2.5rem] md:text-[5rem] lg:text-[6rem] font-extrabold leading-[1.02] tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Guarantee someone{" "}
          <span className="text-primary">arriving at your clinic</span>{" "}
          knowing the price{" "}
          <span className="text-primary">with a deposit.</span>
        </motion.h1>
      </motion.div>
    </div>,

    /* ──────── SLIDE 2 — OUR PROCESS (4 clear steps) ──────── */
    <div key="process" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      <div className="w-[70%] flex flex-col justify-center px-16 py-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
          <motion.div variants={fadeIn}>
            <ChapterLabel>HOW IT WORKS</ChapterLabel>
            <H>Our Process</H>
          </motion.div>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="grid grid-cols-1 gap-5 max-w-4xl w-full mx-auto">
          {[
            "We run proven ads and cover all ad spend.",
            "We call every lead and sell them specifically on your clinic's expertise.",
            "We finance check them and discuss how they'll fund the procedure.",
            "We take a deposit to attend the consult and book them into your calendar.",
          ].map((title, i) => (
            <div key={i} className="flex items-center gap-5 text-left bg-zinc-900/60 border border-white/10 rounded-xl px-6 py-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-extrabold text-xl">
                {i + 1}
              </div>
              <p className="text-lg md:text-xl font-bold text-foreground leading-snug">{title}</p>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img
          src={processPhoneCall}
          alt="Professional on a phone call"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
    </div>,

    /* ──────── SLIDE 3 — WHO WE SEND YOU ──────── */
    <div key="patients" className="deck-slide flex min-h-screen w-full bg-black">
      <SlideHeader />
      <div className="w-[70%] flex flex-col justify-center px-16 py-12">
        <div className="w-full text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeIn} className="mb-4">
              <H>Who We'll Be Sending You.</H>
            </motion.div>
            <motion.p variants={fadeIn} className="text-base md:text-lg text-[#CCCCCC] mb-10 max-w-3xl mx-auto leading-relaxed text-left">
              Before we ever book a consultation, we've had a real conversation with this person. We've uncovered the moment they decided enough was enough — whether it's confidence, a life event, or something they've carried for years. We share that with your clinic so when they sit down with you, you already know what matters most to them. That's what makes your consultation easier to close.
            </motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mx-auto">
            {[
              { title: "Financially Ready", desc: "They've done the research, know the price, and aren't shocked by the number.", emoji: "💰" },
              { title: "Ready To Move", desc: "Paid a deposit to attend the consult ✓", emoji: "🎯" },
              { title: "Wants Permanent Results", desc: "Not interested in medication or SMP. They want the transplant done properly.", emoji: "✅" },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl p-8 bg-card/80 border border-border"
              >
                <p className="text-4xl mb-3">{card.emoji}</p>
                <p className="text-xl font-extrabold text-foreground mb-2">{card.title}</p>
                <p className="text-[#CCCCCC] text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img
          src={patientProfile}
          alt="Confident professional"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
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
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img src={postConsultCoordinator} alt="Patient coordinator" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
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
      <div className="w-[30%] relative" style={{ willChange: "transform" }}>
        <img src={faqFounder} alt="Founder in conversation" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    </div>,

    /* ──────── SLIDE 8 — CLOSE ──────── */
    <div key="close" className="deck-slide relative flex flex-col items-center justify-center min-h-screen w-full px-16 py-12 text-center bg-black">
      <SlideHeader />
      <img src={clinicReception} alt="Modern clinic reception" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" style={{ willChange: "transform" }} />
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

  return (
    <div className="relative group" style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <Link
        to="/settings"
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card/80 border border-border text-[#CCCCCC] hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Edit presentation numbers"
      >
        <Home className="w-5 h-5" />
      </Link>
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
