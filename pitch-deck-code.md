# Pitch Deck — Full Source Code


## src/routes/_dashboard.pitch-deck.tsx

```tsx
// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import SlideHeader from "../components/SlideHeader";
import ROICalculator from "../components/ROICalculator";
import GetStartedModal from "../components/GetStartedModal";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize, Minimize, Home, Megaphone, Phone, Wallet, CalendarCheck, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { loadDeckSettings, DEFAULT_SETTINGS } from "./_dashboard.settings";
import patientPhoto from "../assets/pitch/patient.jpg";
import teamPhoto from "../assets/pitch/team.jpg";
import hairPhoto from "../assets/pitch/hair.jpg";
import clinicPhoto from "../assets/pitch/clinic.jpg";

const DECK_PHOTOS = [patientPhoto, teamPhoto, hairPhoto, clinicPhoto];

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
          alt="A relaxed Australian man in his 40s smiling warmly at an outdoor cafe in golden afternoon light"
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
          Didn't Book On The Day Of Consult?
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
          alt="A young Australian man at a modern desk wearing a headset, smiling on a call in a small bright office"
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
                    <p className="text-[11px] text-[#888] mt-0.5">+ GST</p>
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

    /* ──────── SLIDE 5.5 — DE-RISK (optional) ──────── */
    includeDerisk ? (
    <div key="derisk" className="deck-slide flex flex-col min-h-screen w-full bg-black px-16 py-12">
      <SlideHeader />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="flex-1 flex flex-col justify-center w-full max-w-6xl mx-auto"
      >
        <motion.div variants={fadeIn} className="text-center mb-4">
          <ChapterLabel>THE RISK SITS WITH US</ChapterLabel>
        </motion.div>
        <motion.h2
          variants={fadeIn}
          className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tight text-center mb-14"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Let's de-risk it.
        </motion.h2>

        <motion.div
          variants={fadeIn}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-3 mb-12"
        >
          <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-8 py-7 text-center">
            <p className="text-2xl font-bold text-foreground">10 patients</p>
            <p className="text-[#CCCCCC] mt-1">$8,000</p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-7 h-7 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-8 py-7 text-center">
            <p className="text-2xl font-bold text-foreground">Convert just 1</p>
            <p className="text-[#CCCCCC] mt-1">${caseValue.toLocaleString()}</p>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-7 h-7 text-primary" strokeWidth={2.5} />
          </div>
          <div className="flex-1 rounded-xl bg-white/5 border border-white/10 px-8 py-7 text-center">
            <p className="text-2xl font-bold text-primary">2× your money</p>
            <p className="text-[#CCCCCC] mt-1">already in front</p>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          className="rounded-xl border-2 border-primary bg-primary/10 px-10 py-8 mb-8"
        >
          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-primary mb-3">The Safety Net</p>
          <p className="text-2xl font-bold text-foreground mb-3">Convert 0 of 10? We send 5 more — free.</p>
          <p className="text-[#CCCCCC] text-lg">
            That's 15 deposit-paid, pre-sold patients for the same $8,000. You need just <span className="text-foreground font-bold">one</span> to land to be in front.
          </p>
        </motion.div>


        <motion.div variants={fadeIn} className="border-t border-white/10 pt-5 flex items-center justify-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <p className="text-sm text-[#999]">One-time offer - available on your first pack only.</p>
        </motion.div>
      </motion.div>
    </div>
    ) : null,



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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(198,255,0,0.12),transparent_55%)]" />
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
              className="inline-block bg-primary text-primary-foreground font-bold text-lg px-12 py-5 rounded-lg tracking-wide hover:opacity-90 transition-opacity cursor-pointer"
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
        onClick={() => setStarted(false)}
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
```


## src/components/SlideHeader.tsx

```tsx
// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import boldLogo from "@/assets/bold-logo.png";

export default function SlideHeader() {
  return (
    <div
      className="absolute top-5 left-16 md:left-6 z-50 flex items-center gap-2"
    >
      <img
        src={boldLogo}
        alt="bold"
        style={{ height: 30, width: 30, borderRadius: "9999px", display: "block" }}
      />
    </div>
  );
}
```


## src/components/ROICalculator.tsx

```tsx
// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import { useMemo } from "react";
import SlideHeader from "./SlideHeader";

const ALL_CONVERT_RATES: Record<string, number> = {
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

const RATE_ORDER = ["1 in 10","1 in 9","1 in 8","1 in 7","1 in 6","1 in 5","1 in 4","1 in 3","1 in 2","3 in 4","1 in 1"];

function getConvertLabel(label: string): string {
  return label + " Conversion";
}

interface Props {
  caseValue: number;
  convertRate: string;
  pricePerShow: number;
  onCaseValueChange: (value: number) => void;
  onConvertRateChange: (value: string) => void;
  onPricePerShowChange: (value: number) => void;
}

export default function ROICalculator({ caseValue, convertRate, pricePerShow, onCaseValueChange, onConvertRateChange, onPricePerShowChange }: Props) {
  const shows = 20;
  const fmt = (n: number) => "$" + (Math.round(n / 1000) * 1000).toLocaleString();

  // Always show three rates centered on the selected one — clamp at the edges so
  // the selected rate visibly sits in the matching column.
  const { columns, selectedColIdx } = useMemo(() => {
    const idx = RATE_ORDER.indexOf(convertRate);
    const safe = idx === -1 ? 6 : idx;
    let start = safe - 1;
    if (start < 0) start = 0;
    if (start > RATE_ORDER.length - 3) start = RATE_ORDER.length - 3;
    const labels = [RATE_ORDER[start], RATE_ORDER[start + 1], RATE_ORDER[start + 2]];
    const cols = labels.map((label) => {
      const r = ALL_CONVERT_RATES[label] ?? 0.25;
      const procedures = shows * r;
      const revenue = procedures * caseValue;
      return { label, revenue };
    });
    return { columns: cols, selectedColIdx: labels.indexOf(convertRate) };
  }, [caseValue, convertRate]);

  // Inputs intentionally removed from the deck — values are driven from /settings.
  void onCaseValueChange;
  void onPricePerShowChange;

  return (
    <div className="deck-slide flex flex-col items-center justify-center min-h-screen w-full px-16 py-12">
      <SlideHeader />
      <div className="w-full max-w-5xl text-center">
        <p className="text-primary text-lg md:text-xl font-bold tracking-[0.25em] uppercase mb-5">
          YOUR NUMBERS
        </p>
        <h2
          className="text-4xl md:text-[4rem] font-extrabold text-foreground mb-10 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          What This Looks Like For Your Clinic.
        </h2>

        {/* 3 conversion columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {columns.map((col, i) => {
            const isSelected = i === selectedColIdx;
            const investment = shows * pricePerShow;
            return (
              <button
                key={col.label}
                type="button"
                onClick={() => onConvertRateChange(col.label)}
                className={`rounded-xl border p-10 text-center transition-all ${
                  isSelected
                    ? "bg-primary/15 border-primary ring-2 ring-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <p className="text-sm text-[#CCCCCC] mb-3 font-medium uppercase tracking-wide">
                  {getConvertLabel(col.label)}
                </p>
                <p className={`font-extrabold leading-none ${isSelected ? "text-primary" : "text-foreground"}`} style={{ fontSize: 'clamp(1.75rem, 4.2vw, 3.5rem)', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {fmt(col.revenue)}
                </p>
                <p className="text-sm text-[#CCCCCC] mt-3">Monthly Revenue</p>
                <div className="mt-5 pt-4 border-t border-border/60">
                  <p className="text-[10px] text-[#888] uppercase tracking-wider mb-1">Your Investment</p>
                  <p className="text-base font-bold text-foreground">${investment.toLocaleString()}</p>
                  <p className="text-[11px] text-[#888] mt-0.5">+ GST</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Included list */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#CCCCCC]">
          {["20 Showed Appointments", "Ad Creative", "Lead Handling", "After Consult Follow-Up"].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span className="text-primary">✓</span> {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```


## src/components/FeatureCard.tsx

```tsx
// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
interface FeatureCardProps {
  title: string;
  description: string;
  variant?: "blue" | "dark";
}

export default function FeatureCard({ title, description, variant = "dark" }: FeatureCardProps) {
  const isBlue = variant === "blue";
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        isBlue
          ? "bg-primary border-primary"
          : "bg-card border-border"
      }`}
    >
      <h3 className="text-sm font-bold text-foreground leading-snug">{title}</h3>
      <p className="text-xs text-[#CCCCCC] mt-1 leading-relaxed">{description}</p>
    </div>
  );
}
```


## src/components/GetStartedModal.tsx

```tsx
// PROTECTED — DO NOT MODIFY THIS FILE UNDER ANY CIRCUMSTANCES
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, FileText, ArrowLeft } from "lucide-react";

import { useServerFn } from "@tanstack/react-start";
import { sendPaymentLinkSMS } from "../utils/twilio.functions";
import { sendInvoiceEmail, sendContractEmail } from "../utils/resend.functions";
import { createStripeCheckoutSession } from "../utils/stripe.functions";
import { recordSentLink, updateSentLinkMethod } from "../utils/sent-links.functions";

interface GetStartedModalProps {
  open: boolean;
  onClose: () => void;
  pricePerShow?: number;
}

const STANDARD_PRICE_PER_SHOW = 800;

// Stripe payment links are generated dynamically per send via
// Stripe Checkout Sessions — see src/utils/stripe.functions.ts.

const PACK_DEFS = [
  { id: "demo", name: "Demo", shows: 10 },
  { id: "starter", name: "Starter", shows: 20 },
  { id: "scale", name: "Scale", shows: 50 },
];

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

export default function GetStartedModal({ open, onClose, pricePerShow = STANDARD_PRICE_PER_SHOW }: GetStartedModalProps) {
  // step: 1=details, 2=package, 3=hub, 4=payment send-channel sub-screen
  const [step, setStep] = useState(1);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [customShowsInput, setCustomShowsInput] = useState("");
  const [customFeeInput, setCustomFeeInput] = useState("");

  // Completion tracking
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"email" | "sms" | null>(null);
  const [paymentSentLinkId, setPaymentSentLinkId] = useState<string | null>(null);
  const [lastStripeUrl, setLastStripeUrl] = useState<string | null>(null);
  const [contractSent, setContractSent] = useState(false);
  const [contractMethod, setContractMethod] = useState<"email" | null>(null);

  const [sending, setSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [contractStatus, setContractStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [crossSendStatus, setCrossSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const phoneClean = phone.replace(/\s/g, '');
  const phoneValid = /^(\+?61|0)4[0-9]{8}$/.test(phoneClean);
  const step1Valid = fullName.trim() && clinicName.trim() && clinicAddress.trim() && email.trim() && phoneValid;

  // Pack totals are exc GST. inc GST = exc * 1.1.
  const PACKS = PACK_DEFS.map((p) => ({
    ...p,
    totalExc: p.shows * pricePerShow,
  }));

  const chosenPack = PACKS.find((p) => p.id === selectedPack);

  // Custom: user enters number of shows + per-show fee separately.
  const customShows = (() => {
    const n = parseInt(customShowsInput.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const customFee = (() => {
    const n = parseInt(customFeeInput.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const customExc = customShows * customFee;

  const isCustom = selectedPack === "custom";
  const step2Valid = selectedPack !== null && (selectedPack !== "custom" || (customShows > 0 && customFee > 0));
  const summaryShows = isCustom ? customShows : chosenPack?.shows ?? 0;
  const summaryPackName = isCustom ? "Custom" : chosenPack?.name ?? "";
  const summaryPerShow = isCustom ? customFee : pricePerShow;
  const totalExcGst = isCustom ? customExc : chosenPack?.totalExc ?? 0;
  const gst = Math.round(totalExcGst * 0.10);
  const totalIncGst = totalExcGst + gst;

  const sendInvoiceEmailFn = useServerFn(sendInvoiceEmail);
  const sendContractEmailFn = useServerFn(sendContractEmail);
  const createCheckoutFn = useServerFn(createStripeCheckoutSession);
  const sendSMSFn = useServerFn(sendPaymentLinkSMS);
  const recordSentLinkFn = useServerFn(recordSentLink);
  const updateSentLinkMethodFn = useServerFn(updateSentLinkMethod);

  // Creates a fresh Stripe Checkout Session for the selected pack (inc GST).
  const buildCheckoutUrl = async (
    setStatus: (s: { type: "success" | "error"; message: string } | null) => void
  ): Promise<string | null> => {
    // Reuse the URL from this modal session so cross-send (after sending one channel)
    // gives the recipient the exact same Stripe link.
    if (lastStripeUrl) return lastStripeUrl;
    if (!totalIncGst || totalIncGst < 1) {
      setStatus({ type: "error", message: "Please select a pack with a valid amount before sending." });
      return null;
    }
    try {
      const result = await createCheckoutFn({
        data: {
          clinicName,
          contactName: fullName,
          email,
          packageName: summaryPackName,
          totalIncGst,
        },
      });
      if (!result.success) {
        setStatus({ type: "error", message: result.error || "Could not generate payment link — please try again." });
        return null;
      }
      setLastStripeUrl(result.url);
      return result.url;
    } catch {
      setStatus({ type: "error", message: "Could not generate payment link — please try again." });
      return null;
    }
  };

  const recordPaymentSend = async (method: "email" | "sms", checkoutUrl: string) => {
    try {
      const result = await recordSentLinkFn({
        data: {
          kind: "payment_link",
          clinicName,
          contactName: fullName,
          email: email || null,
          phone: phone || null,
          packageName: summaryPackName,
          shows: summaryShows,
          perShowFee: summaryPerShow,
          totalExcGst,
          gst,
          totalIncGst,
          stripeUrl: checkoutUrl,
          sendMethod: method,
        },
      });
      if (result.success) setPaymentSentLinkId(result.id);
    } catch {
      // Non-fatal: history record failed but the send itself succeeded.
    }
  };

  const recordContractSend = async () => {
    try {
      await recordSentLinkFn({
        data: {
          kind: "contract",
          clinicName,
          contactName: fullName,
          email: email || null,
          phone: phone || null,
          packageName: summaryPackName,
          shows: summaryShows,
          perShowFee: summaryPerShow,
          totalExcGst,
          gst,
          totalIncGst,
          stripeUrl: null,
          sendMethod: "email",
        },
      });
    } catch {}
  };

  const handleRequestInvoice = async () => {
    setInvoiceStatus(null);
    setSending(true);
    try {
      const checkoutUrl = await buildCheckoutUrl(setInvoiceStatus);
      if (!checkoutUrl) {
        setSending(false);
        return;
      }
      const result = await sendInvoiceEmailFn({
        data: {
          to: email,
          clinicName,
          contactName: fullName,
          phone,
          packageName: summaryPackName,
          amount: fmt(totalIncGst),
          stripeLink: checkoutUrl,
        },
      });
      if (result.success) {
        await recordPaymentSend("email", checkoutUrl);
        setPaymentSent(true);
        setPaymentMethod("email");
        setCrossSendStatus(null);
        setStep(3);
      } else {
        setInvoiceStatus({ type: "error", message: result.error || "Something went wrong — please try again." });
      }
    } catch {
      setInvoiceStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const handleSendSMS = async () => {
    setSmsStatus(null);
    setSending(true);
    try {
      const checkoutUrl = await buildCheckoutUrl(setSmsStatus);
      if (!checkoutUrl) {
        setSending(false);
        return;
      }
      const firstName = fullName.trim().split(" ")[0];
      const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: checkoutUrl } });
      if (result.success) {
        await recordPaymentSend("sms", checkoutUrl);
        setPaymentSent(true);
        setPaymentMethod("sms");
        setCrossSendStatus(null);
        setStep(3);
      } else {
        setSmsStatus({ type: "error", message: result.error || "Something went wrong — please try again." });
      }
    } catch {
      setSmsStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  // Send contract directly using carried-through values from steps 1 & 2.
  const handleSendContract = async () => {
    if (!summaryShows || summaryShows < 1) {
      setContractStatus({ type: "error", message: "Please select a pack with at least one show before sending the contract." });
      return;
    }
    setSending(true);
    setContractStatus(null);
    const packLabel = isCustom
      ? "Custom (" + summaryShows + " Shows)"
      : summaryPackName + " — " + summaryShows + " Shows";
    try {
      const result = await sendContractEmailFn({
        data: {
          to: email,
          clinicName,
          clinicAddress,
          contactName: fullName,
          phone,
          packageName: packLabel,
          shows: summaryShows,
          perShowFee: pricePerShow,
          totalFee: totalExcGst,
        },
      });
      if (result.success) {
        await recordContractSend();
        setContractStatus({ type: "success", message: "We've sent the agreement to " + email + "." });
        setContractSent(true);
        setContractMethod("email");
      } else {
        setContractStatus({ type: "error", message: "Something went wrong — please try again or contact admin@bold-patients.com" });
      }
    } catch {
      setContractStatus({ type: "error", message: "Something went wrong — please try again or contact admin@bold-patients.com" });
    }
    setSending(false);
  };

  // After payment link sent via one channel, allow sending via the other channel
  // (re-using the same Stripe URL so the recipient gets the same checkout).
  const handleCrossSendPayment = async () => {
    if (!paymentMethod || !lastStripeUrl) return;
    setCrossSendStatus(null);
    setSending(true);
    const otherMethod: "email" | "sms" = paymentMethod === "email" ? "sms" : "email";
    try {
      if (otherMethod === "sms") {
        const firstName = fullName.trim().split(" ")[0];
        const result = await sendSMSFn({ data: { to: phone, firstName, stripeLink: lastStripeUrl } });
        if (!result.success) {
          setCrossSendStatus({ type: "error", message: result.error || "Could not send SMS — please try again." });
          setSending(false);
          return;
        }
      } else {
        const result = await sendInvoiceEmailFn({
          data: {
            to: email,
            clinicName,
            contactName: fullName,
            phone,
            packageName: summaryPackName,
            amount: fmt(totalIncGst),
            stripeLink: lastStripeUrl,
          },
        });
        if (!result.success) {
          setCrossSendStatus({ type: "error", message: result.error || "Could not send email — please try again." });
          setSending(false);
          return;
        }
      }
      if (paymentSentLinkId) {
        await updateSentLinkMethodFn({ data: { id: paymentSentLinkId, method: "both" } });
      }
      setPaymentMethod(otherMethod === "sms" ? "sms" : "email");
      setCrossSendStatus({
        type: "success",
        message: "Also sent via " + (otherMethod === "sms" ? "SMS to " + phone : "email to " + email) + ".",
      });
    } catch {
      setCrossSendStatus({ type: "error", message: "Something went wrong — please try again." });
    }
    setSending(false);
  };

  const resetAndClose = () => {
    setStep(1);
    setFullName("");
    setClinicName("");
    setClinicAddress("");
    setEmail("");
    setPhone("");
    setSelectedPack(null);
    setCustomShowsInput("");
    setCustomFeeInput("");
    setContractStatus(null);
    setSmsStatus(null);
    setInvoiceStatus(null);
    setCrossSendStatus(null);
    setPaymentSent(false);
    setPaymentMethod(null);
    setPaymentSentLinkId(null);
    setLastStripeUrl(null);
    setContractSent(false);
    setContractMethod(null);
    setShowExitConfirm(false);
    onClose();
  };

  const handleAttemptClose = () => {
    setShowExitConfirm(true);
  };

  if (!open) return null;

  // Step 4 is a sub-screen of step 3.
  const currentStepDisplay = step >= 3 ? 3 : step;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleAttemptClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          <button
            onClick={handleAttemptClose}
            className="absolute top-4 right-4 text-[#999] hover:text-foreground transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step indicator */}
          <div className="px-8 pt-8 pb-2">
            <p className="text-xs text-[#999] font-medium tracking-wider uppercase">
              Step {currentStepDisplay} of 3
            </p>
            <div className="flex gap-1.5 mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={"h-1 flex-1 rounded-full transition-colors " +
                    (s <= currentStepDisplay ? "bg-primary" : "bg-border")
                  }
                />
              ))}
            </div>
          </div>

          <div className="px-8 py-6">
            {/* ─── STEP 1 ─── */}
            {step === 1 && (
              <div>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Your Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Clinic Name</label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Sydney Hair Clinic"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Clinic Address</label>
                    <input
                      type="text"
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Full address including suburb and state"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="john@clinic.com.au"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="04XX XXX XXX"
                    />
                    {phone.trim() && !phoneValid && (
                      <p className="text-xs text-red-400 mt-1">Please enter a valid Australian mobile number</p>
                    )}
                  </div>
                </div>
                <button
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* ─── STEP 2 ─── */}
            {step === 2 && (
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-6"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Which pack are you starting with?
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => setSelectedPack(pack.id)}
                      className={"rounded-xl border-2 p-4 text-left transition-all " +
                        (selectedPack === pack.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-[#555]")
                      }
                    >
                      <p className="text-sm font-extrabold text-foreground">{pack.name}</p>
                      <p className="text-xs text-[#CCCCCC] mt-1">{pack.shows} patients</p>
                      <p className="text-sm font-bold text-primary mt-2">{fmt(pack.totalExc)}</p>
                      <p className="text-[10px] text-[#999]">exc GST</p>
                      <p className="text-[10px] text-[#999]">{fmt(Math.round(pack.totalExc * 1.1))} inc GST</p>
                    </button>
                  ))}
                </div>

                {/* Custom option */}
                <button
                  onClick={() => setSelectedPack("custom")}
                  className={"w-full rounded-xl border-2 p-4 text-left transition-all mb-3 " +
                    (selectedPack === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-[#555]")
                  }
                >
                  <p className="text-sm font-extrabold text-foreground">Custom Amount</p>
                </button>

                {selectedPack === "custom" && (
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">
                        Number of shows
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customShowsInput}
                        onChange={(e) => setCustomShowsInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 30"
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#CCCCCC] block mb-1.5 font-medium">
                        Per show fee (exc GST)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customFeeInput}
                        onChange={(e) => setCustomFeeInput(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="e.g. 800"
                        className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {customExc > 0 && (
                      <p className="col-span-2 text-[11px] text-[#999] -mt-1">
                        {customShows} shows × {fmt(customFee)} = {fmt(customExc)} exc · {fmt(Math.round(customExc * 1.1))} inc GST
                      </p>
                    )}
                  </div>
                )}

                <button
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className="w-full mt-3 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* ─── STEP 3 — ACTION HUB / SUMMARY ─── */}
            {step === 3 && (
              <div>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Summary
                </h3>
                <p className="text-sm text-[#999] mb-5">Review the details then send the agreement and payment link.</p>

                {/* Summary card */}
                <div className="rounded-xl border border-border bg-input/40 p-4 mb-5 text-sm">
                  <div className="grid grid-cols-[110px_1fr] gap-y-1.5 gap-x-3">
                    <span className="text-[#999]">Clinic</span>
                    <span className="text-foreground font-medium">{clinicName}</span>

                    <span className="text-[#999]">Contact</span>
                    <span className="text-foreground font-medium">{fullName}</span>

                    <span className="text-[#999]">Package</span>
                    <span className="text-foreground font-medium">
                      {summaryPackName} — {summaryShows} shows
                    </span>

                    <span className="text-[#999]">Per show</span>
                    <span className="text-foreground font-medium">{fmt(summaryPerShow)} + GST</span>
                  </div>

                  <div className="border-t border-border mt-3 pt-3 grid grid-cols-[110px_1fr] gap-y-1 gap-x-3">
                    <span className="text-[#999]">Total exc GST</span>
                    <span className="text-foreground font-medium">{fmt(totalExcGst)}</span>

                    <span className="text-[#999]">GST</span>
                    <span className="text-foreground font-medium">{fmt(gst)}</span>

                    <span className="text-[#999]">Total inc GST</span>
                    <span className="text-primary font-extrabold">{fmt(totalIncGst)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Contract card */}
                  <button
                    onClick={() => !contractSent && handleSendContract()}
                    disabled={contractSent || sending}
                    className={"w-full rounded-xl border-2 p-5 text-left transition-all flex items-center gap-4 " +
                      (contractSent
                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                        : "border-border bg-card hover:border-primary disabled:opacity-60")
                    }
                  >
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " +
                      (contractSent ? "bg-green-500/20" : "bg-primary/10")
                    }>
                      {contractSent ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {contractSent ? "Contract Sent ✓" : (sending ? "Sending..." : "Send Contract")}
                      </p>
                      <p className="text-xs text-[#CCCCCC] mt-0.5">
                        {contractSent
                          ? "Sent to " + email
                          : "Email the agreement to " + email}
                      </p>
                    </div>
                  </button>

                  {/* Payment link card */}
                  <button
                    onClick={() => !paymentSent && setStep(4)}
                    disabled={paymentSent}
                    className={"w-full rounded-xl border-2 p-5 text-left transition-all flex items-center gap-4 " +
                      (paymentSent
                        ? "border-green-500/50 bg-green-500/5 cursor-default"
                        : "border-border bg-card hover:border-primary")
                    }
                  >
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " +
                      (paymentSent ? "bg-green-500/20" : "bg-primary/10")
                    }>
                      {paymentSent ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-lg">💳</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">
                        {paymentSent ? "Payment Link Sent ✓" : "Send Payment Link"}
                      </p>
                      <p className="text-xs text-[#CCCCCC] mt-0.5">
                        {paymentSent
                          ? "Sent via " + (paymentMethod === "email" ? "email to " + email : "SMS to " + phone)
                          : "Stripe checkout for " + fmt(totalIncGst) + " inc GST"}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Cross-send prompt: appears after one channel succeeded so they
                    can also send via the other channel using the same Stripe URL. */}
                {paymentSent && paymentMethod && lastStripeUrl && (
                  <div className="mt-4 rounded-xl border border-border bg-input/40 p-4">
                    <p className="text-xs text-[#CCCCCC] mb-2">
                      Also send the payment link via {paymentMethod === "email" ? "SMS" : "email"}?
                    </p>
                    <button
                      onClick={handleCrossSendPayment}
                      disabled={sending}
                      className="w-full text-sm font-bold py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                    >
                      {sending
                        ? "Sending..."
                        : paymentMethod === "email"
                          ? "Also send via SMS to " + phone
                          : "Also send via email to " + email}
                    </button>
                    {crossSendStatus && (
                      <p className={"text-xs mt-2 text-center font-medium " + (crossSendStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                        {crossSendStatus.message}
                      </p>
                    )}
                  </div>
                )}

                {contractStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (contractStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {contractStatus.message}
                  </p>
                )}

                {/* Done button */}
                {(paymentSent && contractSent) && (
                  <button
                    onClick={resetAndClose}
                    className="w-full mt-6 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg transition-opacity hover:opacity-90"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    All Done — Close
                  </button>
                )}
              </div>
            )}

            {/* ─── STEP 4 — PAYMENT SUB-SCREEN ─── */}
            {step === 4 && (
              <div>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1 text-sm text-[#999] hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h3
                  className="text-2xl font-extrabold text-foreground mb-2"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Send Payment Link
                </h3>
                <p className="text-sm text-[#999] mb-6">{fmt(totalIncGst)} inc GST · {summaryPackName}</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRequestInvoice}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group disabled:opacity-60"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      ✉️
                    </p>
                    <p className="text-sm font-bold text-foreground mt-2">Via Email</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Send to {email}</p>
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={sending}
                    className="rounded-xl border-2 border-border bg-card hover:border-primary p-6 text-center transition-all group disabled:opacity-60"
                  >
                    <p className="text-lg font-extrabold text-foreground group-hover:text-primary transition-colors">
                      💬
                    </p>
                    <p className="text-sm font-bold text-foreground mt-2">Via SMS</p>
                    <p className="text-[10px] text-[#CCCCCC] mt-1">Send to {phone}</p>
                  </button>
                </div>

                {smsStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (smsStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {smsStatus.message}
                  </p>
                )}

                {invoiceStatus && (
                  <p className={"text-sm mt-4 text-center font-medium " + (invoiceStatus.type === "success" ? "text-green-400" : "text-red-400")}>
                    {invoiceStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Exit confirmation overlay */}
          <AnimatePresence>
            {showExitConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-2xl"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-xl p-6 mx-6 max-w-sm w-full shadow-xl"
                >
                  <h4
                    className="text-lg font-extrabold text-foreground mb-2"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Are you sure you want to exit?
                  </h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your progress will not be saved and you'll need to start again.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowExitConfirm(false)}
                      className="flex-1 border border-border text-foreground font-bold py-2.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={resetAndClose}
                      className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Exit
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```


## src/styles.css — .pitch-deck-root scoped theme block

```css
/* =====================================================================
   PROTECTED — Pitch deck dark theme scope.
   Restores the ORIGINAL dark design tokens used before the bulk recolor.
   Applies ONLY to descendants of .pitch-deck-root so the rest of the
   portal keeps its light theme. Do NOT remove or override.
   ===================================================================== */
.pitch-deck-root {
  --background: oklch(0.05 0 0);
  --foreground: oklch(1 0 0);
  --card: oklch(0.12 0 0);
  --card-foreground: oklch(1 0 0);
  --popover: oklch(0.12 0 0);
  --popover-foreground: oklch(1 0 0);
  --primary: oklch(0.48 0.22 264);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.12 0 0);
  --secondary-foreground: oklch(1 0 0);
  --muted: oklch(0.12 0 0);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.48 0.22 264);
  --accent-foreground: oklch(1 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.2 0 0);
  --input: oklch(0.15 0 0);
  --ring: oklch(0.48 0.22 264);

  --font-heading: "Inter", "Helvetica Neue", "Arial", sans-serif;
  --font-body: "Inter", "Helvetica Neue", "Arial", sans-serif;

  background-color: oklch(0.05 0 0);
  color: oklch(1 0 0);
  font-family: var(--font-body);
  width: 100%;
  height: 100%;
}

/* Re-enable shadows inside the deck (the global rule kills them) */
.pitch-deck-root .shadow,
.pitch-deck-root .shadow-sm,
.pitch-deck-root .shadow-md,
.pitch-deck-root .shadow-lg,
.pitch-deck-root .shadow-xl,
.pitch-deck-root .shadow-2xl,
.pitch-deck-root [class*="shadow-["] {
  box-shadow: revert !important;
}

/* Inputs inside the deck use the dark theme, not the global light input style */
.pitch-deck-root input,
.pitch-deck-root textarea,
.pitch-deck-root select {
  background-color: oklch(0.15 0 0);
  color: oklch(1 0 0);
  border: 1px solid oklch(0.2 0 0);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
.pitch-deck-root input::placeholder,
.pitch-deck-root textarea::placeholder {
  color: oklch(0.55 0 0);
}
.pitch-deck-root input:focus,
.pitch-deck-root textarea:focus,
.pitch-deck-root select:focus {
  outline: none;
  border-color: oklch(0.48 0.22 264);
}

/* Reset hairline border-width override from global @layer base * { border-width: 0 } */
.pitch-deck-root * {
  border-color: var(--border);
}

/* Global: ensure all clickable elements show the pointer cursor on hover */
button:not(:disabled),
[role="button"]:not([aria-disabled="true"]),
a[href],
summary,
label[for],
select:not(:disabled),
input[type="button"]:not(:disabled),
input[type="submit"]:not(:disabled),
input[type="reset"]:not(:disabled),
input[type="checkbox"]:not(:disabled),
input[type="radio"]:not(:disabled),
input[type="file"]:not(:disabled) {
  cursor: pointer;
}
button:disabled,
[role="button"][aria-disabled="true"] {
  cursor: not-allowed;
}

.clinic-consult-textarea::placeholder {
  color: #9aa5b1 !important;
  opacity: 1;
}

/* =====================================================================
   Subtle entrance animations for panels, modals, and empty states.
   Scoped OUTSIDE .pitch-deck-root. Respects prefers-reduced-motion.
   ===================================================================== */
@keyframes app-rise-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.app-rise-in,
body :not(.pitch-deck-root):not(.pitch-deck-root *) > [role="dialog"],
body :not(.pitch-deck-root):not(.pitch-deck-root *) > [data-state="open"][data-radix-popper-content-wrapper],
[data-empty-state]:not(.pitch-deck-root [data-empty-state]) {
  animation: app-rise-in 180ms ease-out both;
}

/* Radix Dialog / Sheet / Popover / DropdownMenu content — exclude deck */
[role="dialog"][data-state="open"]:not(.pitch-deck-root [role="dialog"]),
[data-radix-popper-content-wrapper]:not(.pitch-deck-root [data-radix-popper-content-wrapper]) > * {
  animation: app-rise-in 180ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .app-rise-in,
  [role="dialog"][data-state="open"],
  [data-radix-popper-content-wrapper] > *,
  [data-empty-state] {
    animation: none !important;
  }
}
```
